"use strict";

const mongoose = require("mongoose");
const Exam = require("../../models/exam/Exam.model");
const ExamClassConfig = require("../../models/exam/ExamClassConfig.model");
const ExamRollNumber = require("../../models/exam/ExamRollNumber.model");
const ExamMarks = require("../../models/exam/ExamMarks.model");
const ExamMarksSubmission = require("../../models/exam/ExamMarksSubmission.model");
const ExamResult = require("../../models/exam/ExamResult.model");
const Student = require("../../models/Student.model");
const { STUDENT_STATUS } = require("../../constants/studentStatus");
const { EXAM_STATUS, EXAM_STATUS_LABELS } = require("../../constants/examStatus");
const { logExamAudit } = require("./examAudit.service");
const { getTeacherClassId } = require("./examAccess.service");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * Results.
 *  - Subject-wise Pass/Fail against the configured passing marks.
 *  - Absent is shown as Absent (never zero, never Fail).
 *  - Percentage = obtained / maximum * 100.
 *  - Overall total/percentage exist only when the student is present in every
 *    subject; otherwise the overall figure is "Incomplete" (approved rule).
 *  - No overall pass/fail, no grades, no ranks.
 *  - Calculation requires every class's marks to be approved (locked).
 */
class ExamResultService {
  async _exam(examId) {
    if (!mongoose.isValidObjectId(examId)) throwError("Invalid examination ID", 400);
    const exam = await Exam.findById(examId);
    if (!exam) throwError("Examination not found", 404);
    return exam;
  }

  // Reads everything needed to check and calculate, class by class.
  async _gather(exam) {
    const configs = (
      await ExamClassConfig.find({ exam: exam._id })
        .populate("class", "name section displayOrder")
        .lean()
    )
      .filter((c) => c.class)
      .sort(
        (a, b) =>
          (a.class.displayOrder ?? 0) - (b.class.displayOrder ?? 0) ||
          `${a.class.name}${a.class.section}`.localeCompare(`${b.class.name}${b.class.section}`),
      );
    const classIds = configs.map((c) => c.class._id);
    const sessionId = exam.session?._id || exam.session;
    const [rolls, active, subs, marks] = await Promise.all([
      ExamRollNumber.find({ session: sessionId, class: { $in: classIds } })
        .select("class student rollNumber scholarNumber studentName")
        .lean(),
      Student.find({ class: { $in: classIds }, session: sessionId, status: STUDENT_STATUS.ACTIVE })
        .select("class")
        .lean(),
      ExamMarksSubmission.find({ exam: exam._id }).lean(),
      ExamMarks.find({ exam: exam._id }).lean(),
    ]);
    return { configs, rolls, active, subs, marks };
  }

  // Per-class checks. `issues` block calculation; `notes` are informational.
  _check(g) {
    const classes = g.configs.map((c) => {
      const cid = String(c.class._id);
      const activeIds = new Set(g.active.filter((s) => String(s.class) === cid).map((s) => String(s._id)));
      const roster = g.rolls
        .filter((r) => String(r.class) === cid && activeIds.has(String(r.student)))
        .sort((a, b) => a.rollNumber - b.rollNumber);
      const rosterIds = new Set(roster.map((r) => String(r.student)));
      const sub = g.subs.find((x) => String(x.class) === cid);
      const classMarks = g.marks.filter((m) => String(m.class) === cid);
      const issues = [];
      const notes = [];

      if (!sub) issues.push("Marks entry has not started");
      else if (sub.status === "draft") issues.push("Class teacher has not submitted the marks");
      else if (sub.status === "submitted") issues.push("Marks are submitted but not yet approved and locked by the Admin");
      if (roster.length === 0) issues.push("No numbered active students");
      const unnumbered = activeIds.size - roster.length;
      if (unnumbered > 0) issues.push(`${unnumbered} active student(s) have no roll number`);

      let absent = 0;
      for (const s of c.subjects) {
        const rows = classMarks.filter((m) => m.subjectKey === s.nameKey && rosterIds.has(String(m.student)));
        const seen = new Set();
        let missing = roster.length;
        let invalid = 0;
        let dup = 0;
        let abs = 0;
        for (const m of rows) {
          const sid = String(m.student);
          if (seen.has(sid)) {
            dup++;
            continue;
          }
          seen.add(sid);
          if (m.attendance === "absent") {
            abs++;
            missing--;
            if (m.marks !== null && m.marks !== undefined) invalid++;
          } else if (isNum(m.marks)) {
            missing--;
            if (m.marks < 0 || m.marks > s.maxMarks) invalid++;
          }
          // present + no marks stays counted as missing
        }
        if (missing > 0) issues.push(`${s.name}: ${missing} student(s) have no marks`);
        if (invalid > 0) issues.push(`${s.name}: ${invalid} record(s) have invalid marks`);
        if (dup > 0) issues.push(`${s.name}: ${dup} duplicate record(s)`);
        if (abs > 0) notes.push(`${s.name}: ${abs} absent`);
        absent += abs;
      }
      return {
        class: { _id: c.class._id, name: c.class.name, section: c.class.section },
        submissionStatus: sub?.status || "not_started",
        students: roster.length,
        subjects: c.subjects.length,
        absentRecords: absent,
        issues,
        notes,
        ready: issues.length === 0,
      };
    });
    return {
      classes,
      ready: classes.length > 0 && classes.every((c) => c.ready),
      noClasses: classes.length === 0,
    };
  }

