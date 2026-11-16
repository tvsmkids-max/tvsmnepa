"use strict";

const mongoose = require("mongoose");
const Exam = require("../../models/exam/Exam.model");
const ExamClassConfig = require("../../models/exam/ExamClassConfig.model");
const ExamRollNumber = require("../../models/exam/ExamRollNumber.model");
const ExamMarks = require("../../models/exam/ExamMarks.model");
const ExamMarksSubmission = require("../../models/exam/ExamMarksSubmission.model");
const Class = require("../../models/Class.model");
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

// Marks can be entered only once the examination has been completed.
const MARKS_ENTRY_STATUSES = Object.freeze([
  EXAM_STATUS.COMPLETED,
  EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS,
]);

const sameValue = (a, b) =>
  a === b || (a !== null && b !== null && Math.abs(a - b) < 1e-9);

class ExamMarksService {
  // ── context & helpers ───────────────────────────────────────────────────
  async _context(user, examId) {
    const classId = await getTeacherClassId(user);
    const { exam, config } = await assertExamClassAccess(user, examId, classId);
    return { exam, config, classId };
  }

  _subject(config, rawKey) {
    let key = "";
    try {
      key = decodeURIComponent(String(rawKey || ""));
    } catch {
      throwError("Invalid subject", 400);
    }
    key = key.trim().toLowerCase();
    const subject = config.subjects.find((s) => s.nameKey === key);
    if (!subject) throwError("Subject is not configured for this class", 404);
    return subject;
  }

  /**
   * Students the teacher can enter marks for: active students of the class that
   * already have a roll number, in roll order. Active students without a roll
   * number are reported separately (they must be numbered by the Admin first).
   */
  async _roster(exam, classId) {
    const [rolls, activeStudents] = await Promise.all([
      ExamRollNumber.find({ session: exam.session, class: classId })
        .sort({ rollNumber: 1 })
        .lean(),
      Student.find({
        class: classId,
        session: exam.session,
        status: STUDENT_STATUS.ACTIVE,
      })
        .select("name scholarNumber")
        .lean(),
    ]);
    const activeIds = new Set(activeStudents.map((s) => String(s._id)));
    const rolled = new Set(rolls.map((r) => String(r.student)));
    return {
      rolls, // every numbered student (active or not)
      active: rolls.filter((r) => activeIds.has(String(r.student))),
      missingRoll: activeStudents
        .filter((s) => !rolled.has(String(s._id)))
        .map((s) => ({ _id: s._id, name: s.name, scholarNumber: s.scholarNumber })),
    };
  }

  async _submission(exam, classId) {
    return ExamMarksSubmission.findOne({ exam: exam._id, class: classId }).lean();
  }

  _canEdit(exam, submission) {
    return (
      MARKS_ENTRY_STATUSES.includes(exam.status) &&
      (submission?.status || "draft") !== "submitted"
    );
  }

  async _classInfo(classId) {
    const c = await Class.findById(classId).select("name section").lean();
    return { _id: classId, name: c?.name || "", section: c?.section || "" };
  }

  _examInfo(exam) {
    return {
      _id: exam._id,
      name: exam.name,
      examType: exam.examType,
      status: exam.status,
      session: exam.session,
    };
  }

