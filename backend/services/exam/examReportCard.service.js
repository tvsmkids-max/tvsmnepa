"use strict";

const mongoose = require("mongoose");
const Exam = require("../../models/exam/Exam.model");
const ExamClassConfig = require("../../models/exam/ExamClassConfig.model");
const ExamResult = require("../../models/exam/ExamResult.model");
const ExamReportCardMeta = require("../../models/exam/ExamReportCardMeta.model");
const ExamRankApproval = require("../../models/exam/ExamRankApproval.model");
const Student = require("../../models/Student.model");
const Class = require("../../models/Class.model");
const Attendance = require("../../models/Attendance.model");
const { EXAM_TYPES, EXAM_STATUS } = require("../../constants/examStatus");
const { ATTENDANCE_STATUS } = require("../../constants/attendanceStatus");
const school = require("../../constants/schoolProfile");
const { logExamAudit } = require("./examAudit.service");
const { getTeacherClassId } = require("./examAccess.service");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const TYPES = [EXAM_TYPES.QUARTERLY, EXAM_TYPES.HALF_YEARLY, EXAM_TYPES.ANNUAL];
const MAX_RANK = 10;

/**
 * Progress report card data (one card per student per session).
 *  - Only PUBLISHED results are used.
 *  - Grade-only subjects print their grade; they never count in totals.
 *  - RESULT: from the Annual exam. PASS when no scored subject failed, FAIL
 *    otherwise, INCOMPLETE when the student was absent in a scored subject.
 *  - RANK: only ranks 1..10 by Annual percentage within the class, printed only
 *    after the Admin approves them. Everybody else shows "-". Ties share a rank.
 *  - ATTENDANCE: read-only from existing attendance records.
 */
class ExamReportCardService {
  _ids(sessionId, classId) {
    if (!mongoose.isValidObjectId(sessionId)) throwError("Invalid session", 400);
    if (!mongoose.isValidObjectId(classId)) throwError("Invalid class", 400);
  }

  async _publishedExams(sessionId) {
    const exams = await Exam.find({
      session: sessionId,
      examType: { $in: TYPES },
      status: EXAM_STATUS.RESULTS_PUBLISHED,
    })
      .select("name examType resultsVersion")
      .lean();
    // One exam per type is expected; if several exist the latest is used.
    const byType = new Map();
    for (const e of exams) byType.set(e.examType, e);
    return byType;
  }

  _rank(annualDocs) {
    const scored = annualDocs
      .filter((d) => d.overallComplete && d.percentage !== null)
      .sort((a, b) => b.percentage - a.percentage);
    const ranks = new Map();
    let rank = 0;
    scored.forEach((d, i) => {
      if (i === 0 || d.percentage !== scored[i - 1].percentage) rank = i + 1;
      if (rank <= MAX_RANK) ranks.set(String(d.student), rank);
    });
    return ranks;
  }

  _result(annual) {
    if (!annual) return null;
    const scored = annual.subjects.filter((s) => !s.gradeOnly);
    if (scored.some((s) => s.result === "absent")) return "INCOMPLETE";
    return scored.some((s) => s.result === "fail") ? "FAIL" : "PASS";
  }

  async _attendance(sessionId, classId, studentIds) {
    const [days, present] = await Promise.all([
      Attendance.aggregate([
        { $match: { class: new mongoose.Types.ObjectId(classId), session: new mongoose.Types.ObjectId(sessionId) } },
        { $group: { _id: "$date" } },
        { $count: "n" },
      ]),
      Attendance.aggregate([
        {
          $match: {
            class: new mongoose.Types.ObjectId(classId),
            session: new mongoose.Types.ObjectId(sessionId),
            student: { $in: studentIds.map((i) => new mongoose.Types.ObjectId(String(i))) },
            status: ATTENDANCE_STATUS.PRESENT,
          },
        },
        { $group: { _id: "$student", n: { $sum: 1 } } },
      ]),
    ]);
    return {
      total: days[0]?.n || 0,
      present: new Map(present.map((p) => [String(p._id), p.n])),
    };
  }