  async validate(examId) {
    const exam = await this._exam(examId);
    await exam.populate("session", "name");
    const check = this._check(await this._gather(exam));
    return {
      exam: { _id: exam._id, name: exam.name, status: exam.status, resultsVersion: exam.resultsVersion },
      ...check,
      statusOk: exam.status === EXAM_STATUS.MARKS_SUBMITTED,
    };
  }

  _build(g, check, exam, user) {
    const docs = [];
    const version = (exam.resultsVersion || 0) + 1;
    for (const c of g.configs) {
      const cid = String(c.class._id);
      const ok = check.classes.find((x) => String(x.class._id) === cid);
      if (!ok?.ready) continue;
      const activeIds = new Set(g.active.filter((s) => String(s.class) === cid).map((s) => String(s._id)));
      const roster = g.rolls.filter((r) => String(r.class) === cid && activeIds.has(String(r.student)));
      for (const r of roster) {
        let obtained = 0;
        let max = 0;
        let absentCount = 0;
        const subjects = c.subjects.map((s) => {
          const m = g.marks.find(
            (x) => String(x.class) === cid && x.subjectKey === s.nameKey && String(x.student) === String(r.student),
          );
          max += s.maxMarks;
          if (m.attendance === "absent") {
            absentCount++;
            return {
              subjectKey: s.nameKey, subjectName: s.name, maxMarks: s.maxMarks, passingMarks: s.passingMarks,
              attendance: "absent", marks: null, result: "absent", percentage: null,
            };
          }
          obtained += m.marks;
          return {
            subjectKey: s.nameKey, subjectName: s.name, maxMarks: s.maxMarks, passingMarks: s.passingMarks,
            attendance: "present", marks: m.marks,
            result: m.marks >= s.passingMarks ? "pass" : "fail",
            percentage: s.maxMarks ? round2((m.marks / s.maxMarks) * 100) : null,
          };
        });
        const complete = absentCount === 0;
        docs.push({
          exam: exam._id, class: c.class._id, student: r.student, version, status: "prepared",
          rollNumber: r.rollNumber, scholarNumber: r.scholarNumber, studentName: r.studentName,
          subjects, absentCount, overallComplete: complete,
          totalObtained: complete ? round2(obtained) : null,
          totalMax: complete ? max : null,
          percentage: complete && max ? round2((obtained / max) * 100) : null,
          calculatedBy: user._id,
        });
      }
    }
    return { docs, version };
  }