  // ── dashboard / overview ────────────────────────────────────────────────
  async overview(user, examId) {
    const { exam, config, classId } = await this._context(user, examId);
    await exam.populate("session", "name");
    const roster = await this._roster(exam, classId);
    const submission = await this._submission(exam, classId);
    const marks = await ExamMarks.find({ exam: exam._id, class: classId })
      .select("subjectKey student attendance marks")
      .lean();
    const activeIds = new Set(roster.active.map((r) => String(r.student)));

    const subjects = config.subjects.map((s) => {
      const mine = marks.filter(
        (m) => m.subjectKey === s.nameKey && activeIds.has(String(m.student)),
      );
      const done = mine.filter((m) => m.attendance === "absent" || m.marks !== null);
      return {
        key: s.nameKey,
        name: s.name,
        maxMarks: s.maxMarks,
        passingMarks: s.passingMarks,
        totalStudents: roster.active.length,
        entered: done.length,
        absent: mine.filter((m) => m.attendance === "absent").length,
        pending: roster.active.length - done.length,
      };
    });

    return {
      exam: this._examInfo(exam),
      class: await this._classInfo(classId),
      subjects,
      submission: {
        status: submission?.status || "draft",
        submittedAt: submission?.submittedAt || null,
        reopenCount: submission?.reopenCount || 0,
      },
      canEdit: this._canEdit(exam, submission),
      missingRoll: roster.missingRoll,
      entryOpen: MARKS_ENTRY_STATUSES.includes(exam.status),
    };
  }

  // ── marks sheet for one subject ─────────────────────────────────────────
  async sheet(user, examId, subjectKey) {
    const { exam, config, classId } = await this._context(user, examId);
    const subject = this._subject(config, subjectKey);
    await exam.populate("session", "name");
    const [roster, submission, docs] = await Promise.all([
      this._roster(exam, classId),
      this._submission(exam, classId),
      ExamMarks.find({ exam: exam._id, class: classId, subjectKey: subject.nameKey }).lean(),
    ]);
    const byStudent = new Map(docs.map((d) => [String(d.student), d]));
    const studentInfo = await Student.find({
      _id: { $in: roster.rolls.map((r) => r.student) },
    })
      .select("status")
      .lean();
    const statusOf = new Map(studentInfo.map((s) => [String(s._id), s.status]));

    const rows = roster.rolls
      .filter((r) => statusOf.get(String(r.student)) === STUDENT_STATUS.ACTIVE || byStudent.has(String(r.student)))
      .map((r) => {
        const d = byStudent.get(String(r.student));
        return {
          studentId: r.student,
          rollNumber: r.rollNumber,
          scholarNumber: r.scholarNumber,
          name: r.studentName,
          studentStatus: statusOf.get(String(r.student)) || "Unknown",
          attendance: d?.attendance || "present",
          marks: d ? d.marks : null,
          remarks: d?.remarks || "",
        };
      });

    return {
      exam: this._examInfo(exam),
      class: await this._classInfo(classId),
      subject: {
        key: subject.nameKey,
        name: subject.name,
        maxMarks: subject.maxMarks,
        passingMarks: subject.passingMarks,
      },
      submission: { status: submission?.status || "draft" },
      canEdit: this._canEdit(exam, submission),
      rows,
      missingRoll: roster.missingRoll,
    };
  }

