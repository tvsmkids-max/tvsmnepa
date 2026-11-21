"use strict";

const mongoose = require("mongoose");
const Exam = require("../../models/exam/Exam.model");
const ExamClassConfig = require("../../models/exam/ExamClassConfig.model");
const ExamRollNumber = require("../../models/exam/ExamRollNumber.model");
const Student = require("../../models/Student.model");
const { STUDENT_STATUS } = require("../../constants/studentStatus");
const { EXAM_STATUS, EXAM_STATUS_LABELS } = require("../../constants/examStatus");
const { logExamAudit } = require("./examAudit.service");
const {
  assertExamClassAccess,
  getTeacherClassId,
} = require("./examAccess.service");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");

// Approved ordering: alphabetical by name; identical names → admission
// (scholar) number; final _id fallback keeps the result deterministic.
const byNameThenAdmission = (a, b) =>
  collator.compare(norm(a.name), norm(b.name)) ||
  collator.compare(norm(a.scholarNumber), norm(b.scholarNumber)) ||
  String(a._id).localeCompare(String(b._id));

class ExamRollNumberService {
  async _examAndConfig(examId, classId) {
    if (!mongoose.isValidObjectId(examId)) throwError("Invalid examination ID", 400);
    if (!mongoose.isValidObjectId(classId)) throwError("Invalid class ID", 400);
    const exam = await Exam.findById(examId);
    if (!exam) throwError("Examination not found", 404);
    const config = await ExamClassConfig.findOne({
      exam: exam._id,
      class: classId,
    }).lean();
    if (!config) throwError("Class is not configured for this examination", 404);
    return exam;
  }

  async _eligibleStudents(exam, classId) {
    return Student.find({
      class: classId,
      session: exam.session,
      status: STUDENT_STATUS.ACTIVE,
    })
      .select("name scholarNumber")
      .lean();
  }

  async _view(exam, classId) {
    const [records, eligible] = await Promise.all([
      ExamRollNumber.find({ session: exam.session, class: classId })
        .sort({ rollNumber: 1 })
        .lean(),
      this._eligibleStudents(exam, classId),
    ]);
    const have = new Set(records.map((r) => String(r.student)));
    const current = await Student.find({ _id: { $in: records.map((r) => r.student) } })
      .select("status")
      .lean();
    const statusById = new Map(current.map((s) => [String(s._id), s.status]));
    return {
      records: records.map((r) => ({
        ...r,
        studentStatus: statusById.get(String(r.student)) || "Unknown",
      })),
      unassigned: eligible
        .filter((s) => !have.has(String(s._id)))
        .sort(byNameThenAdmission)
        .map((s) => ({ _id: s._id, name: s.name, scholarNumber: s.scholarNumber })),
    };
  }

  async list(examId, classId) {
    const exam = await this._examAndConfig(examId, classId);
    return this._view(exam, classId);
  }

  async listForTeacher(user, examId) {
    const classId = await getTeacherClassId(user);
    const { exam } = await assertExamClassAccess(user, examId, classId);
    return this._view(exam, classId);
  }

  // First run: number every active student A→Z from 1.
  // Later runs: append ONLY students without a number (late joiners) after the
  // current highest number. Existing numbers are never changed or reused.
  async generate(examId, classId, user, req) {
    const exam = await this._examAndConfig(examId, classId);
    if (exam.status === EXAM_STATUS.RESULTS_PUBLISHED) {
      throwError("Roll numbers cannot be changed after results are published", 409);
    }

    const [existing, eligible] = await Promise.all([
      ExamRollNumber.find({ session: exam.session, class: classId })
        .select("student rollNumber")
        .lean(),
      this._eligibleStudents(exam, classId),
    ]);
    const have = new Set(existing.map((r) => String(r.student)));
    const todo = eligible.filter((s) => !have.has(String(s._id))).sort(byNameThenAdmission);
    if (todo.length === 0) {
      throwError(
        existing.length === 0
          ? "No active students found in this class"
          : "Every active student already has a roll number",
        409,
      );
    }

    const initial = existing.length === 0;
    const start = existing.reduce((m, r) => Math.max(m, r.rollNumber), 0) + 1;
    const docs = todo.map((s, i) => ({
      session: exam.session,
      class: classId,
      student: s._id,
      scholarNumber: s.scholarNumber,
      studentName: norm(s.name),
      rollNumber: start + i,
      source: initial ? "generated" : "late_joiner",
      assignedForExam: exam._id,
      assignedBy: user._id,
    }));

    try {
      await ExamRollNumber.insertMany(docs, { ordered: true });
    } catch (err) {
      if (err.code === 11000 || err.writeErrors) {
        // Someone else generated at the same moment. Unique indexes stopped
        // any duplicate; ask the admin to refresh. (Ordered insert: stop at first.)
        throwError(
          "Roll numbers for this class were changed by someone else. Refresh and review the list.",
          409,
        );
      }
      throw err;
    }

    await logExamAudit({
      exam: exam._id,
      classId,
      action: initial ? "ROLL_NUMBERS_GENERATED" : "ROLL_NUMBERS_LATE_JOINERS_ASSIGNED",
      user,
      req,
      after: {
        count: docs.length,
        firstRoll: docs[0].rollNumber,
        lastRoll: docs[docs.length - 1].rollNumber,
        students: docs.map((d) => ({
          scholarNumber: d.scholarNumber,
          name: d.studentName,
          rollNumber: d.rollNumber,
        })),
      },
    });
    return this._view(exam, classId);
  }