  async data(sessionId, classId) {
    this._ids(sessionId, classId);
    const cls = await Class.findById(classId).select("name section").lean();
    if (!cls) throwError("Class not found", 404);
    const byType = await this._publishedExams(sessionId);

    const base = {
      school,
      session: sessionId,
      class: { _id: cls._id, name: cls.name, section: cls.section },
      exams: TYPES.map((t) => ({
        type: t,
        published: byType.has(t),
        name: byType.get(t)?.name || null,
      })),
    };
    if (byType.size === 0) return { ...base, subjects: [], students: [], ranksApproved: false, ranksStale: false };

    const exams = [...byType.values()];
    const [docs, configs] = await Promise.all([
      ExamResult.find({
        $or: exams.map((e) => ({ exam: e._id, version: e.resultsVersion, class: classId, status: "published" })),
      }).lean(),
      ExamClassConfig.find({ exam: { $in: exams.map((e) => e._id) }, class: classId }).lean(),
    ]);

    // Subjects in the order of the first configured exam; later exams may add more.
    const subjects = [];
    const seen = new Set();
    for (const t of TYPES) {
      const e = byType.get(t);
      const cfg = e && configs.find((c) => String(c.exam) === String(e._id));
      for (const s of cfg?.subjects || []) {
        if (seen.has(s.nameKey)) continue;
        seen.add(s.nameKey);
        subjects.push({ key: s.nameKey, name: s.name, gradeOnly: !!s.gradeOnly });
      }
    }
    const maxima = {};
    for (const t of TYPES) {
      const e = byType.get(t);
      const cfg = e && configs.find((c) => String(c.exam) === String(e._id));
      maxima[t] = cfg
        ? Object.fromEntries(
            cfg.subjects.map((s) => [
              s.nameKey,
              { max: s.maxMarks, internalMax: s.internalMax || 0, written: s.maxMarks - (s.internalMax || 0) },
            ]),
          )
        : {};
    }

    const typeOf = new Map(exams.map((e) => [String(e._id), e.examType]));
    const perStudent = new Map();
    for (const d of docs) {
      const k = String(d.student);
      if (!perStudent.has(k)) perStudent.set(k, {});
      perStudent.get(k)[typeOf.get(String(d.exam))] = d;
    }
    const ids = [...perStudent.keys()];
    const [students, metas, att, approval] = await Promise.all([
      Student.find({ _id: { $in: ids } }).select("name scholarNumber fatherName motherName dob").lean(),
      ExamReportCardMeta.find({ session: sessionId, student: { $in: ids } }).lean(),
      this._attendance(sessionId, classId, ids),
      ExamRankApproval.findOne({ session: sessionId, class: classId }).lean(),
    ]);
    const stuById = new Map(students.map((s) => [String(s._id), s]));
    const metaById = new Map(metas.map((m) => [String(m.student), m]));

    const annualExam = byType.get(EXAM_TYPES.ANNUAL);
    const annualDocs = docs.filter((d) => annualExam && String(d.exam) === String(annualExam._id));
    const ranks = this._rank(annualDocs);
    const ranksApproved =
      !!approval &&
      !!annualExam &&
      String(approval.annualExam) === String(annualExam._id) &&
      approval.annualVersion === annualExam.resultsVersion;

    const cards = ids
      .map((id) => {
        const st = stuById.get(id) || {};
        const r = perStudent.get(id);
        const first = r[EXAM_TYPES.ANNUAL] || r[EXAM_TYPES.HALF_YEARLY] || r[EXAM_TYPES.QUARTERLY];
        const m = metaById.get(id);
        const rank = ranks.get(id) ?? null;
        const cell = (type, key) => {
          const sub = r[type]?.subjects.find((x) => x.subjectKey === key);
          if (!sub) return null;
          return {
            result: sub.result,
            marks: sub.marks,
            writtenMarks: sub.writtenMarks ?? null,
            internalMarks: sub.internalMarks ?? null,
            grade: sub.grade ?? null,
          };
        };
        return {
          studentId: id,
          name: st.name || first.studentName,
          scholarNumber: st.scholarNumber || first.scholarNumber,
          rollNumber: first.rollNumber,
          fatherName: st.fatherName || "",
          motherName: st.motherName || "",
          dob: st.dob || null,
          result: this._result(r[EXAM_TYPES.ANNUAL]),
          marks: Object.fromEntries(subjects.map((s) => [s.key, Object.fromEntries(TYPES.map((t) => [t, cell(t, s.key)]))])),
          totals: Object.fromEntries(
            TYPES.map((t) => [
              t,
              r[t]
                ? {
                    complete: r[t].overallComplete,
                    obtained: r[t].totalObtained,
                    max: r[t].totalMax,
                    percentage: r[t].percentage,
                  }
                : null,
            ]),
          ),
          rank,
          printRank: ranksApproved ? rank : null,
          attendance: { present: att.present.get(id) || 0, total: att.total },
          remark: m?.remark || "",
          promotedTo: m?.promotedTo || "",
        };
      })
      .sort((a, b) => a.rollNumber - b.rollNumber);

    return {
      ...base,
      subjects,
      maxima,
      students: cards,
      ranksApproved,
      // Approved earlier but the Annual result changed since.
      ranksStale: !!approval && !ranksApproved,
    };
  }