  async calculate(examId, user, req) {
    const exam = await this._exam(examId);
    if (exam.status !== EXAM_STATUS.MARKS_SUBMITTED) {
      throwError(
        `Results can be calculated only when the examination is Marks Submitted (currently ${EXAM_STATUS_LABELS[exam.status]})`,
        409,
      );
    }
    await exam.populate("session", "name");
    const g = await this._gather(exam);
    const check = this._check(g);
    if (!check.ready) {
      throwError("Marks are incomplete or not approved. Fix the listed issues and try again.", 409);
    }
    const { docs, version } = this._build(g, check, exam, user);
    if (docs.length === 0) throwError("There are no students to calculate results for", 409);

    // Insert first: a version that is not yet referenced by the exam is invisible.
    try {
      await ExamResult.insertMany(docs, { ordered: true });
    } catch (err) {
      await ExamResult.deleteMany({ exam: exam._id, version });
      if (err.code === 11000) throwError("Results were calculated by someone else at the same time. Reload.", 409);
      throw err;
    }
    const moved = await Exam.findOneAndUpdate(
      { _id: exam._id, status: EXAM_STATUS.MARKS_SUBMITTED, resultsVersion: exam.resultsVersion || 0 },
      {
        $set: { status: EXAM_STATUS.RESULTS_PREPARED, resultsVersion: version },
        $push: {
          statusHistory: {
            from: EXAM_STATUS.MARKS_SUBMITTED, to: EXAM_STATUS.RESULTS_PREPARED,
            by: user._id, byName: user.name, reason: `Results calculated (version ${version})`, at: new Date(),
          },
        },
      },
      { new: true },
    );
    if (!moved) {
      await ExamResult.deleteMany({ exam: exam._id, version });
      throwError("The examination changed while results were being calculated. Reload and try again.", 409);
    }
    await logExamAudit({
      exam: exam._id, action: "RESULTS_CALCULATED", user, req,
      after: { version, students: docs.length, classes: check.classes.length },
    });
    return { version, students: docs.length };
  }

  _classSummary(docs) {
    const subj = new Map();
    let incomplete = 0;
    for (const d of docs) {
      if (!d.overallComplete) incomplete++;
      for (const s of d.subjects) {
        const e = subj.get(s.subjectKey) || { key: s.subjectKey, name: s.subjectName, pass: 0, fail: 0, absent: 0 };
        e[s.result]++;
        subj.set(s.subjectKey, e);
      }
    }
    return { students: docs.length, overallIncomplete: incomplete, subjects: [...subj.values()] };
  }

  _currentFilter(exam) {
    return { exam: exam._id, version: exam.resultsVersion };
  }

  async list(examId, classId) {
    const exam = await this._exam(examId);
    if (![EXAM_STATUS.RESULTS_PREPARED, EXAM_STATUS.RESULTS_PUBLISHED].includes(exam.status)) {
      throwError("Results have not been calculated yet", 409);
    }
    const docs = await ExamResult.find(this._currentFilter(exam))
      .populate("class", "name section displayOrder")
      .lean();
    const byClass = new Map();
    for (const d of docs) {
      const k = String(d.class?._id);
      if (!byClass.has(k)) byClass.set(k, { class: d.class, docs: [] });
      byClass.get(k).docs.push(d);
    }
    const classes = [...byClass.values()]
      .sort((a, b) => (a.class.displayOrder ?? 0) - (b.class.displayOrder ?? 0))
      .map((c) => ({
        class: { _id: c.class._id, name: c.class.name, section: c.class.section },
        summary: this._classSummary(c.docs),
        students: classId && String(c.class._id) === String(classId)
          ? c.docs.sort((a, b) => a.rollNumber - b.rollNumber)
          : undefined,
      }));
    return {
      exam: {
        _id: exam._id, name: exam.name, status: exam.status, version: exam.resultsVersion,
        publishedAt: exam.resultsPublishedAt,
      },
      classes,
    };
  }

  async publishSummary(examId) {
    const exam = await this._exam(examId);
    if (exam.status !== EXAM_STATUS.RESULTS_PREPARED) {
      throwError(`Only prepared results can be published (currently ${EXAM_STATUS_LABELS[exam.status]})`, 409);
    }
    await exam.populate("session", "name");
    const check = this._check(await this._gather(exam));
    const docs = await ExamResult.find(this._currentFilter(exam)).lean();
    return {
      exam: { _id: exam._id, name: exam.name, version: exam.resultsVersion },
      ready: check.ready,
      checks: check.classes,
      students: docs.length,
      absentRecords: check.classes.reduce((a, c) => a + c.absentRecords, 0),
      overallIncomplete: docs.filter((d) => !d.overallComplete).length,
    };
  }

