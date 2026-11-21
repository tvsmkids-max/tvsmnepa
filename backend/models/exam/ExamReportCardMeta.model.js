"use strict";

const mongoose = require("mongoose");

// Per-student, per-session report card fields typed by people (not derived).
const schema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicSession", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    remark: { type: String, default: "", trim: true, maxlength: 120 },
    promotedTo: { type: String, default: "", trim: true, maxlength: 60 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
schema.index({ session: 1, student: 1 }, { unique: true });
schema.index({ session: 1, class: 1 });

module.exports = mongoose.model("ExamReportCardMeta", schema);