  async _anyExam(sessionId) {
    const byType = await this._publishedExams(sessionId);
    const e = byType.get(EXAM_TYPES.ANNUAL) || [...byType.values()][0];
    if (!e) throwError("No published results exist for this session yet", 409);
    return e;
  }

  async _saveMeta(sessionId, classId, entries, fields, user, req) {
    this._ids(sessionId, classId);
    const exam = await this._anyExam(sessionId);
    const ids = entries.map((e) => String(e.studentId));
    const valid = await Student.find({ _id: { $in: ids }, class: classId, session: sessionId })
      .select("_id")
      .lean();
    const ok = new Set(valid.map((s) => String(s._id)));
    const bad = ids.filter((i) => !ok.has(i));
    if (bad.length) throwError("Some students do not belong to this class and session", 400);

    const existing = await ExamReportCardMeta.find({ session: sessionId, student: { $in: ids } }).lean();
    const prev = new Map(existing.map((m) => [String(m.student), m]));
    const changes = [];
    const ops = [];
    for (const e of entries) {
      const before = prev.get(String(e.studentId));
      const set = {};
      for (const f of fields) {
        if (e[f] === undefined) continue;
        const v = String(e[f]).trim();
        if ((before?.[f] || "") !== v) set[f] = v;
      }
      if (!Object.keys(set).length) continue;
      changes.push({
        student: String(e.studentId),
        before: Object.fromEntries(Object.keys(set).map((f) => [f, before?.[f] || ""])),
        after: set,
      });
      ops.push({
        updateOne: {
          filter: { session: sessionId, student: e.studentId },
          update: { $set: { ...set, class: classId, updatedBy: user._id } },
          upsert: true,
        },
      });
    }
    if (!ops.length) throwError("No changes to save", 400);
    await ExamReportCardMeta.bulkWrite(ops, { ordered: true });
    await logExamAudit({
      exam: exam._id, classId, action: "REPORT_CARD_FIELDS_SAVED", user, req,
      after: { fields, changes },
    });
    return { saved: ops.length };
  }

  // Admin: remark and promoted-to.
  saveAdmin(sessionId, classId, entries, user, req) {
    return this._saveMeta(sessionId, classId, entries, ["remark", "promotedTo"], user, req);
  }

  // Class teacher: remark only, own class only.
  async saveRemarks(user, sessionId, entries, req) {
    const classId = await getTeacherClassId(user);
    return this._saveMeta(sessionId, classId, entries, ["remark"], user, req);
  }

  async dataForTeacher(user, sessionId) {
    const classId = await getTeacherClassId(user);
    return this.data(sessionId, classId);
  }

  async approveRanks(sessionId, classId, user, req) {
    this._ids(sessionId, classId);
    const byType = await this._publishedExams(sessionId);
    const annual = byType.get(EXAM_TYPES.ANNUAL);
    if (!annual) throwError("Ranks need published Annual exam results", 409);
    const docs = await ExamResult.find({
      exam: annual._id, version: annual.resultsVersion, class: classId, status: "published",
    }).lean();
    const ranks = this._rank(docs);
    if (ranks.size === 0) throwError("No student has a complete Annual result to rank", 409);
    await ExamRankApproval.findOneAndUpdate(
      { session: sessionId, class: classId },
      { $set: { annualExam: annual._id, annualVersion: annual.resultsVersion, approvedBy: user._id, approvedAt: new Date() } },
      { upsert: true, new: true },
    );
    await logExamAudit({
      exam: annual._id, classId, action: "RANKS_APPROVED", user, req,
      after: { ranked: ranks.size, annualVersion: annual.resultsVersion },
    });
    return { ranked: ranks.size };
  }

  async revokeRanks(sessionId, classId, user, req) {
    this._ids(sessionId, classId);
    const removed = await ExamRankApproval.findOneAndDelete({ session: sessionId, class: classId });
    if (!removed) throwError("Ranks are not approved", 409);
    await logExamAudit({
      exam: removed.annualExam, classId, action: "RANKS_REVOKED", user, req,
      before: { annualVersion: removed.annualVersion },
    });
    return { revoked: true };
  }
}

module.exports = new ExamReportCardService();
