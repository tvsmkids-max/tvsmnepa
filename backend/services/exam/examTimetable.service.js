"use strict";

const mongoose = require("mongoose");
const Exam = require("../../models/exam/Exam.model");
const ExamClassConfig = require("../../models/exam/ExamClassConfig.model");
const ExamTimetableEntry = require("../../models/exam/ExamTimetableEntry.model");
const {
  EXAM_STATUS,
  EXAM_STATUS_LABELS,
} = require("../../constants/examStatus");
const { logExamAudit } = require("./examAudit.service");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

// Corrections stay possible until marks are submitted.
const TIMETABLE_EDITABLE = Object.freeze([
  EXAM_STATUS.DRAFT,
  EXAM_STATUS.CONFIGURATION_PENDING,
  EXAM_STATUS.SCHEDULED,
  EXAM_STATUS.ONGOING,
  EXAM_STATUS.COMPLETED,
  EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS,
]);

const isRealDate = (s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const dayKey = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

const sortEntries = (list) =>
  [...list].sort((a, b) =>
    `${a.date} ${a.subjectName}`.localeCompare(`${b.date} ${b.subjectName}`),
  );

class ExamTimetableService {
  async _exam(id) {
    if (!mongoose.isValidObjectId(id)) throwError("Invalid examination ID", 400);
    const exam = await Exam.findById(id);
    if (!exam) throwError("Examination not found", 404);
    return exam;
  }

  async list(examId, classId = null) {
    const exam = await this._exam(examId);
    const q = { exam: exam._id };
    if (classId) {
      if (!mongoose.isValidObjectId(classId)) throwError("Invalid class ID", 400);
      q.class = classId;
    }
    const entries = await ExamTimetableEntry.find(q)
      .populate("class", "name section displayOrder")
      .lean();
    return sortEntries(entries);
  }

  // Entries for one class (used by the class-teacher view; caller has already
  // verified access).
  async forClass(examId, classId) {
    const entries = await ExamTimetableEntry.find({
      exam: examId,
      class: classId,
    }).lean();
    return sortEntries(entries);
  }

  async saveClass(examId, classId, entries, user, req) {
    const exam = await this._exam(examId);
    if (!mongoose.isValidObjectId(classId)) throwError("Invalid class ID", 400);
    if (!TIMETABLE_EDITABLE.includes(exam.status)) {
      throwError(
        `The timetable is locked while status is ${EXAM_STATUS_LABELS[exam.status]}`,
        409,
      );
    }
    const config = await ExamClassConfig.findOne({
      exam: exam._id,
      class: classId,
    }).lean();
    if (!config) throwError("Class is not configured for this examination", 404);

    const byKey = new Map(config.subjects.map((s) => [s.nameKey, s]));
    const seen = new Set();
    const rows = entries.map((e) => {
      const key = e.subjectName.trim().toLowerCase();
      const subject = byKey.get(key);
      if (!subject) {
        throwError(`${e.subjectName.trim()} is not a configured subject of this class`, 400);
      }
      if (seen.has(key)) {
        throwError(`Duplicate timetable entry for ${subject.name}`, 400);
      }
      seen.add(key);
      if (!isRealDate(e.date)) throwError(`${subject.name}: invalid date ${e.date}`, 400);
      return {
        subjectKey: key,
        subjectName: subject.name,
        date: e.date,
        remarks: e.remarks || "",
      };
    });

    // Soft conflicts → warnings (saved anyway; admin can correct).
    const warnings = [];
    const dates = [...new Set(rows.map((r) => r.date))];
    if (dates.length) {
      const others = await ExamTimetableEntry.find({
        class: classId,
        exam: { $ne: exam._id },
        date: { $in: dates },
      })
        .populate("exam", "name")
        .lean();
      for (const r of rows) {
        for (const o of others) {
          if (o.date === r.date) {
            warnings.push(
              `${r.subjectName} on ${r.date} falls on the same day as ${o.subjectName} of "${o.exam?.name || "another examination"}"`,
            );
          }
        }
      }
    }
    const start = dayKey(exam.startDate);
    const end = dayKey(exam.endDate);
    for (const r of rows) {
      if ((start && r.date < start) || (end && r.date > end)) {
        warnings.push(
          `${r.subjectName} on ${r.date} is outside the examination dates (${start || "?"} to ${end || "?"})`,
        );
      }
    }

    const before = await ExamTimetableEntry.find({ exam: exam._id, class: classId }).lean();

    const ops = [
      {
        deleteMany: {
          filter: {
            exam: exam._id,
            class: classId,
            subjectKey: { $nin: rows.map((r) => r.subjectKey) },
          },
        },
      },
      ...rows.map((r) => ({
        updateOne: {
          filter: { exam: exam._id, class: classId, subjectKey: r.subjectKey },
          update: {
            $set: { ...r, session: exam.session, updatedBy: user._id },
          },
          upsert: true,
        },
      })),
    ];
    await ExamTimetableEntry.bulkWrite(ops, { ordered: true });

    const after = await this.forClass(exam._id, classId);
    await logExamAudit({
      exam: exam._id,
      classId,
      action: "EXAM_TIMETABLE_SAVED",
      user,
      req,
      before: before.map(({ subjectName, date, remarks }) => ({ subjectName, date, remarks })),
      after: after.map(({ subjectName, date, remarks }) => ({ subjectName, date, remarks })),
    });
    return { entries: after, warnings };
  }

  /**
   * One date per subject applied to every selected class that has that subject.
   * Existing entries of those subjects are overwritten; other subjects untouched.
   */
  async saveBulk(examId, classIds, subjects, user, req) {
    const exam = await this._exam(examId);
    if (!TIMETABLE_EDITABLE.includes(exam.status)) {
      throwError(
        `The timetable is locked while status is ${EXAM_STATUS_LABELS[exam.status]}`,
        409,
      );
    }
    const wanted = new Map();
    for (const s of subjects) {
      if (!isRealDate(s.date)) throwError(`${s.subjectName}: invalid date ${s.date}`, 400);
      wanted.set(s.subjectName.trim().toLowerCase(), s.date);
    }
    const configs = await ExamClassConfig.find({ exam: exam._id, class: { $in: classIds } })
      .populate("class", "name section")
      .lean();
    if (configs.length === 0) throwError("None of the selected classes are configured for this examination", 404);

    const ops = [];
    const applied = [];
    const skipped = [];
    for (const c of configs) {
      for (const subj of c.subjects) {
        const date = wanted.get(subj.nameKey);
        if (!date) continue;
        ops.push({
          updateOne: {
            filter: { exam: exam._id, class: c.class._id, subjectKey: subj.nameKey },
            update: {
              $set: {
                subjectName: subj.name,
                date,
                session: exam.session,
                updatedBy: user._id,
              },
              $unset: { startTime: "", endTime: "" },
            },
            upsert: true,
          },
        });
        applied.push({ class: `${c.class.name}${c.class.section ? ` - ${c.class.section}` : ""}`, subject: subj.name, date });
      }
    }
    for (const [key] of wanted) {
      if (!configs.some((c) => c.subjects.some((s) => s.nameKey === key))) skipped.push(key);
    }
    if (ops.length === 0) throwError("No selected class has any of these subjects", 400);
    await ExamTimetableEntry.bulkWrite(ops, { ordered: true });

    const start = dayKey(exam.startDate);
    const end = dayKey(exam.endDate);
    const warnings = [];
    for (const [key, date] of wanted) {
      if ((start && date < start) || (end && date > end)) {
        warnings.push(`${key} on ${date} is outside the examination dates (${start || "?"} to ${end || "?"})`);
      }
    }
    await logExamAudit({
      exam: exam._id,
      action: "EXAM_TIMETABLE_BULK_SAVED",
      user,
      req,
      before: null,
      after: { classes: configs.length, entries: applied.length, subjects: [...wanted.entries()] },
    });
    return { applied: applied.length, classes: configs.length, skipped, warnings };
  }

  // Per-class completeness: every configured subject must have an entry.
  async incompleteClasses(examId) {
    const configs = await ExamClassConfig.find({ exam: examId })
      .populate("class", "name section")
      .lean();
    const counts = await ExamTimetableEntry.aggregate([
      { $match: { exam: new mongoose.Types.ObjectId(String(examId)) } },
      { $group: { _id: "$class", n: { $sum: 1 } } },
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c.n]));
    return configs
      .map((c) => ({
        label: `${c.class?.name} - ${c.class?.section}`,
        have: map.get(String(c.class?._id)) || 0,
        need: c.subjects.length,
      }))
      .filter((c) => c.have < c.need);
  }
}

module.exports = new ExamTimetableService();
module.exports.TIMETABLE_EDITABLE = TIMETABLE_EDITABLE;