  // ── save draft ──────────────────────────────────────────────────────────
  async save(user, examId, subjectKey, entries, req) {
    const { exam, config, classId } = await this._context(user, examId);
    const subject = this._subject(config, subjectKey);

    if (!MARKS_ENTRY_STATUSES.includes(exam.status)) {
      throwError(
        `Marks entry is not open (examination status: ${EXAM_STATUS_LABELS[exam.status]})`,
        409,
      );
    }
    const submission = await this._submission(exam, classId);
    if (submission?.status === "submitted") {
      throwError(
        "Marks for this class are submitted and locked. Ask the Admin to reopen marks entry.",
        409,
      );
    }

    const roster = await this._roster(exam, classId);
    const rollOf = new Map(roster.active.map((r) => [String(r.student), r]));

    // ── server-side validation (all problems reported together)
    const problems = [];
    const seen = new Set();
    for (const e of entries) {
      const sid = String(e.studentId);
      const roll = rollOf.get(sid);
      if (seen.has(sid)) {
        problems.push(`Duplicate entry for student ${roll?.studentName || sid}`);
        continue;
      }
      seen.add(sid);
      if (!roll) {
        problems.push(`A student is not an active, numbered student of this class (${sid})`);
        continue;
      }
      const hasMarks = e.marks !== null && e.marks !== undefined;
      if (e.attendance === "absent" && hasMarks) {
        problems.push(`${roll.studentName}: an absent student cannot have marks`);
      }
      if (hasMarks) {
        if (!Number.isFinite(e.marks)) problems.push(`${roll.studentName}: marks must be a number`);
        else if (e.marks < 0) problems.push(`${roll.studentName}: marks cannot be negative`);
        else if (e.marks > subject.maxMarks) {
          problems.push(
            `${roll.studentName}: marks ${e.marks} exceed the maximum (${subject.maxMarks})`,
          );
        }
      }
    }
    if (problems.length) {
      throwError(
        problems.slice(0, 5).join("; ") +
          (problems.length > 5 ? `; and ${problems.length - 5} more` : ""),
        400,
      );
    }

    const ids = entries.map((e) => e.studentId);
    const existing = await ExamMarks.find({
      exam: exam._id,
      class: classId,
      subjectKey: subject.nameKey,
      student: { $in: ids },
    }).lean();
    const before = new Map(existing.map((d) => [String(d.student), d]));

    const ops = entries.map((e) => {
      const roll = rollOf.get(String(e.studentId));
      const marks = e.attendance === "absent" || e.marks === undefined ? null : e.marks;
      return {
        updateOne: {
          // A submitted row does not match, so the upsert would try to insert a
          // duplicate and hit the unique index: a locked row can never be changed.
          filter: {
            exam: exam._id,
            class: classId,
            subjectKey: subject.nameKey,
            student: e.studentId,
            status: { $ne: "submitted" },
          },
          update: {
            $set: {
              session: exam.session,
              subjectName: subject.name,
              rollNumber: roll.rollNumber,
              scholarNumber: roll.scholarNumber,
              studentName: roll.studentName,
              maxMarks: subject.maxMarks,
              passingMarks: subject.passingMarks,
              attendance: e.attendance,
              marks,
              remarks: e.remarks || "",
              updatedBy: user._id,
            },
            $setOnInsert: { status: "draft", enteredBy: user._id },
          },
          upsert: true,
        },
      };
    });

    try {
      await ExamMarks.bulkWrite(ops, { ordered: false });
    } catch (err) {
      if (err.code === 11000 || err.writeErrors) {
        throwError(
          "Marks were submitted or changed while you were saving. Reload the page and review.",
          409,
        );
      }
      throw err;
    }

    await ExamMarksSubmission.updateOne(
      { exam: exam._id, class: classId },
      { $setOnInsert: { session: exam.session, status: "draft" } },
      { upsert: true },
    ).catch((err) => {
      if (err.code !== 11000) throw err; // concurrent first save: already created
    });

    // First saved marks move the examination to "Marks Entry In Progress".
    if (exam.status === EXAM_STATUS.COMPLETED) {
      const moved = await Exam.findOneAndUpdate(
        { _id: exam._id, status: EXAM_STATUS.COMPLETED },
        {
          $set: { status: EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS },
          $push: {
            statusHistory: {
              from: EXAM_STATUS.COMPLETED,
              to: EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS,
              by: user._id,
              byName: user.name,
              reason: "First marks saved",
              at: new Date(),
            },
          },
        },
      );
      if (moved) {
        await logExamAudit({
          exam: exam._id,
          action: "EXAM_STATUS_CHANGED",
          user,
          req,
          reason: "First marks saved",
          before: { status: EXAM_STATUS.COMPLETED },
          after: { status: EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS },
        });
      }
    }

    const changes = [];
    for (const e of entries) {
      const roll = rollOf.get(String(e.studentId));
      const b = before.get(String(e.studentId));
      const afterMarks = e.attendance === "absent" || e.marks === undefined ? null : e.marks;
      const after = { attendance: e.attendance, marks: afterMarks, remarks: e.remarks || "" };
      const prev = b
        ? { attendance: b.attendance, marks: b.marks, remarks: b.remarks || "" }
        : null;
      if (
        !prev ||
        prev.attendance !== after.attendance ||
        !sameValue(prev.marks, after.marks) ||
        prev.remarks !== after.remarks
      ) {
        changes.push({
          student: roll.studentName,
          scholarNumber: roll.scholarNumber,
          rollNumber: roll.rollNumber,
          before: prev,
          after,
        });
      }
    }
    if (changes.length) {
      await logExamAudit({
        exam: exam._id,
        classId,
        action: "MARKS_SAVED",
        user,
        req,
        after: { subject: subject.name, changes },
      });
    }
    return { saved: entries.length, changed: changes.length };
  }

