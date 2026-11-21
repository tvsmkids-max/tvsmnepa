"use strict";

const mongoose = require("mongoose");
const Exam = require("../../models/exam/Exam.model");
const ExamClassConfig = require("../../models/exam/ExamClassConfig.model");
const ExamResult = require("../../models/exam/ExamResult.model");
const ExamMarks = require("../../models/exam/ExamMarks.model");
const ExamRollNumber = require("../../models/exam/ExamRollNumber.model");
const Student = require("../../models/Student.model");
const { STUDENT_STATUS } = require("../../constants/studentStatus");
const { EXAM_STATUS, EXAM_STATUS_LABELS } = require("../../constants/examStatus");
const { isEntered } = require("./examMarksRules");
const examMarks = require("./examMarks.service");
const { rollCode } = require("../../utils/rollCode");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const REPORT_TYPES = Object.freeze([
  "class-results",
  "subject-results",
  "pass-fail",
  "absent",
  "percentage",
  "student-history",
  "marks-pending",
  "marks-completion",
]);

const classLabel = (c) => (c ? `${c.name}${c.section ? ` - ${c.section}` : ""}` : "");
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Examination reports. Every report returns the same generic table shape so
 * the screen, the PDF and the Excel export can all render it:
 *   { title, subtitle, columns: [{ key, label, align }], rows: [...], summary: [{ label, value }] }
 *  - Result reports use PUBLISHED results only.
 *  - Marks-entry reports use the live marks.
 *  - Rows are ordered by class and roll number. There are no rankings, merit
 *    lists or grades beyond the approved grade-only subjects.
 */
class ExamReportService {
  _id(v, name) {
    if (!mongoose.isValidObjectId(v)) throwError(`Invalid ${name}`, 400);
  }

  async _exam(examId) {
    this._id(examId, "examination");
    const exam = await Exam.findById(examId).populate("session", "name");
    if (!exam) throwError("Examination not found", 404);
    return exam;
  }

  async _publishedExam(examId) {
    const exam = await this._exam(examId);
    if (exam.status !== EXAM_STATUS.RESULTS_PUBLISHED) {
      throwError(
        `Result reports need published results (this examination is ${EXAM_STATUS_LABELS[exam.status]})`,
        409,
      );
    }
    return exam;
  }

  async _results(exam, classId) {
    const filter = { exam: exam._id, version: exam.resultsVersion, status: "published" };
    if (classId) {
      this._id(classId, "class");
      filter.class = classId;
    }
    const docs = await ExamResult.find(filter).populate("class", "name section displayOrder").lean();
    return docs
      .filter((d) => d.class)
      .sort(
        (a, b) =>
          (a.class.displayOrder ?? 0) - (b.class.displayOrder ?? 0) ||
          classLabel(a.class).localeCompare(classLabel(b.class)) ||
          a.rollNumber - b.rollNumber,
      );
  }

  _head(exam, title, extra = "") {
    return {
      title,
      subtitle: `${exam.name} · ${exam.session?.name || ""}${extra ? ` · ${extra}` : ""}`.trim(),
    };
  }

  _cell(s) {
    if (!s) return "—";
    if (s.result === "absent") return "AB";
    if (s.result === "graded") return s.grade || "—";
    return s.marks;
  }

  // ── result reports ────────────────────────────────────────────────────
  async classResults(q) {
    const exam = await this._publishedExam(q.examId);
    if (!q.classId) throwError("Select a class", 422);
    const docs = await this._results(exam, q.classId);
    const subjects = docs[0]?.subjects || [];
    const columns = [
      { key: "roll", label: "Roll", align: "right" },
      { key: "scholar", label: "Scholar No." },
      { key: "student", label: "Student" },
      ...subjects.map((s) => ({
        key: s.subjectKey,
        label: s.gradeOnly ? `${s.subjectName} (grade)` : `${s.subjectName} (${s.maxMarks})`,
        align: "center",
      })),
      { key: "total", label: "Total", align: "right" },
      { key: "percentage", label: "%", align: "right" },
    ];
    const rows = docs.map((d) => ({
      roll: rollCode(d.class, d.rollNumber),
      scholar: d.scholarNumber,
      student: d.studentName,
      ...Object.fromEntries(d.subjects.map((s) => [s.subjectKey, this._cell(s)])),
      total: d.overallComplete ? `${d.totalObtained} / ${d.totalMax}` : "Incomplete",
      percentage: d.overallComplete ? d.percentage : "Incomplete",
    }));
    return {
      ...this._head(exam, "Class-wise results", classLabel(docs[0]?.class)),
      columns,
      rows,
      summary: [
        { label: "Students", value: docs.length },
        { label: "Overall incomplete (absent)", value: docs.filter((d) => !d.overallComplete).length },
      ],
    };
  }

