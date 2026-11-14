"use strict";

const mongoose = require("mongoose");
const Class = require("../../models/Class.model");
const Exam = require("../../models/exam/Exam.model");
const ExamClassConfig = require("../../models/exam/ExamClassConfig.model");
const ExamTimetableEntry = require("../../models/exam/ExamTimetableEntry.model");
const { ROLES } = require("../../constants/roles");
const { EXAM_STATUS } = require("../../constants/examStatus");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

// A class teacher must not see an exam while the admin is still preparing it.
const TEACHER_VISIBLE_STATUSES = Object.freeze(
  Object.values(EXAM_STATUS).filter(
    (s) => s !== EXAM_STATUS.DRAFT && s !== EXAM_STATUS.CONFIGURATION_PENDING,
  ),
);

/**
 * The single class a class-login may act on, read from the database record
 * loaded fresh on every request (never from the token or the request body), so
 * a changed assignment takes effect immediately.
 * Returns the class id string, or throws 403.
 */
const getTeacherClassId = async (user) => {
  if (!user || user.role !== ROLES.CLASS) {
    throwError("Access denied.", 403);
  }
  const linked = user.linkedClass?._id || user.linkedClass;
  if (!linked) throwError("No class is linked to this account.", 403);

  const cls = await Class.findById(linked).select("isArchived").lean();
  if (!cls || cls.isArchived) {
    throwError("The class linked to this account is not active.", 403);
  }
  return String(linked);
};

/**
 * Reusable guard for every later exam endpoint that targets (exam, class).
 *  - Admin: any class configured for the exam.
 *  - Class login: ONLY its own linked class, and only once the exam is visible
 *    to teachers. Any other class id is refused no matter what the client sends.
 * Returns { exam, config }.
 */
const assertExamClassAccess = async (user, examId, classId) => {
  if (!mongoose.isValidObjectId(examId)) throwError("Invalid examination ID", 400);
  if (!mongoose.isValidObjectId(classId)) throwError("Invalid class ID", 400);

  if (user?.role === ROLES.CLASS) {
    const own = await getTeacherClassId(user);
    if (own !== String(classId)) {
      throwError("Access denied. You can only access your own class.", 403);
    }
  } else if (user?.role !== ROLES.ADMIN) {
    throwError("Access denied.", 403);
  }

  const exam = await Exam.findById(examId);
  const config = exam
    ? await ExamClassConfig.findOne({ exam: exam._id, class: classId }).lean()
    : null;
  if (!exam || !config) throwError("Examination not found for this class", 404);

  if (
    user.role === ROLES.CLASS &&
    !TEACHER_VISIBLE_STATUSES.includes(exam.status)
  ) {
    throwError("Examination not found for this class", 404);
  }
  return { exam, config };
};

class ExamAccessService {
  // Exams for the logged-in class teacher's own class (class id is never taken
  // from the request).
  async listMine(user) {
    const classId = await getTeacherClassId(user);
    const configs = await ExamClassConfig.find({ class: classId }).lean();
    if (configs.length === 0) return [];

    const exams = await Exam.find({
      _id: { $in: configs.map((c) => c.exam) },
      status: { $in: TEACHER_VISIBLE_STATUSES },
    })
      .populate("session", "name")
      .sort({ startDate: -1, createdAt: -1 })
      .lean();

    const byExam = new Map(configs.map((c) => [String(c.exam), c]));
    const entries = await ExamTimetableEntry.find({
      class: classId,
      exam: { $in: exams.map((e) => e._id) },
    }).lean();
    const ttByExam = new Map();
    for (const t of entries) {
      const k = String(t.exam);
      if (!ttByExam.has(k)) ttByExam.set(k, []);
      ttByExam.get(k).push(t);
    }
    const sortTt = (l = []) =>
      l.sort((a, b) =>
        `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`),
      );
    return exams.map((e) => ({
      _id: e._id,
      name: e.name,
      examType: e.examType,
      status: e.status,
      session: e.session,
      startDate: e.startDate,
      endDate: e.endDate,
      instructions: e.instructions,
      class: classId,
      subjects: byExam.get(String(e._id)).subjects,
      timetable: sortTt(ttByExam.get(String(e._id))),
    }));
  }

  async getMine(user, examId) {
    const classId = await getTeacherClassId(user);
    const { exam, config } = await assertExamClassAccess(user, examId, classId);
    await exam.populate("session", "name");
    const timetable = await ExamTimetableEntry.find({
      exam: exam._id,
      class: classId,
    }).lean();
    timetable.sort((a, b) =>
      `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`),
    );
    return {
      _id: exam._id,
      name: exam.name,
      examType: exam.examType,
      status: exam.status,
      session: exam.session,
      startDate: exam.startDate,
      endDate: exam.endDate,
      instructions: exam.instructions,
      class: classId,
      subjects: config.subjects,
      timetable,
    };
  }
}

module.exports = new ExamAccessService();
module.exports.assertExamClassAccess = assertExamClassAccess;
module.exports.getTeacherClassId = getTeacherClassId;
module.exports.TEACHER_VISIBLE_STATUSES = TEACHER_VISIBLE_STATUSES;