  // ── completeness (used before submission) ───────────────────────────────
  async _pending(exam, config, classId, roster) {
    const docs = await ExamMarks.find({ exam: exam._id, class: classId })
      .select("subjectKey student attendance marks")
      .lean();
    const done = new Set(
      docs
        .filter((d) => d.attendance === "absent" || d.marks !== null)
        .map((d) => `${d.subjectKey}|${d.student}`),
    );
    const pending = [];
    for (const s of config.subjects) {
      const missing = roster.active.filter(
        (r) => !done.has(`${s.nameKey}|${r.student}`),
      ).length;
      if (missing > 0) pending.push({ subject: s.name, missing });
    }
    return pending;
  }

  // ── submit to admin ─────────────────────────────────────────────────────
  async submit(user, examId, req) {
    const { exam, config, classId } = await this._context(user, examId);
    if (!MARKS_ENTRY_STATUSES.includes(exam.status)) {
      throwError(
        `Marks entry is not open (examination status: ${EXAM_STATUS_LABELS[exam.status]})`,
        409,
      );
    }
    const submission = await this._submission(exam, classId);
    if (submission?.status === "submitted") {
      throwError("Marks for this class are already submitted", 409);
    }

    const roster = await this._roster(exam, classId);
    if (roster.active.length === 0) {
      throwError("There are no numbered students in this class", 409);
    }
    if (roster.missingRoll.length > 0) {
      throwError(
        `These students have no roll number yet: ${roster.missingRoll
          .map((s) => s.name)
          .join(", ")}. Ask the Admin to assign roll numbers.`,
        409,
      );
    }
    const pending = await this._pending(exam, config, classId, roster);
    if (pending.length > 0) {
      throwError(
        `Marks are incomplete: ${pending
          .map((p) => `${p.subject} (${p.missing} pending)`)
          .join(", ")}`,
        409,
      );
    }

    // Lock the rows first, then re-verify; revert if a concurrent edit slipped in.
    await ExamMarks.updateMany(
      { exam: exam._id, class: classId, status: "draft" },
      { $set: { status: "submitted" } },
    );
    const stillPending = await this._pending(exam, config, classId, roster);
    if (stillPending.length > 0) {
      await ExamMarks.updateMany(
        { exam: exam._id, class: classId, status: "submitted" },
        { $set: { status: "draft" } },
      );
      throwError("Marks changed while submitting. Review them and submit again.", 409);
    }

    const locked = await ExamMarksSubmission.findOneAndUpdate(
      { exam: exam._id, class: classId, status: { $ne: "submitted" } },
      {
        $set: {
          session: exam.session,
          status: "submitted",
          submittedAt: new Date(),
          submittedBy: user._id,
        },
        $push: {
          history: { action: "submitted", at: new Date(), by: user._id, byName: user.name },
        },
      },
      { new: true, upsert: true },
    ).catch((err) => {
      if (err.code === 11000) return null;
      throw err;
    });
    if (!locked) {
      throwError("Marks for this class were already submitted", 409);
    }

    // Every configured class submitted → Marks Submitted.
    const [total, submitted] = await Promise.all([
      ExamClassConfig.countDocuments({ exam: exam._id }),
      ExamMarksSubmission.countDocuments({ exam: exam._id, status: "submitted" }),
    ]);
    let examStatus = exam.status;
    if (submitted >= total && exam.status === EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS) {
      const moved = await Exam.findOneAndUpdate(
        { _id: exam._id, status: EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS },
        {
          $set: { status: EXAM_STATUS.MARKS_SUBMITTED },
          $push: {
            statusHistory: {
              from: EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS,
              to: EXAM_STATUS.MARKS_SUBMITTED,
              by: user._id,
              byName: user.name,
              reason: "All classes submitted",
              at: new Date(),
            },
          },
        },
      );
      if (moved) {
        examStatus = EXAM_STATUS.MARKS_SUBMITTED;
        await logExamAudit({
          exam: exam._id,
          action: "EXAM_STATUS_CHANGED",
          user,
          req,
          reason: "All classes submitted",
          before: { status: EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS },
          after: { status: EXAM_STATUS.MARKS_SUBMITTED },
        });
      }
    }

    await logExamAudit({
      exam: exam._id,
      classId,
      action: "MARKS_SUBMITTED",
      user,
      req,
      after: {
        students: roster.active.length,
        subjects: config.subjects.map((s) => s.name),
      },
    });
    return { status: "submitted", examStatus };
  }