  async percentage(q) {
    const exam = await this._publishedExam(q.examId);
    const docs = await this._results(exam, q.classId);
    return {
      ...this._head(exam, "Student percentage report"),
      columns: [
        { key: "class", label: "Class" },
        { key: "roll", label: "Roll", align: "right" },
        { key: "scholar", label: "Scholar No." },
        { key: "student", label: "Student" },
        { key: "total", label: "Total", align: "right" },
        { key: "max", label: "Maximum", align: "right" },
        { key: "percentage", label: "%", align: "right" },
        { key: "status", label: "Status" },
      ],
      rows: docs.map((d) => ({
        class: classLabel(d.class),
        roll: rollCode(d.class, d.rollNumber),
        scholar: d.scholarNumber,
        student: d.studentName,
        total: d.overallComplete ? d.totalObtained : "—",
        max: d.overallComplete ? d.totalMax : "—",
        percentage: d.overallComplete ? d.percentage : "—",
        status: d.overallComplete ? "Complete" : "Incomplete (absent)",
      })),
      summary: [{ label: "Students", value: docs.length }],
    };
  }

  // Subject-wise pass/fail list; optional filters: class, subject, result.
  async passFail(q, onlyAbsent = false) {
    const exam = await this._publishedExam(q.examId);
    const docs = await this._results(exam, q.classId);
    const key = q.subjectKey ? String(q.subjectKey).trim().toLowerCase() : "";
    const want = onlyAbsent ? "absent" : q.result || "";
    const rows = [];
    const totals = { pass: 0, fail: 0, absent: 0 };
    for (const d of docs) {
      for (const s of d.subjects) {
        if (s.gradeOnly && !onlyAbsent) continue;
        if (key && s.subjectKey !== key) continue;
        if (s.result in totals) totals[s.result]++;
        if (want && s.result !== want) continue;
        rows.push({
          class: classLabel(d.class),
          subject: s.subjectName,
          roll: rollCode(d.class, d.rollNumber),
          scholar: d.scholarNumber,
          student: d.studentName,
          marks: s.result === "absent" ? "AB" : s.result === "graded" ? s.grade || "—" : s.marks,
          max: s.gradeOnly ? "—" : s.maxMarks,
          pass: s.gradeOnly ? "—" : s.passingMarks,
          result: { pass: "Pass", fail: "Fail", absent: "Absent", graded: "Graded" }[s.result],
        });
      }
    }
    return {
      ...this._head(exam, onlyAbsent ? "Absent student report" : "Subject-wise pass / fail report"),
      columns: [
        { key: "class", label: "Class" },
        { key: "subject", label: "Subject" },
        { key: "roll", label: "Roll", align: "right" },
        { key: "scholar", label: "Scholar No." },
        { key: "student", label: "Student" },
        { key: "marks", label: "Marks", align: "right" },
        { key: "max", label: "Max", align: "right" },
        { key: "pass", label: "Passing", align: "right" },
        { key: "result", label: "Result" },
      ],
      rows,
      summary: onlyAbsent
        ? [{ label: "Absent records", value: rows.length }]
        : [
            { label: "Pass", value: totals.pass },
            { label: "Fail", value: totals.fail },
            { label: "Absent", value: totals.absent },
          ],
    };
  }

  absent(q) {
    return this.passFail(q, true);
  }

