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

// Corrections stay possible while the exam is running; locked after Completed.
const TIMETABLE_EDITABLE = Object.freeze([
  EXAM_STATUS.DRAFT,
  EXAM_STATUS.CONFIGURATION_PENDING,
  EXAM_STATUS.SCHEDULED,
  EXAM_STATUS.ONGOING,
]);

const isRealDate = (s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const overlaps = (a, b) => a.startTime < b.endTime && b.startTime < a.endTime;
const dayKey = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

const sortEntries = (list) =>
  [...list].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`),
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
      if (e.endTime <= e.startTime) {
        throwError(`${subject.name}: end time must be after start time`, 400);
      }
      return {
        subjectKey: key,
        subjectName: subject.name,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        remarks: e.remarks || "",
      };
    });

    // Hard conflict: two subjects of the same class overlapping on the same day.
    const sorted = sortEntries(rows);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (prev.date === cur.date && overlaps(prev, cur)) {
        throwError(
          `Schedule conflict on ${cur.date}: ${prev.subjectName} (${prev.startTime}-${prev.endTime}) overlaps ${cur.subjectName} (${cur.startTime}-${cur.endTime})`,
          409,
        );
      }
    }

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
          if (o.date === r.date && overlaps(r, o)) {
            warnings.push(
              `${r.subjectName} on ${r.date} ${r.startTime}-${r.endTime} overlaps ${o.subjectName} of "${o.exam?.name || "another examination"}"`,
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
      before: before.map(({ subjectName, date, startTime, endTime, remarks }) => ({
        subjectName, date, startTime, endTime, remarks,
      })),
      after: after.map(({ subjectName, date, startTime, endTime, remarks }) => ({
        subjectName, date, startTime, endTime, remarks,
      })),
    });
    return { entries: after, warnings };
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
