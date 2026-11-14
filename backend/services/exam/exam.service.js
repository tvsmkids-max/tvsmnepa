"use strict";

const mongoose = require("mongoose");
const Exam = require("../../models/exam/Exam.model");
const ExamClassConfig = require("../../models/exam/ExamClassConfig.model");
const ExamAuditLog = require("../../models/exam/ExamAuditLog.model");
const ExamTimetableEntry = require("../../models/exam/ExamTimetableEntry.model");
const examTimetable = require("./examTimetable.service");
const AcademicSession = require("../../models/AcademicSession.model");
const Class = require("../../models/Class.model");
const {
  EXAM_STATUS,
  EXAM_STATUS_LABELS,
  EXAM_TRANSITIONS,
  MANUAL_STATUSES_PHASE1,
  CONFIG_EDITABLE_STATUSES,
} = require("../../constants/examStatus");
const { logExamAudit } = require("./examAudit.service");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const assertId = (id, label = "ID") => {
  if (!mongoose.isValidObjectId(id)) throwError(`Invalid ${label}`, 400);
};

const label = (s) => EXAM_STATUS_LABELS[s] || s;

class ExamService {
  async _getExam(id) {
    assertId(id, "examination ID");
    const exam = await Exam.findById(id);
    if (!exam) throwError("Examination not found", 404);
    return exam;
  }