  // ── admin: reopen a submitted class ─────────────────────────────────────
  async reopen(examId, classId, { reason }, user, req) {
    if (!mongoose.isValidObjectId(examId)) throwError("Invalid examination ID", 400);
    if (!mongoose.isValidObjectId(classId)) throwError("Invalid class ID", 400);
    const exam = await Exam.findById(examId);
    if (!exam) throwError("Examination not found", 404);

    if (
      ![EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS, EXAM_STATUS.MARKS_SUBMITTED].includes(exam.status)
    ) {
      throwError(
        `Marks entry cannot be reopened while status is ${EXAM_STATUS_LABELS[exam.status]}`,
        409,
      );
    }
    const submission = await ExamMarksSubmission.findOne({ exam: exam._id, class: classId });
    if (!submission || submission.status !== "submitted") {
      throwError("This class has no submitted marks to reopen", 409);
    }

    // Keep the submitted values in the audit trail before anything changes.
    const snapshot = await ExamMarks.find({ exam: exam._id, class: classId })
      .select("subjectName rollNumber scholarNumber studentName attendance marks remarks")
      .lean();

    const reopened = await ExamMarksSubmission.findOneAndUpdate(
      { _id: submission._id, status: "submitted" },
      {
        $set: { status: "draft" },
        $inc: { reopenCount: 1 },
        $push: {
          history: {
            action: "reopened",
            at: new Date(),
            by: user._id,
            byName: user.name,
            reason: reason.trim(),
          },
        },
      },
      { new: true },
    );
    if (!reopened) throwError("Marks were reopened by someone else. Refresh.", 409);
    await ExamMarks.updateMany(
      { exam: exam._id, class: classId, status: "submitted" },
      { $set: { status: "draft" } },
    );

    if (exam.status === EXAM_STATUS.MARKS_SUBMITTED) {
      await Exam.findOneAndUpdate(
        { _id: exam._id, status: EXAM_STATUS.MARKS_SUBMITTED },
        {
          $set: { status: EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS },
          $push: {
            statusHistory: {
              from: EXAM_STATUS.MARKS_SUBMITTED,
              to: EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS,
              by: user._id,
              byName: user.name,
              reason: `Marks entry reopened: ${reason.trim()}`,
              at: new Date(),
            },
          },
        },
      );
    }

    await logExamAudit({
      exam: exam._id,
      classId,
      action: "MARKS_REOPENED",
      user,
      req,
      reason: reason.trim(),
      before: { submittedMarks: snapshot },
      after: { status: "draft" },
    });
    return { status: "draft" };
  }
}

module.exports = new ExamMarksService();
module.exports.MARKS_ENTRY_STATUSES = MARKS_ENTRY_STATUSES;
