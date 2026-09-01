"use strict";

const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const { createAuditLog } = require("../middlewares/audit.middleware");
const logger = require("../utils/logger");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class ShiftService {
  /**
   * Preview shift — optional for bulk tools; safe for single-student too
   * No rollNumber. No same-grade restriction (class + section shift allowed).
   */
  async preview({ sourceClassId, targetClassId, studentIds, user }) {
    if (!sourceClassId) throwError("Source class is required", 400);
    if (!targetClassId) throwError("Target class is required", 400);
    if (sourceClassId.toString() === targetClassId.toString()) {
      throwError("Source and target class cannot be the same", 400);
    }

    const sourceClass = await Class.findById(sourceClassId).lean();
    if (!sourceClass) throwError("Source class not found", 404);

    const targetClass = await Class.findById(targetClassId).lean();
    if (!targetClass) throwError("Target class not found", 404);

    if (targetClass.isArchived) {
      throwError("Cannot shift to an archived class", 400);
    }

    const studentFilter = {
      class: sourceClassId,
      status: "Active",
      isActive: true,
    };

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      studentFilter._id = { $in: studentIds };
    }

    const students = await Student.find(studentFilter).sort("name").lean();

    if (students.length === 0) {
      throwError("No eligible students found in source class", 400);
    }

    const targetStudents = await Student.find({
      class: targetClassId,
      isActive: true,
    })
      .select("scholarNumber")
      .lean();

    const targetScholars = new Set(
      targetStudents.map((s) => (s.scholarNumber || "").toUpperCase()),
    );

    const shiftable = [];
    const conflicts = [];

    students.forEach((s) => {
      const sn = (s.scholarNumber || "").toUpperCase();
      if (sn && targetScholars.has(sn)) {
        conflicts.push({
          _id: s._id,
          scholarNumber: s.scholarNumber,
          name: s.name,
          reason: "Scholar number already exists in target class",
        });
      } else {
        shiftable.push({
          _id: s._id,
          scholarNumber: s.scholarNumber,
          name: s.name,
          fatherName: s.fatherName,
          gender: s.gender,
          from: `${sourceClass.name}-${sourceClass.section}`,
          to: `${targetClass.name}-${targetClass.section}`,
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
   * Execute shift (supports 1+ students). Used by new row-level UI.
   */
  async execute({ sourceClassId, targetClassId, studentIds, user, req }) {
    if (!sourceClassId) throwError("Source class is required", 400);
    if (!targetClassId) throwError("Target class is required", 400);
    if (sourceClassId.toString() === targetClassId.toString()) {
      throwError("Source and target class cannot be the same", 400);
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throwError("Select at least one student to shift", 400);
    }

    const targetClass = await Class.findById(targetClassId).lean();
    if (!targetClass) throwError("Target class not found", 404);
    if (targetClass.isArchived) {
      throwError("Cannot shift to an archived class", 400);
    }

    const sourceClass = await Class.findById(sourceClassId).lean();
    if (!sourceClass) throwError("Source class not found", 404);

    const students = await Student.find({
      _id: { $in: studentIds },
      class: sourceClassId,
      status: "Active",
      isActive: true,
    })
      .sort("name")
      .lean();

    if (students.length === 0) {
      throwError(
        "No valid students found. They may have been moved or deleted.",
        400,
      );
    }

    const targetScholars = await Student.find({
      class: targetClassId,
      scholarNumber: {
        $in: students.map((s) => s.scholarNumber).filter(Boolean),
      },
    })
      .select("scholarNumber")
      .lean();

    const conflictScholars = new Set(
      targetScholars.map((s) => (s.scholarNumber || "").toUpperCase()),
    );

    const toShift = students.filter(
      (s) => !conflictScholars.has((s.scholarNumber || "").toUpperCase()),
    );

    if (toShift.length === 0) {
      throwError(
        "All selected students already exist in the target class (scholar number conflict).",
        400,
      );
    }

    let shifted = 0;
    let failed = 0;
    const shiftedDetails = [];

    for (const student of toShift) {
      try {
        await Student.findByIdAndUpdate(student._id, {
          $set: {
            class: targetClassId,
            section: targetClass.section || "",
          },
          // Explicitly do not touch rollNumber
          $unset: { rollNumber: "" },
        });

        shifted++;
        shiftedDetails.push({
          scholarNumber: student.scholarNumber,
          name: student.name,
          from: `${sourceClass.name}-${sourceClass.section}`,
          to: `${targetClass.name}-${targetClass.section}`,
        });
      } catch (err) {
        failed++;
        logger.error(
          `[Shift] Failed to shift ${student.scholarNumber}: ${err.message}`,
        );
      }
    }

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
        `Shifted ${shifted} student(s) from ${sourceClass.name}-${sourceClass.section} ` +
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
