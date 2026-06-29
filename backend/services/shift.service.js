"use strict";

const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const Settings = require("../models/Settings.model");
const { createAuditLog } = require("../middlewares/audit.middleware");
const logger = require("../utils/logger");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class ShiftService {
  /**
   * Preview shift — shows what will happen
   */
  async preview({ sourceClassId, targetClassId, studentIds, user }) {
    if (!sourceClassId) throwError("Source class is required", 400);
    if (!targetClassId) throwError("Target class is required", 400);
    if (sourceClassId === targetClassId) {
      throwError("Source and target class cannot be the same", 400);
    }

    // Validate classes
    const sourceClass = await Class.findById(sourceClassId).lean();
    if (!sourceClass) throwError("Source class not found", 404);

    const targetClass = await Class.findById(targetClassId).lean();
    if (!targetClass) throwError("Target class not found", 404);

    if (targetClass.isArchived) {
      throwError("Cannot shift to archived class", 400);
    }

    // Get students from source class
    let studentFilter = {
      class: sourceClassId,
      status: "Active",
      isActive: true,
    };

    // If specific students provided, filter by them
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      studentFilter._id = { $in: studentIds };
    }

    const students = await Student.find(studentFilter)
      .sort("rollNumber")
      .lean();

    if (students.length === 0) {
      throwError("No eligible students found in source class", 400);
    }

    // Get existing roll numbers in target class
    const targetStudents = await Student.find({
      class: targetClassId,
      isActive: true,
    })
      .select("rollNumber scholarNumber")
      .lean();

    const existingRolls = targetStudents
      .map((s) => parseInt(s.rollNumber, 10))
      .filter((n) => !isNaN(n));
    const maxRoll = existingRolls.length > 0 ? Math.max(...existingRolls) : 0;

    // Check for scholar conflicts in target class
    const targetScholars = new Set(
      targetStudents.map((s) => s.scholarNumber.toUpperCase()),
    );

    // Build preview
    let nextRoll = maxRoll;
    const shiftable = [];
    const conflicts = [];

    students.forEach((s) => {
      if (targetScholars.has(s.scholarNumber.toUpperCase())) {
        conflicts.push({
          _id: s._id,
          scholarNumber: s.scholarNumber,
          name: s.name,
          rollNumber: s.rollNumber,
          reason: "Scholar number already exists in target class",
        });
      } else {
        nextRoll++;
        shiftable.push({
          _id: s._id,
          scholarNumber: s.scholarNumber,
          name: s.name,
          fatherName: s.fatherName,
          currentRoll: s.rollNumber,
          newRoll: String(nextRoll),
          gender: s.gender,
        });
      }
    });

    return {
      source: {
        _id: sourceClass._id,
        name: sourceClass.name,
        section: sourceClass.section,
        label: `${sourceClass.name}-${sourceClass.section}`,
        totalStudents: students.length,
      },
      target: {
        _id: targetClass._id,
        name: targetClass.name,
        section: targetClass.section,
        label: `${targetClass.name}-${targetClass.section}`,
        existingStudents: targetStudents.length,
        afterShift: targetStudents.length + shiftable.length,
      },
      shiftable,
      conflicts,
      summary: {
        totalStudents: students.length,
        canShift: shiftable.length,
        conflicts: conflicts.length,
      },
    };
  }

  /**
   * Execute the shift — actually moves students
   */
  async execute({ sourceClassId, targetClassId, studentIds, user, req }) {
    if (!sourceClassId) throwError("Source class is required", 400);
    if (!targetClassId) throwError("Target class is required", 400);
    if (sourceClassId === targetClassId) {
      throwError("Source and target class cannot be the same", 400);
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throwError("Select at least one student to shift", 400);
    }

    // Validate target class
    const targetClass = await Class.findById(targetClassId).lean();
    if (!targetClass) throwError("Target class not found", 404);
    if (targetClass.isArchived) {
      throwError("Cannot shift to archived class", 400);
    }

    const sourceClass = await Class.findById(sourceClassId).lean();
    if (!sourceClass) throwError("Source class not found", 404);

    // Get students to shift
    const students = await Student.find({
      _id: { $in: studentIds },
      class: sourceClassId,
      status: "Active",
      isActive: true,
    }).lean();

    if (students.length === 0) {
      throwError(
        "No valid students found. They may have been moved or deleted.",
        400,
      );
    }

    // Check for scholar conflicts in target
    const targetScholars = await Student.find({
      class: targetClassId,
      scholarNumber: { $in: students.map((s) => s.scholarNumber) },
    })
      .select("scholarNumber")
      .lean();

    const conflictScholars = new Set(
      targetScholars.map((s) => s.scholarNumber.toUpperCase()),
    );

    const toShift = students.filter(
      (s) => !conflictScholars.has(s.scholarNumber.toUpperCase()),
    );

    if (toShift.length === 0) {
      throwError("All selected students already exist in target class", 400);
    }

    // Get next roll number
    const existingTarget = await Student.find({
      class: targetClassId,
      isActive: true,
    })
      .select("rollNumber")
      .lean();

    const existingRolls = existingTarget
      .map((s) => parseInt(s.rollNumber, 10))
      .filter((n) => !isNaN(n));
    let nextRoll = existingRolls.length > 0 ? Math.max(...existingRolls) : 0;

    // Shift each student (update class + section + rollNumber)
    let shifted = 0;
    let failed = 0;
    const shiftedDetails = [];

    for (const student of toShift) {
      try {
        nextRoll++;
        const newRoll = String(nextRoll);

        await Student.findByIdAndUpdate(student._id, {
          class: targetClassId,
          section: targetClass.section,
          rollNumber: newRoll,
        });

        shifted++;
        shiftedDetails.push({
          scholarNumber: student.scholarNumber,
          name: student.name,
          oldRoll: student.rollNumber,
          newRoll,
        });
      } catch (err) {
        failed++;
        logger.error(
          `[Shift] Failed to shift ${student.scholarNumber}: ${err.message}`,
        );
      }
    }

    // Audit log
    const sampleNames = shiftedDetails
      .slice(0, 5)
      .map((s) => `${s.name} (${s.scholarNumber})`)
      .join(", ");
    const moreText =
      shiftedDetails.length > 5 ? ` and ${shiftedDetails.length - 5} more` : "";

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Student",
      description:
        `Shifted ${shifted} students from ${sourceClass.name}-${sourceClass.section} ` +
        `to ${targetClass.name}-${targetClass.section}: ${sampleNames}${moreText}`,
      resourceType: "Student",
      before: {
        sourceClass: `${sourceClass.name}-${sourceClass.section}`,
      },
      after: {
        targetClass: `${targetClass.name}-${targetClass.section}`,
        shifted,
        failed,
      },
      req,
    });

    // Notification for admin
    try {
      const notificationService = require("./notification.service");
      await notificationService.notifyAdmins({
        title: `🔄 ${shifted} Students Shifted`,
        message: `Moved from ${sourceClass.name}-${sourceClass.section} to ${targetClass.name}-${targetClass.section}`,
        type: "info",
        link: "/students",
        metadata: {
          shifted,
          failed,
          sourceClass: `${sourceClass.name}-${sourceClass.section}`,
          targetClass: `${targetClass.name}-${targetClass.section}`,
          actor: user.name || user.email,
        },
        createdBy: user._id,
      });
    } catch {
      // Silent fail
    }

    return {
      shifted,
      failed,
      conflicts: students.length - toShift.length,
      total: students.length,
      sourceClass: `${sourceClass.name}-${sourceClass.section}`,
      targetClass: `${targetClass.name}-${targetClass.section}`,
      shiftedDetails,
    };
  }
}

module.exports = new ShiftService();
