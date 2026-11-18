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
const { componentMax, isEntered, normalizeEntry, snapshot, sameSnapshot } = require("./examMarksRules");
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

// Statuses in which the Admin may review, correct, lock or unlock marks.
const ADMIN_REVIEW_STATUSES = Object.freeze([
  EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS,
  EXAM_STATUS.MARKS_SUBMITTED,
]);

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
      (submission?.status || "draft") === "draft"
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
      .select("subjectKey student attendance marks grade")
      .lean();
    const activeIds = new Set(roster.active.map((r) => String(r.student)));

    const subjects = config.subjects.map((s) => {
      const mine = marks.filter(
        (m) => m.subjectKey === s.nameKey && activeIds.has(String(m.student)),
      );
      const done = mine.filter(isEntered);
      return {
        key: s.nameKey,
        name: s.name,
        maxMarks: s.maxMarks,
        passingMarks: s.passingMarks,
        internalMax: s.internalMax || 0,
        gradeOnly: !!s.gradeOnly,
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
    return this._buildSheet(exam, classId, subject);
  }

  async _buildSheet(exam, classId, subject) {
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
          writtenMarks: d ? d.writtenMarks ?? null : null,
          internalMarks: d ? d.internalMarks ?? null : null,
          grade: d ? d.grade ?? null : null,
          remarks: d?.remarks || "",
          rowStatus: d?.status || "not_entered",
          correctionCount: d?.correctionCount || 0,
          correctedAt: d?.correctedAt || null,
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
        internalMax: subject.internalMax || 0,
        gradeOnly: !!subject.gradeOnly,
        writtenMax: componentMax(subject).written,
      },
      submission: {
        status: submission?.status || "draft",
        submittedAt: submission?.submittedAt || null,
        lockedAt: submission?.lockedAt || null,
        reopenCount: submission?.reopenCount || 0,
      },
      canEdit: this._canEdit(exam, submission),
      canCorrect:
        submission?.status === "submitted" && ADMIN_REVIEW_STATUSES.includes(exam.status),
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
    if (submission && submission.status !== "draft") {
      throwError(
        "Marks for this class are submitted and locked. Ask the Admin to reopen marks entry.",
        409,
      );
    }

    const roster = await this._roster(exam, classId);
    const rollOf = new Map(roster.active.map((r) => [String(r.student), r]));

    // ── server-side validation (all problems reported together)
    const problems = [];
    const normalized = new Map();
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
      const norm = normalizeEntry(subject, e, roll.studentName);
      problems.push(...norm.problems);
      normalized.set(sid, norm.value);
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
      const v = normalized.get(String(e.studentId));
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
              internalMax: subject.internalMax || 0,
              gradeOnly: !!subject.gradeOnly,
              ...v,
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
      const after = normalized.get(String(e.studentId));
      const prev = b ? snapshot(b) : null;
      if (!prev || !sameSnapshot(prev, after)) {
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
      .select("subjectKey student attendance marks grade")
      .lean();
    const done = new Set(
      docs
        .filter(isEntered)
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
    if (submission && submission.status !== "draft") {
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
      ExamMarksSubmission.countDocuments({
        exam: exam._id,
        status: { $in: ["submitted", "locked"] },
      }),
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
    if (submission && submission.status === "locked") {
      throwError("These marks are locked. Unlock them first, with a reason.", 409);
    }
    if (!submission || submission.status !== "submitted") {
      throwError("This class has no submitted marks to reopen", 409);
    }

    // Keep the submitted values in the audit trail before anything changes.
    const submittedRows = await ExamMarks.find({ exam: exam._id, class: classId })
      .select("subjectName rollNumber scholarNumber studentName attendance marks writtenMarks internalMarks grade remarks")
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
      before: {
        submissionStatus: "submitted",
        examStatus: exam.status,
        submittedMarks: submittedRows,
      },
      after: {
        submissionStatus: "draft",
        examStatus:
          exam.status === EXAM_STATUS.MARKS_SUBMITTED
            ? EXAM_STATUS.MARKS_ENTRY_IN_PROGRESS
            : exam.status,
      },
    });
    return { status: "draft" };
  }

  // ════════════════════════ ADMIN: monitoring, review, correction, lock ═════
  async _adminContext(examId, classId) {
    if (!mongoose.isValidObjectId(examId)) throwError("Invalid examination ID", 400);
    if (!mongoose.isValidObjectId(classId)) throwError("Invalid class ID", 400);
    const exam = await Exam.findById(examId);
    if (!exam) throwError("Examination not found", 404);
    const config = await ExamClassConfig.findOne({ exam: exam._id, class: classId }).lean();
    if (!config) throwError("Class is not configured for this examination", 404);
    return { exam, config };
  }

  async monitor(examId) {
    if (!mongoose.isValidObjectId(examId)) throwError("Invalid examination ID", 400);
    const exam = await Exam.findById(examId).populate("session", "name");
    if (!exam) throwError("Examination not found", 404);

    const configs = (
      await ExamClassConfig.find({ exam: exam._id })
        .populate("class", "name section displayOrder")
        .lean()
    ).filter((c) => c.class);
    const classIds = configs.map((c) => c.class._id);

    const [rolls, activeStudents, subs, marks] = await Promise.all([
      ExamRollNumber.find({ session: exam.session._id, class: { $in: classIds } })
        .select("class student")
        .lean(),
      Student.find({
        class: { $in: classIds },
        session: exam.session._id,
        status: STUDENT_STATUS.ACTIVE,
      })
        .select("class")
        .lean(),
      ExamMarksSubmission.find({ exam: exam._id }).lean(),
      ExamMarks.find({ exam: exam._id })
        .select("class subjectKey student attendance marks grade status")
        .lean(),
    ]);

    const subByClass = new Map(subs.map((x) => [String(x.class), x]));
    const classes = configs
      .sort(
        (a, b) =>
          (a.class.displayOrder ?? 0) - (b.class.displayOrder ?? 0) ||
          `${a.class.name}${a.class.section}`.localeCompare(`${b.class.name}${b.class.section}`),
      )
      .map((c) => {
        const cid = String(c.class._id);
        const active = new Set(
          activeStudents.filter((s) => String(s.class) === cid).map((s) => String(s._id)),
        );
        const numbered = new Set(
          rolls
            .filter((r) => String(r.class) === cid && active.has(String(r.student)))
            .map((r) => String(r.student)),
        );
        const total = numbered.size;
        const classMarks = marks.filter(
          (m) => String(m.class) === cid && numbered.has(String(m.student)),
        );

        const subjects = c.subjects.map((s) => {
          const mine = classMarks.filter((m) => m.subjectKey === s.nameKey);
          const entered = mine.filter(isEntered);
          return {
            key: s.nameKey,
            name: s.name,
            maxMarks: s.maxMarks,
            passingMarks: s.passingMarks,
            internalMax: s.internalMax || 0,
            gradeOnly: !!s.gradeOnly,
            totalStudents: total,
            entered: entered.length,
            pending: total - entered.length,
            absent: mine.filter((m) => m.attendance === "absent").length,
            draft: entered.filter((m) => m.status === "draft").length,
            submitted: entered.filter((m) => m.status === "submitted").length,
            completion: total ? Math.round((entered.length / total) * 100) : 0,
          };
        });
        const need = total * subjects.length;
        const have = subjects.reduce((a, s) => a + s.entered, 0);
        const sub = subByClass.get(cid);
        return {
          class: { _id: c.class._id, name: c.class.name, section: c.class.section },
          submission: {
            status: sub?.status || "not_started",
            submittedAt: sub?.submittedAt || null,
            lockedAt: sub?.lockedAt || null,
            reopenCount: sub?.reopenCount || 0,
          },
          totalStudents: total,
          missingRoll: active.size - total,
          subjects,
          completion: need ? Math.round((have / need) * 100) : 0,
        };
      });

    return {
      exam: {
        _id: exam._id,
        name: exam.name,
        examType: exam.examType,
        status: exam.status,
        session: exam.session,
      },
      classes,
      summary: {
        classes: classes.length,
        submitted: classes.filter((c) => c.submission.status === "submitted").length,
        locked: classes.filter((c) => c.submission.status === "locked").length,
        inProgress: classes.filter((c) => c.submission.status === "draft").length,
        notStarted: classes.filter((c) => c.submission.status === "not_started").length,
      },
    };
  }

  async adminSheet(examId, classId, subjectKey) {
    const { exam, config } = await this._adminContext(examId, classId);
    const subject = this._subject(config, subjectKey);
    return this._buildSheet(exam, classId, subject);
  }

  // Admin correction of SUBMITTED (not locked) marks. Reason mandatory; every
  // change is audited with before/after values.
  async correct(examId, classId, subjectKey, { entries, reason }, user, req) {
    const { exam, config } = await this._adminContext(examId, classId);
    const subject = this._subject(config, subjectKey);
    if (!ADMIN_REVIEW_STATUSES.includes(exam.status)) {
      throwError(
        `Marks cannot be corrected while the examination is ${EXAM_STATUS_LABELS[exam.status]}`,
        409,
      );
    }
    const submission = await this._submission(exam, classId);
    if (!submission || submission.status === "draft") {
      throwError("These marks are not submitted yet. The class teacher is still entering them.", 409);
    }
    if (submission.status === "locked") {
      throwError("These marks are locked. Unlock them first, with a reason.", 409);
    }

    const existing = await ExamMarks.find({
      exam: exam._id,
      class: classId,
      subjectKey: subject.nameKey,
    }).lean();
    const byStudent = new Map(existing.map((d) => [String(d.student), d]));

    const problems = [];
    const normalized = new Map();
    const seen = new Set();
    for (const e of entries) {
      const sid = String(e.studentId);
      const row = byStudent.get(sid);
      if (seen.has(sid)) {
        problems.push(`Duplicate entry for student ${row?.studentName || sid}`);
        continue;
      }
      seen.add(sid);
      if (!row) {
        problems.push(`No submitted marks exist for student ${sid}`);
        continue;
      }
      const norm = normalizeEntry(subject, e, row.studentName);
      problems.push(...norm.problems);
      if (e.attendance === "present" && norm.value.marks === null && norm.value.grade === null) {
        problems.push(
          `${row.studentName}: ${subject.gradeOnly ? "a grade" : "complete marks"} required for a present student`,
        );
      }
      normalized.set(sid, norm.value);
    }
    if (problems.length) {
      throwError(
        problems.slice(0, 5).join("; ") +
          (problems.length > 5 ? `; and ${problems.length - 5} more` : ""),
        400,
      );
    }

    const changes = [];
    const ops = [];
    for (const e of entries) {
      const row = byStudent.get(String(e.studentId));
      const after = normalized.get(String(e.studentId));
      const prev = snapshot(row);
      if (sameSnapshot(prev, after)) continue;
      changes.push({
        student: row.studentName,
        scholarNumber: row.scholarNumber,
        rollNumber: row.rollNumber,
        before: prev,
        after,
      });
      ops.push({
        updateOne: {
          filter: {
            _id: row._id,
            status: "submitted",
            attendance: row.attendance,
            marks: row.marks ?? null,
            writtenMarks: row.writtenMarks ?? null,
            internalMarks: row.internalMarks ?? null,
            grade: row.grade ?? null,
          },
          update: {
            $set: { ...after, updatedBy: user._id, correctedBy: user._id, correctedAt: new Date() },
            $inc: { correctionCount: 1 },
          },
        },
      });
    }
    if (ops.length === 0) throwError("No changes to save", 400);

    const res = await ExamMarks.bulkWrite(ops, { ordered: true });
    if ((res.modifiedCount ?? res.nModified ?? ops.length) !== ops.length) {
      throwError("Some marks changed while you were correcting them. Reload and try again.", 409);
    }

    await logExamAudit({
      exam: exam._id,
      classId,
      action: "MARKS_CORRECTED_BY_ADMIN",
      user,
      req,
      reason: reason.trim(),
      after: { subject: subject.name, changes },
    });
    return { corrected: changes.length };
  }

  // Approve and lock a submitted class. Locked marks cannot be corrected or
  // reopened until the Admin unlocks them with a reason.
  async lock(examId, classId, user, req) {
    const { exam } = await this._adminContext(examId, classId);
    if (!ADMIN_REVIEW_STATUSES.includes(exam.status)) {
      throwError(
        `Marks cannot be locked while the examination is ${EXAM_STATUS_LABELS[exam.status]}`,
        409,
      );
    }
    const locked = await ExamMarksSubmission.findOneAndUpdate(
      { exam: exam._id, class: classId, status: "submitted" },
      {
        $set: { status: "locked", lockedAt: new Date(), lockedBy: user._id },
        $push: { history: { action: "locked", at: new Date(), by: user._id, byName: user.name } },
      },
      { new: true },
    );
    if (!locked) throwError("Only submitted marks can be locked", 409);

    await logExamAudit({
      exam: exam._id,
      classId,
      action: "MARKS_LOCKED",
      user,
      req,
      before: { submissionStatus: "submitted" },
      after: { submissionStatus: "locked" },
    });
    return { status: "locked" };
  }

  async unlock(examId, classId, { reason }, user, req) {
    const { exam } = await this._adminContext(examId, classId);
    if (!ADMIN_REVIEW_STATUSES.includes(exam.status)) {
      throwError(
        `Marks cannot be unlocked while the examination is ${EXAM_STATUS_LABELS[exam.status]}`,
        409,
      );
    }
    const unlocked = await ExamMarksSubmission.findOneAndUpdate(
      { exam: exam._id, class: classId, status: "locked" },
      {
        $set: { status: "submitted", lockedAt: null },
        $push: {
          history: {
            action: "unlocked",
            at: new Date(),
            by: user._id,
            byName: user.name,
            reason: reason.trim(),
          },
        },
      },
      { new: true },
    );
    if (!unlocked) throwError("These marks are not locked", 409);

    await logExamAudit({
      exam: exam._id,
      classId,
      action: "MARKS_UNLOCKED",
      user,
      req,
      reason: reason.trim(),
      before: { submissionStatus: "locked" },
      after: { submissionStatus: "submitted" },
    });
    return { status: "submitted" };
  }
}

module.exports = new ExamMarksService();
module.exports.MARKS_ENTRY_STATUSES = MARKS_ENTRY_STATUSES;
