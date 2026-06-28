"use strict";

const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const AcademicSession = require("../models/AcademicSession.model");
const { createAuditLog } = require("../middlewares/audit.middleware");
const notificationService = require("./notification.service");
const logger = require("../utils/logger");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class PromotionService {
  /**
   * Preview promotion — shows what will happen
   */
  async preview({
    sourceClassId,
    sourceSessionId,
    targetClassId,
    targetSessionId,
  }) {
    const sourceClass = await Class.findById(sourceClassId).lean();
    if (!sourceClass) throwError("Source class not found", 404);

    const sourceSession =
      await AcademicSession.findById(sourceSessionId).lean();
    if (!sourceSession) throwError("Source session not found", 404);

    const targetClass = await Class.findById(targetClassId).lean();
    if (!targetClass) throwError("Target class not found", 404);

    const targetSession =
      await AcademicSession.findById(targetSessionId).lean();
    if (!targetSession) throwError("Target session not found", 404);

    if (sourceSessionId === targetSessionId) {
      throwError("Source and target session must be different", 400);
    }

    const students = await Student.find({
      class: sourceClassId,
      session: sourceSessionId,
      status: "Active",
      isActive: true,
    })
      .sort("rollNumber")
      .lean();

    if (students.length === 0) {
      throwError("No eligible students found in source class", 400);
    }

    const scholarNumbers = students.map((s) => s.scholarNumber);
    const alreadyPromoted = await Student.find({
      scholarNumber: { $in: scholarNumbers },
      session: targetSessionId,
    })
      .select("scholarNumber")
      .lean();

    const promotedSet = new Set(alreadyPromoted.map((s) => s.scholarNumber));

    const existingInTarget = await Student.find({
      class: targetClassId,
      session: targetSessionId,
    })
      .select("rollNumber")
      .lean();

    const existingRolls = existingInTarget
      .map((s) => parseInt(s.rollNumber, 10))
      .filter((n) => !isNaN(n));
    const maxRoll = existingRolls.length > 0 ? Math.max(...existingRolls) : 0;

    let nextRoll = maxRoll;
    const eligible = [];
    const alreadyDone = [];

    students.forEach((s) => {
      if (promotedSet.has(s.scholarNumber)) {
        alreadyDone.push({
          _id: s._id,
          scholarNumber: s.scholarNumber,
          name: s.name,
          rollNumber: s.rollNumber,
          reason: "Already exists in target session",
        });
      } else {
        nextRoll++;
        eligible.push({
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
        class: sourceClass,
        session: sourceSession,
        totalStudents: students.length,
      },
      target: {
        class: targetClass,
        session: targetSession,
        existingStudents: existingInTarget.length,
      },
      eligible,
      alreadyPromoted: alreadyDone,
      summary: {
        total: students.length,
        canPromote: eligible.length,
        alreadyDone: alreadyDone.length,
      },
    };
  }

  /**
   * Execute promotion — creates new student records
   */
  async execute({
    sourceClassId,
    sourceSessionId,
    targetClassId,
    targetSessionId,
    studentIds,
    user,
    req,
  }) {
    const targetClass = await Class.findById(targetClassId).lean();
    if (!targetClass) throwError("Target class not found", 404);

    const targetSession =
      await AcademicSession.findById(targetSessionId).lean();
    if (!targetSession) throwError("Target session not found", 404);

    if (sourceSessionId === targetSessionId) {
      throwError("Source and target session must be different", 400);
    }

    const students = await Student.find({
      _id: { $in: studentIds },
      class: sourceClassId,
      session: sourceSessionId,
      status: "Active",
      isActive: true,
    }).lean();

    if (students.length === 0) {
      throwError("No valid students selected", 400);
    }

    const scholarNumbers = students.map((s) => s.scholarNumber);
    const alreadyPromoted = await Student.find({
      scholarNumber: { $in: scholarNumbers },
      session: targetSessionId,
    })
      .select("scholarNumber")
      .lean();

    const promotedSet = new Set(alreadyPromoted.map((s) => s.scholarNumber));

    const toPromote = students.filter((s) => !promotedSet.has(s.scholarNumber));

    if (toPromote.length === 0) {
      throwError("All selected students are already promoted", 400);
    }

    const existingInTarget = await Student.find({
      class: targetClassId,
      session: targetSessionId,
    })
      .select("rollNumber")
      .lean();

    const existingRolls = existingInTarget
      .map((s) => parseInt(s.rollNumber, 10))
      .filter((n) => !isNaN(n));
    let nextRoll = existingRolls.length > 0 ? Math.max(...existingRolls) : 0;

    const newStudents = toPromote.map((s) => {
      nextRoll++;
      return {
        scholarNumber: s.scholarNumber,
        rollNumber: String(nextRoll),
        name: s.name,
        fatherName: s.fatherName,
        motherName: s.motherName,
        mobile: s.mobile,
        alternateMobile: s.alternateMobile || "",
        dob: s.dob,
        gender: s.gender,
        address: s.address,
        photo: s.photo,
        class: targetClassId,
        section: targetClass.section,
        session: targetSessionId,
        admissionDate: s.admissionDate,
        status: "Active",
        bloodGroup: s.bloodGroup || "",
        category: s.category || "",
        religion: s.religion || "",
        aadharNumber: s.aadharNumber || "",
        isActive: true,
        createdBy: user._id,
      };
    });

    let promoted = 0;
    let failed = 0;

    try {
      const result = await Student.insertMany(newStudents, { ordered: false });
      promoted = result.length;
    } catch (err) {
      if (err.insertedDocs) {
        promoted = err.insertedDocs.length;
        failed = newStudents.length - promoted;
      }
      logger.error(`[Promotion] Some inserts failed: ${err.message}`);
    }

    const sourceClass = await Class.findById(sourceClassId).lean();

    await createAuditLog({
      user,
      action: "PROMOTE",
      module: "Student",
      description: `Promoted ${promoted} students from ${sourceClass?.name}-${sourceClass?.section} to ${targetClass.name}-${targetClass.section}`,
      req,
    });

    // ─── NOTIFICATION: Notify admins about promotion success ───
    try {
      const fromLabel = `${sourceClass?.name}-${sourceClass?.section}`;
      const toLabel = `${targetClass.name}-${targetClass.section}`;

      let title = `🎓 Students Promoted Successfully`;
      let type = "success";

      if (failed > 0) {
        title = `⚠️ Promotion Completed with Errors`;
        type = "warning";
      }

      let message = `${promoted} student${promoted !== 1 ? "s" : ""} promoted from ${fromLabel} to ${toLabel}.`;
      if (failed > 0) {
        message += ` ${failed} failed.`;
      }
      if (alreadyPromoted.length > 0) {
        message += ` ${alreadyPromoted.length} already promoted (skipped).`;
      }

      await notificationService.notifyAdmins({
        title,
        message,
        type,
        link: "/students",
        metadata: {
          promoted,
          failed,
          skipped: alreadyPromoted.length,
          total: students.length,
          fromClass: fromLabel,
          toClass: toLabel,
          targetSession: targetSession.name,
        },
        createdBy: user._id,
      });
    } catch (err) {
      logger.error(`[Promotion] Notification failed: ${err.message}`);
    }

    return {
      promoted,
      failed,
      skipped: alreadyPromoted.length,
      total: students.length,
    };
  }
}

module.exports = new PromotionService();
