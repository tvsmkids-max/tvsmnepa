"use strict";

const mongoose = require("mongoose");

// The Admin approves a class's ranks (top 10 by Annual percentage) before they
// print. The approval is tied to the Annual result version it was based on, so
// recalculated results automatically invalidate it.
const schema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicSession", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    annualExam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    annualVersion: { type: Number, required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
schema.index({ session: 1, class: 1 }, { unique: true });

module.exports = mongoose.model("ExamRankApproval", schema);