  // Subject performance summary: counts and averages only, no student names.
  async subjectResults(q) {
    const exam = await this._publishedExam(q.examId);
    const docs = await this._results(exam, q.classId);
    const key = q.subjectKey ? String(q.subjectKey).trim().toLowerCase() : "";
    const groups = new Map();
    for (const d of docs) {
      for (const s of d.subjects) {
        if (key && s.subjectKey !== key) continue;
        const k = `${d.class._id}|${s.subjectKey}`;
        if (!groups.has(k)) groups.set(k, { cls: d.class, s, rows: [] });
        groups.get(k).rows.push(s);
      }
    }
    const rows = [...groups.values()].map(({ cls, s, rows: list }) => {
      const base = { class: classLabel(cls), subject: s.subjectName, students: list.length };
      const absent = list.filter((x) => x.result === "absent").length;
      if (s.gradeOnly) {
        const dist = {};
        list.forEach((x) => x.grade && (dist[x.grade] = (dist[x.grade] || 0) + 1));
        return {
          ...base, appeared: list.length - absent, absent, pass: "—", fail: "—", passPct: "—",
          average: "—", highest: "—", lowest: "—", max: "—",
          notes: Object.entries(dist).map(([g, n]) => `${g}: ${n}`).join(", "),
        };
      }
      const scored = list.filter((x) => x.result === "pass" || x.result === "fail");
      const marks = scored.map((x) => x.marks);
      const pass = scored.filter((x) => x.result === "pass").length;
      return {
        ...base,
        appeared: scored.length,
        absent,
        pass,
        fail: scored.length - pass,
        passPct: scored.length ? round2((pass / scored.length) * 100) : "—",
        average: marks.length ? round2(marks.reduce((a, b) => a + b, 0) / marks.length) : "—",
        highest: marks.length ? Math.max(...marks) : "—",
        lowest: marks.length ? Math.min(...marks) : "—",
        max: s.maxMarks,
        notes: "",
      };
    });
    return {
      ...this._head(exam, "Subject performance summary"),
      columns: [
        { key: "class", label: "Class" },
        { key: "subject", label: "Subject" },
        { key: "students", label: "Students", align: "right" },
        { key: "appeared", label: "Appeared", align: "right" },
        { key: "absent", label: "Absent", align: "right" },
        { key: "pass", label: "Pass", align: "right" },
        { key: "fail", label: "Fail", align: "right" },
        { key: "passPct", label: "Pass %", align: "right" },
        { key: "average", label: "Average", align: "right" },
        { key: "highest", label: "Highest", align: "right" },
        { key: "lowest", label: "Lowest", align: "right" },
        { key: "max", label: "Max", align: "right" },
        { key: "notes", label: "Grades" },
      ],
      rows,
      summary: [{ label: "Class-subject rows", value: rows.length }],
    };
  }

  // One student's examination history across every published exam and session.
  async studentHistory(q) {
    const sn = String(q.scholarNumber || "").trim().toUpperCase();
    if (!sn) throwError("Enter a scholar number", 422);
    const students = await Student.find({ scholarNumber: sn }).select("name scholarNumber").lean();
    if (!students.length) throwError("No student found with this scholar number", 404);
    const docs = await ExamResult.find({ student: { $in: students.map((s) => s._id) }, status: "published" })
      .populate("class", "name section")
      .lean();
    const exams = await Exam.find({ _id: { $in: [...new Set(docs.map((d) => String(d.exam)))] } })
      .populate("session", "name startDate")
      .lean();
    const examById = new Map(exams.map((e) => [String(e._id), e]));
    const rows = docs
      .filter((d) => {
        const e = examById.get(String(d.exam));
        return e && e.status === EXAM_STATUS.RESULTS_PUBLISHED && d.version === e.resultsVersion;
      })
      .map((d) => ({ d, e: examById.get(String(d.exam)) }))
      .sort(
        (a, b) =>
          new Date(a.e.session?.startDate || 0) - new Date(b.e.session?.startDate || 0) ||
          new Date(a.e.startDate || 0) - new Date(b.e.startDate || 0),
      )
      .map(({ d, e }) => ({
        session: e.session?.name || "",
        exam: e.name,
        class: classLabel(d.class),
        roll: rollCode(d.class, d.rollNumber),
        subjects: d.subjects
          .map((s) => `${s.subjectName}: ${s.result === "absent" ? "AB" : s.result === "graded" ? s.grade : `${s.marks}/${s.maxMarks}`}`)
          .join(", "),
        total: d.overallComplete ? `${d.totalObtained} / ${d.totalMax}` : "Incomplete",
        percentage: d.overallComplete ? d.percentage : "—",
      }));
    return {
      title: "Student examination history",
      subtitle: `${students[0].name} · Scholar No. ${sn}`,
      columns: [
        { key: "session", label: "Session" },
        { key: "exam", label: "Examination" },
        { key: "class", label: "Class" },
        { key: "roll", label: "Roll", align: "right" },
        { key: "subjects", label: "Subject-wise marks" },
        { key: "total", label: "Total", align: "right" },
        { key: "percentage", label: "%", align: "right" },
      ],
      rows,
      summary: [{ label: "Published examinations", value: rows.length }],
    };
  }