  async list(query) {
    const { page, limit, ...filter } = query;
    const q = {};
    if (filter.session) q.session = filter.session;
    if (filter.examType) q.examType = filter.examType;
    if (filter.status) q.status = filter.status;

    const [data, total] = await Promise.all([
      Exam.find(q)
        .populate("session", "name isActive")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Exam.countDocuments(q),
    ]);

    const ids = data.map((e) => e._id);
    const counts = ids.length
      ? await ExamClassConfig.aggregate([
          { $match: { exam: { $in: ids } } },
          { $group: { _id: "$exam", classes: { $sum: 1 } } },
        ])
      : [];
    const countMap = new Map(counts.map((c) => [String(c._id), c.classes]));
    data.forEach((e) => {
      e.configuredClasses = countMap.get(String(e._id)) || 0;
    });

    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getById(id) {
    const exam = await this._getExam(id);
    await exam.populate("session", "name startDate endDate isActive");
    const configs = await ExamClassConfig.find({ exam: exam._id })
      .populate("class", "name section displayOrder isArchived")
      .lean();
    return { ...exam.toObject(), classConfigs: configs };
  }

  async create(body, user, req) {
    const session = await AcademicSession.findById(body.session).lean();
    if (!session) throwError("Academic session not found", 404);

    const exam = new Exam({
      ...body,
      status: EXAM_STATUS.DRAFT,
      statusHistory: [
        {
          from: null,
          to: EXAM_STATUS.DRAFT,
          by: user._id,
          byName: user.name,
          reason: "Created",
        },
      ],
      createdBy: user._id,
      updatedBy: user._id,
    });
    try {
      await exam.save();
    } catch (err) {
      if (err.code === 11000) {
        throwError(
          "An examination with this name already exists in this session",
          409,
        );
      }
      throw err;
    }

    await logExamAudit({
      exam: exam._id,
      action: "EXAM_CREATED",
      user,
      req,
      after: exam.toObject(),
    });
    return exam;
  }

  async update(id, body, user, req) {
    const exam = await this._getExam(id);
    if (
      ![
        EXAM_STATUS.DRAFT,
        EXAM_STATUS.CONFIGURATION_PENDING,
        EXAM_STATUS.SCHEDULED,
      ].includes(exam.status)
    ) {
      throwError(
        `Examination details cannot be edited while status is ${label(exam.status)}`,
        409,
      );
    }
    if (
      body.examType &&
      body.examType !== exam.examType &&
      exam.status === EXAM_STATUS.SCHEDULED
    ) {
      throwError(
        "Examination type cannot be changed once the exam is scheduled",
        409,
      );
    }

    const before = exam.toObject();
    Object.assign(exam, body, { updatedBy: user._id });
    try {
      await exam.save();
    } catch (err) {
      if (err.code === 11000) {
        throwError(
          "An examination with this name already exists in this session",
          409,
        );
      }
      throw err;
    }

    await logExamAudit({
      exam: exam._id,
      action: "EXAM_UPDATED",
      user,
      req,
      before,
      after: exam.toObject(),
    });
    return exam;
  }

  async changeStatus(id, { status: to, reason = "" }, user, req) {
    const exam = await this._getExam(id);
    const from = exam.status;

    if (!(EXAM_TRANSITIONS[from] || []).includes(to)) {
      throwError(
        `Invalid status change: ${label(from)} → ${label(to)}`,
        409,
      );
    }
    if (!MANUAL_STATUSES_PHASE1.includes(to)) {
      throwError(
        `${label(to)} is set automatically by the marks-entry and results workflow and cannot be set manually`,
        409,
      );
    }
    // Moving backwards needs an explanation for the audit trail.
    const isBackward =
      Object.keys(EXAM_TRANSITIONS).indexOf(to) <
      Object.keys(EXAM_TRANSITIONS).indexOf(from);
    if (isBackward && !reason.trim()) {
      throwError("A reason is required to move an examination back", 400);
    }

    if (to === EXAM_STATUS.SCHEDULED) {
      if (!exam.startDate || !exam.endDate) {
        throwError(
          "Set the examination start and end dates before scheduling",
          409,
        );
      }
      const configured = await ExamClassConfig.countDocuments({
        exam: exam._id,
      });
      if (configured === 0) {
        throwError(
          "Configure at least one class with subjects before scheduling",
          409,
        );
      }
      const incomplete = await examTimetable.incompleteClasses(exam._id);
      if (incomplete.length > 0) {
        throwError(
          `Complete the timetable before scheduling. Missing: ${incomplete
            .map((c) => `${c.label} (${c.have} of ${c.need} subjects)`)
            .join(", ")}`,
          409,
        );
      }
    }

    // Atomic compare-and-set: only applies if the status is still `from`.
    const updated = await Exam.findOneAndUpdate(
      { _id: exam._id, status: from },
      {
        $set: { status: to, updatedBy: user._id },
        $push: {
          statusHistory: {
            from,
            to,
            by: user._id,
            byName: user.name,
            reason,
            at: new Date(),
          },
        },
      },
      { new: true },
    );
    if (!updated) {
      throwError(
        "The examination status was changed by someone else. Refresh and try again.",
        409,
      );
    }

    await logExamAudit({
      exam: exam._id,
      action: "EXAM_STATUS_CHANGED",
      user,
      req,
      reason,
      before: { status: from },
      after: { status: to },
    });
    return updated;
  }

  async remove(id, user, req) {
    const exam = await this._getExam(id);
    if (exam.status !== EXAM_STATUS.DRAFT) {
      throwError("Only a Draft examination can be deleted", 409);
    }
    const snapshot = exam.toObject();
    const configs = await ExamClassConfig.find({ exam: exam._id }).lean();

    const res = await Exam.deleteOne({ _id: exam._id, status: EXAM_STATUS.DRAFT });
    if (res.deletedCount !== 1) {
      throwError("The examination changed state; deletion cancelled", 409);
    }
    await ExamClassConfig.deleteMany({ exam: exam._id });
    await ExamTimetableEntry.deleteMany({ exam: exam._id });

    await logExamAudit({
      exam: exam._id,
      action: "EXAM_DELETED",
      user,
      req,
      before: { exam: snapshot, classConfigs: configs },
    });
  }

  async listClassConfigs(id) {
    const exam = await this._getExam(id);
    return ExamClassConfig.find({ exam: exam._id })
      .populate("class", "name section displayOrder isArchived")
      .lean();
  }

  async upsertClassConfigs(id, { classIds, subjects }, user, req) {
    const exam = await this._getExam(id);
    if (!CONFIG_EDITABLE_STATUSES.includes(exam.status)) {
      throwError(
        `Class and subject configuration is locked while status is ${label(exam.status)}`,
        409,
      );
    }

    // Subject-level validation (clear messages before touching the database)
    const seen = new Set();
    const cleanSubjects = subjects.map((s, i) => {
      const nameKey = s.name.trim().toLowerCase();
      if (seen.has(nameKey)) {
        throwError(`Duplicate subject name: ${s.name.trim()}`, 400);
      }
      seen.add(nameKey);
      if (s.passingMarks > s.maxMarks) {
        throwError(
          `Passing marks (${s.passingMarks}) cannot exceed maximum marks (${s.maxMarks}) for ${s.name.trim()}`,
          400,
        );
      }
      return {
        name: s.name.trim(),
        nameKey,
        maxMarks: s.maxMarks,
        passingMarks: s.passingMarks,
        displayOrder: i,
      };
    });

    const classes = await Class.find({ _id: { $in: classIds } }).lean();
    if (classes.length !== classIds.length) {
      throwError("One or more classes were not found", 404);
    }
    for (const c of classes) {
      if (String(c.session) !== String(exam.session)) {
        throwError(
          `Class ${c.name} - ${c.section} does not belong to this examination's session`,
          400,
        );
      }
      if (c.isArchived) {
        throwError(`Class ${c.name} - ${c.section} is archived`, 400);
      }
    }

    // A subject that already has a timetable entry cannot be dropped or renamed
    // here; the admin must remove its timetable entry first.
    const keepKeys = cleanSubjects.map((x) => x.nameKey);
    const orphaned = await ExamTimetableEntry.find({
      exam: exam._id,
      class: { $in: classIds },
      subjectKey: { $nin: keepKeys },
    }).lean();
    if (orphaned.length > 0) {
      throwError(
        `Cannot remove or rename subjects that are already on the timetable: ${[
          ...new Set(orphaned.map((o) => o.subjectName)),
        ].join(", ")}. Remove them from the timetable first.`,
        409,
      );
    }

    const results = [];
    for (const c of classes) {
      const existing = await ExamClassConfig.findOne({
        exam: exam._id,
        class: c._id,
      }).lean();
      const doc = await ExamClassConfig.findOneAndUpdate(
        { exam: exam._id, class: c._id },
        {
          $set: {
            subjects: cleanSubjects,
            session: exam.session,
            updatedBy: user._id,
          },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );
      results.push(doc);
      await logExamAudit({
        exam: exam._id,
        classId: c._id,
        action: existing ? "EXAM_CLASS_CONFIG_UPDATED" : "EXAM_CLASS_CONFIG_CREATED",
        user,
        req,
        before: existing ? { subjects: existing.subjects } : null,
        after: { subjects: doc.subjects },
      });
    }
    return results;
  }

  async removeClassConfig(id, classId, user, req) {
    const exam = await this._getExam(id);
    assertId(classId, "class ID");
    if (!CONFIG_EDITABLE_STATUSES.includes(exam.status)) {
      throwError(
        `Class and subject configuration is locked while status is ${label(exam.status)}`,
        409,
      );
    }
    const hasTimetable = await ExamTimetableEntry.exists({
      exam: exam._id,
      class: classId,
    });
    if (hasTimetable) {
      throwError(
        "This class has timetable entries. Clear its timetable before removing it from the examination.",
        409,
      );
    }
    const existing = await ExamClassConfig.findOneAndDelete({
      exam: exam._id,
      class: classId,
    }).lean();
    if (!existing) throwError("Class is not configured for this examination", 404);

    await logExamAudit({
      exam: exam._id,
      classId,
      action: "EXAM_CLASS_CONFIG_REMOVED",
      user,
      req,
      before: { subjects: existing.subjects },
    });
  }

  async listAudit(id, { page, limit }) {
    const exam = await this._getExam(id);
    const [data, total] = await Promise.all([
      ExamAuditLog.find({ exam: exam._id })
        .populate("class", "name section")
        .sort({ at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ExamAuditLog.countDocuments({ exam: exam._id }),
    ]);
    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

module.exports = new ExamService();
