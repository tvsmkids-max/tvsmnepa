"use strict";

const mongoose = require("mongoose");
const Exam = require("../../models/exam/Exam.model");
const ExamClassConfig = require("../../models/exam/ExamClassConfig.model");
const ExamTimetableEntry = require("../../models/exam/ExamTimetableEntry.model");
const ExamRollNumber = require("../../models/exam/ExamRollNumber.model");
const Student = require("../../models/Student.model");
const { STUDENT_STATUS } = require("../../constants/studentStatus");
const { EXAM_STATUS } = require("../../constants/examStatus");
const { logExamAudit } = require("./examAudit.service");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const sortTimetable = (list) =>
  [...list].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`),
  );

/**
 * Admit-card data.
 *
 * IMPORTANT (approved requirement): admit cards are NEVER restricted by fee
 * status. Nothing in this module reads fee, transport-fee or payment data, and
 * none must ever be added. Only an inactive student (TC / transferred /
 * inactive) is left out because they are not sitting the examination.
 *
 * Missing information produces warnings; it never blocks generation.
 */
class ExamAdmitCardService {
  async build(examId, scope, user, req) {
    if (!mongoose.isValidObjectId(examId)) throwError("Invalid examination ID", 400);
    const exam = await Exam.findById(examId).populate("session", "name").lean();
    if (!exam) throwError("Examination not found", 404);

    let configs = await ExamClassConfig.find({ exam: exam._id })
      .populate("class", "name section displayOrder")
      .lean();
    configs = configs.filter((c) => c.class);

    if (scope.scope === "className") {
      const wanted = scope.className.trim().toLowerCase();
      configs = configs.filter((c) => c.class.name.trim().toLowerCase() === wanted);
    } else if (scope.scope === "class" || scope.scope === "student") {
      configs = configs.filter((c) => String(c.class._id) === String(scope.classId));
    }
    if (configs.length === 0) {
      throwError("No configured class matches the selection", 404);
    }
    configs.sort(
      (a, b) =>
        (a.class.displayOrder ?? 0) - (b.class.displayOrder ?? 0) ||
        collator.compare(a.class.name, b.class.name) ||
        collator.compare(a.class.section, b.class.section),
    );
    const classIds = configs.map((c) => c.class._id);

    const studentFilter = {
      class: { $in: classIds },
      session: exam.session._id,
      status: STUDENT_STATUS.ACTIVE,
    };
    if (scope.scope === "student") {
      if (!mongoose.isValidObjectId(scope.studentId)) throwError("Invalid student ID", 400);
      studentFilter._id = scope.studentId;
    }

    const [students, rolls, entries] = await Promise.all([
      Student.find(studentFilter).select("name scholarNumber class").lean(),
      ExamRollNumber.find({ session: exam.session._id, class: { $in: classIds } })
        .select("student rollNumber")
        .lean(),
      ExamTimetableEntry.find({ exam: exam._id, class: { $in: classIds } }).lean(),
    ]);
    if (scope.scope === "student" && students.length === 0) {
      throwError("Active student not found in this class for this examination", 404);
    }

    const rollByStudent = new Map(rolls.map((r) => [String(r.student), r.rollNumber]));
    const ttByClass = new Map();
    for (const e of entries) {
      const k = String(e.class);
      if (!ttByClass.has(k)) ttByClass.set(k, []);
      ttByClass.get(k).push(e);
    }

    const classes = {};
    const classWarnings = {};
    for (const c of configs) {
      const id = String(c.class._id);
      const tt = sortTimetable(ttByClass.get(id) || []).map((e) => ({
        subjectName: e.subjectName,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        remarks: e.remarks,
      }));
      classes[id] = { name: c.class.name, section: c.class.section, timetable: tt };
      const w = [];
      if (tt.length === 0) w.push("No timetable entered for this class");
      else if (tt.length < c.subjects.length) {
        w.push(`Timetable incomplete (${tt.length} of ${c.subjects.length} subjects)`);
      }
      classWarnings[id] = w;
    }

    const examWarnings = [];
    if (!exam.startDate || !exam.endDate) examWarnings.push("Examination dates are not set");
    if (exam.status === EXAM_STATUS.DRAFT || exam.status === EXAM_STATUS.CONFIGURATION_PENDING) {
      examWarnings.push("Examination is not yet scheduled");
    }
    if (!exam.instructions) examWarnings.push("No examination instructions entered");

    const order = new Map(configs.map((c, i) => [String(c.class._id), i]));
    const cards = students
      .map((s) => {
        const classId = String(s.class);
        const rollNumber = rollByStudent.get(String(s._id)) ?? null;
        const warnings = [...classWarnings[classId]];
        if (rollNumber === null) warnings.push("Roll number not assigned");
        if (!s.name || !String(s.name).trim()) warnings.push("Student name missing");
        if (!s.scholarNumber) warnings.push("Admission number missing");
        return {
          student: { _id: s._id, name: s.name, scholarNumber: s.scholarNumber },
          classId,
          rollNumber,
          warnings,
        };
      })
      .sort(
        (a, b) =>
          order.get(a.classId) - order.get(b.classId) ||
          (a.rollNumber ?? Infinity) - (b.rollNumber ?? Infinity) ||
          collator.compare(a.student.name, b.student.name),
      );

    const withWarnings = cards.filter((c) => c.warnings.length > 0).length;
    await logExamAudit({
      exam: exam._id,
      classId: scope.scope === "class" || scope.scope === "student" ? scope.classId : null,
      action: "ADMIT_CARDS_GENERATED",
      user,
      req,
      after: { scope: scope.scope, cards: cards.length, withWarnings },
    });

    return {
      exam: {
        _id: exam._id,
        name: exam.name,
        examType: exam.examType,
        status: exam.status,
        session: exam.session,
        startDate: exam.startDate,
        endDate: exam.endDate,
        instructions: exam.instructions || "",
      },
      examWarnings,
      classes,
      cards,
      summary: { total: cards.length, withWarnings },
    };
  }
}

module.exports = new ExamAdmitCardService();