  // ── marks-entry reports (live marks) ─────────────────────────────────
  async marksPending(q) {
    const exam = await this._exam(q.examId);
    const configs = (
      await ExamClassConfig.find({ exam: exam._id, ...(q.classId ? { class: q.classId } : {}) })
        .populate("class", "name section displayOrder")
        .lean()
    ).filter((c) => c.class);
    const classIds = configs.map((c) => c.class._id);
    const sessionId = exam.session._id || exam.session;
    const [rolls, active, marks] = await Promise.all([
      ExamRollNumber.find({ session: sessionId, class: { $in: classIds } }).lean(),
      Student.find({ class: { $in: classIds }, session: sessionId, status: STUDENT_STATUS.ACTIVE })
        .select("name scholarNumber class")
        .lean(),
      ExamMarks.find({ exam: exam._id, class: { $in: classIds } })
        .select("class subjectKey student attendance marks grade")
        .lean(),
    ]);
    const rows = [];
    configs
      .sort((a, b) => (a.class.displayOrder ?? 0) - (b.class.displayOrder ?? 0))
      .forEach((c) => {
        const cid = String(c.class._id);
        const rollOf = new Map(rolls.filter((r) => String(r.class) === cid).map((r) => [String(r.student), r]));
        const roster = active.filter((s) => String(s.class) === cid);
        for (const s of c.subjects) {
          if (q.subjectKey && s.nameKey !== String(q.subjectKey).trim().toLowerCase()) continue;
          const done = new Set(
            marks
              .filter((m) => String(m.class) === cid && m.subjectKey === s.nameKey && isEntered(m))
              .map((m) => String(m.student)),
          );
          roster
            .filter((st) => !done.has(String(st._id)))
            .sort((a, b) => (rollOf.get(String(a._id))?.rollNumber ?? 1e9) - (rollOf.get(String(b._id))?.rollNumber ?? 1e9))
            .forEach((st) =>
              rows.push({
                class: classLabel(c.class),
                subject: s.name,
                roll: rollOf.has(String(st._id)) ? rollCode(c.class, rollOf.get(String(st._id)).rollNumber) : "—",
                scholar: st.scholarNumber,
                student: st.name,
                reason: rollOf.has(String(st._id)) ? "Marks not entered" : "No roll number",
              }),
            );
        }
      });
    return {
      ...this._head(exam, "Marks-entry pending report", EXAM_STATUS_LABELS[exam.status]),
      columns: [
        { key: "class", label: "Class" },
        { key: "subject", label: "Subject" },
        { key: "roll", label: "Roll", align: "right" },
        { key: "scholar", label: "Scholar No." },
        { key: "student", label: "Student" },
        { key: "reason", label: "Pending because" },
      ],
      rows,
      summary: [{ label: "Pending entries", value: rows.length }],
    };
  }

  async marksCompletion(q) {
    const exam = await this._exam(q.examId);
    const m = await examMarks.monitor(q.examId);
    const label = { not_started: "Not started", draft: "In progress", submitted: "Submitted", locked: "Locked" };
    const rows = [];
    for (const c of m.classes) {
      if (q.classId && String(c.class._id) !== String(q.classId)) continue;
      for (const s of c.subjects) {
        if (q.subjectKey && s.key !== String(q.subjectKey).trim().toLowerCase()) continue;
        rows.push({
          class: classLabel(c.class),
          subject: s.name,
          students: s.totalStudents,
          entered: s.entered,
          pending: s.pending,
          absent: s.absent,
          completion: s.completion,
          status: label[c.submission.status] || c.submission.status,
        });
      }
    }
    return {
      ...this._head(exam, "Marks-entry completion report", EXAM_STATUS_LABELS[exam.status]),
      columns: [
        { key: "class", label: "Class" },
        { key: "subject", label: "Subject" },
        { key: "students", label: "Students", align: "right" },
        { key: "entered", label: "Entered", align: "right" },
        { key: "pending", label: "Pending", align: "right" },
        { key: "absent", label: "Absent", align: "right" },
        { key: "completion", label: "Complete %", align: "right" },
        { key: "status", label: "Class status" },
      ],
      rows,
      summary: [
        { label: "Rows", value: rows.length },
        { label: "Fully complete", value: rows.filter((r) => r.pending === 0).length },
      ],
    };
  }

  async run(type, q) {
    if (!REPORT_TYPES.includes(type)) throwError("Unknown report", 404);
    if (type !== "student-history" && !q.examId) throwError("Select an examination", 422);
    switch (type) {
      case "class-results": return this.classResults(q);
      case "subject-results": return this.subjectResults(q);
      case "pass-fail": return this.passFail(q);
      case "absent": return this.absent(q);
      case "percentage": return this.percentage(q);
      case "student-history": return this.studentHistory(q);
      case "marks-pending": return this.marksPending(q);
      default: return this.marksCompletion(q);
    }
  }
}

module.exports = new ExamReportService();
module.exports.REPORT_TYPES = REPORT_TYPES;