  /**
   * Automatic numbering (no admin step). Numbers every active student of the
   * class that has none, alphabetically on the first run and appended after the
   * current highest number for students who join later. Existing numbers never
   * change. Safe to call often; a concurrent run is absorbed by the unique indexes.
   */
  async ensureForClass(exam, classId) {
    if (exam.status === EXAM_STATUS.RESULTS_PUBLISHED) return;
    const [existing, eligible] = await Promise.all([
      ExamRollNumber.find({ session: exam.session, class: classId }).select("student rollNumber").lean(),
      this._eligibleStudents(exam, classId),
    ]);
    const have = new Set(existing.map((r) => String(r.student)));
    const todo = eligible.filter((s) => !have.has(String(s._id))).sort(byNameThenAdmission);
    if (todo.length === 0) return;
    const initial = existing.length === 0;
    const start = existing.reduce((m, r) => Math.max(m, r.rollNumber), 0) + 1;
    try {
      await ExamRollNumber.insertMany(
        todo.map((s, i) => ({
          session: exam.session,
          class: classId,
          student: s._id,
          scholarNumber: s.scholarNumber,
          studentName: norm(s.name),
          rollNumber: start + i,
          source: initial ? "generated" : "late_joiner",
          assignedForExam: exam._id,
        })),
        { ordered: true },
      );
    } catch (err) {
      // Another request numbered the same students first: nothing more to do.
      if (!(err.code === 11000 || err.writeErrors)) throw err;
    }
  }

  async updateManual(examId, classId, studentId, { rollNumber, reason }, user, req) {
    const exam = await this._examAndConfig(examId, classId);
    if (!mongoose.isValidObjectId(studentId)) throwError("Invalid student ID", 400);
    if (!reason || reason.trim().length < 3) {
      throwError("A reason is required for a manual roll-number correction", 400);
    }
    if (exam.status === EXAM_STATUS.RESULTS_PUBLISHED) {
      throwError(
        `Roll numbers cannot be changed while status is ${EXAM_STATUS_LABELS[exam.status]}`,
        409,
      );
    }

    const rec = await ExamRollNumber.findOne({
      session: exam.session,
      class: classId,
      student: studentId,
    });
    if (!rec) throwError("This student has no roll number yet", 404);
    if (rec.rollNumber === rollNumber) throwError("Roll number is unchanged", 400);

    const clash = await ExamRollNumber.findOne({
      session: exam.session,
      class: classId,
      rollNumber,
    }).lean();
    if (clash) {
      throwError(
        `Roll number ${rollNumber} is already assigned to ${clash.studentName}. Move that student first.`,
        409,
      );
    }

    const before = rec.rollNumber;
    // Compare-and-set on the old number so a concurrent change is not overwritten.
    let updated;
    try {
      updated = await ExamRollNumber.findOneAndUpdate(
        { _id: rec._id, rollNumber: before },
        {
          $set: { rollNumber, source: "manual" },
          $push: {
            history: {
              rollNumber: before,
              changedAt: new Date(),
              changedBy: user._id,
              reason: reason.trim(),
            },
          },
        },
        { new: true },
      );
    } catch (err) {
      if (err.code === 11000) {
        throwError(`Roll number ${rollNumber} is already assigned in this class`, 409);
      }
      throw err;
    }
    if (!updated) throwError("The roll number was changed by someone else. Refresh.", 409);

    await logExamAudit({
      exam: exam._id,
      classId,
      action: "ROLL_NUMBER_MANUALLY_CHANGED",
      user,
      req,
      reason: reason.trim(),
      before: { student: rec.studentName, scholarNumber: rec.scholarNumber, rollNumber: before },
      after: { student: rec.studentName, scholarNumber: rec.scholarNumber, rollNumber },
    });
    return updated;
  }
}

module.exports = new ExamRollNumberService();
module.exports.byNameThenAdmission = byNameThenAdmission;
