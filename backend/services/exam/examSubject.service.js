"use strict";

const mongoose = require("mongoose");
const ExamSubject = require("../../models/exam/ExamSubject.model");
const ExamClassConfig = require("../../models/exam/ExamClassConfig.model");
const { logExamAudit } = require("./examAudit.service");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};
const keyOf = (s) => String(s).trim().replace(/\s+/g, " ").toLowerCase();
const clean = (s) => String(s).trim().replace(/\s+/g, " ");

class ExamSubjectService {
  /**
   * The list. Subject names already used in any examination are imported once
   * (missing ones only), so the dropdown is complete from day one.
   */
  async list() {
    const used = await ExamClassConfig.aggregate([
      { $unwind: "$subjects" },
      { $group: { _id: "$subjects.nameKey", name: { $first: "$subjects.name" } } },
    ]);
    if (used.length) {
      await ExamSubject.bulkWrite(
        used.map((u) => ({
          updateOne: {
            filter: { nameKey: keyOf(u._id) },
            update: { $setOnInsert: { name: clean(u.name), nameKey: keyOf(u._id) } },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }
    return ExamSubject.find({}).sort({ displayOrder: 1, name: 1 }).lean();
  }

  async create(name, user, req) {
    const nameKey = keyOf(name);
    if (!nameKey) throwError("Subject name is required", 400);
    try {
      const doc = await ExamSubject.create({ name: clean(name), nameKey, createdBy: user._id });
      await logExamAudit({ action: "EXAM_SUBJECT_ADDED", user, req, after: { name: doc.name } });
      return doc;
    } catch (err) {
      if (err.code === 11000) throwError(`"${clean(name)}" is already in the subject list`, 409);
      throw err;
    }
  }

  async rename(id, name, user, req) {
    if (!mongoose.isValidObjectId(id)) throwError("Invalid subject ID", 400);
    const doc = await ExamSubject.findById(id);
    if (!doc) throwError("Subject not found", 404);
    const before = doc.name;
    doc.name = clean(name);
    doc.nameKey = keyOf(name);
    try {
      await doc.save();
    } catch (err) {
      if (err.code === 11000) throwError(`"${clean(name)}" is already in the subject list`, 409);
      throw err;
    }
    await logExamAudit({ action: "EXAM_SUBJECT_RENAMED", user, req, before: { name: before }, after: { name: doc.name } });
    return doc;
  }

  async remove(id, user, req) {
    if (!mongoose.isValidObjectId(id)) throwError("Invalid subject ID", 400);
    const doc = await ExamSubject.findById(id);
    if (!doc) throwError("Subject not found", 404);
    const inUse = await ExamClassConfig.exists({ "subjects.nameKey": doc.nameKey });
    if (inUse) {
      throwError(`"${doc.name}" is used in an examination and cannot be removed from the list`, 409);
    }
    await doc.deleteOne();
    await logExamAudit({ action: "EXAM_SUBJECT_REMOVED", user, req, before: { name: doc.name } });
    return { removed: true };
  }
}

module.exports = new ExamSubjectService();