  async publish(examId, user, req) {
    const exam = await this._exam(examId);
    if (exam.status !== EXAM_STATUS.RESULTS_PREPARED) {
      throwError(`Only prepared results can be published (currently ${EXAM_STATUS_LABELS[exam.status]})`, 409);
    }
    await exam.populate("session", "name");
    const check = this._check(await this._gather(exam));
    if (!check.ready) throwError("Marks are no longer complete and approved. Review the checks.", 409);
    const count = await ExamResult.countDocuments(this._currentFilter(exam));
    if (count === 0) throwError("There are no calculated results to publish", 409);

    const now = new Date();
    const moved = await Exam.findOneAndUpdate(
      { _id: exam._id, status: EXAM_STATUS.RESULTS_PREPARED, resultsVersion: exam.resultsVersion },
      {
        $set: { status: EXAM_STATUS.RESULTS_PUBLISHED, resultsPublishedAt: now, resultsPublishedBy: user._id },
        $push: {
          statusHistory: {
            from: EXAM_STATUS.RESULTS_PREPARED, to: EXAM_STATUS.RESULTS_PUBLISHED,
            by: user._id, byName: user.name, reason: `Results published (version ${exam.resultsVersion})`, at: now,
          },
        },
      },
      { new: true },
    );
    if (!moved) throwError("The examination changed. Reload and try again.", 409);
    await ExamResult.updateMany(this._currentFilter(exam), { $set: { status: "published", publishedAt: now } });
    await logExamAudit({
      exam: exam._id, action: "RESULTS_PUBLISHED", user, req,
      after: { version: exam.resultsVersion, students: count },
    });
    return { version: exam.resultsVersion, students: count };
  }

  // Controlled correction path: withdraw prepared/published results (reason
  // mandatory). Results are kept as a superseded version; marks can then be
  // unlocked, corrected, locked and results recalculated as a new version.
  async withdraw(examId, { reason }, user, req) {
    const exam = await this._exam(examId);
    const from = exam.status;
    if (![EXAM_STATUS.RESULTS_PREPARED, EXAM_STATUS.RESULTS_PUBLISHED].includes(from)) {
      throwError("There are no prepared or published results to withdraw", 409);
    }
    const moved = await Exam.findOneAndUpdate(
      { _id: exam._id, status: from, resultsVersion: exam.resultsVersion },
      {
        $set: { status: EXAM_STATUS.MARKS_SUBMITTED, resultsPublishedAt: null, resultsPublishedBy: null },
        $push: {
          statusHistory: {
            from, to: EXAM_STATUS.MARKS_SUBMITTED, by: user._id, byName: user.name,
            reason: `Results withdrawn: ${reason.trim()}`, at: new Date(),
          },
        },
      },
      { new: true },
    );
    if (!moved) throwError("The examination changed. Reload and try again.", 409);
    await ExamResult.updateMany(this._currentFilter(exam), { $set: { status: "superseded" } });
    await logExamAudit({
      exam: exam._id, action: "RESULTS_WITHDRAWN", user, req, reason: reason.trim(),
      before: { examStatus: from, version: exam.resultsVersion },
      after: { examStatus: EXAM_STATUS.MARKS_SUBMITTED },
    });
    return { status: EXAM_STATUS.MARKS_SUBMITTED };
  }

  // Class teacher: own class only, and only once published.
  async mine(user, examId) {
    const classId = await getTeacherClassId(user);
    const exam = await this._exam(examId);
    if (exam.status !== EXAM_STATUS.RESULTS_PUBLISHED) throwError("Results have not been published", 409);
    const docs = await ExamResult.find({ ...this._currentFilter(exam), class: classId, status: "published" })
      .sort({ rollNumber: 1 })
      .lean();
    return {
      exam: { _id: exam._id, name: exam.name, publishedAt: exam.resultsPublishedAt },
      summary: this._classSummary(docs),
      students: docs,
    };
  }
}

module.exports = new ExamResultService();
