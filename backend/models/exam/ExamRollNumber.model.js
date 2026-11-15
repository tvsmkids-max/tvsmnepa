"use strict";

const mongoose = require("mongoose");

// Roll numbers belong to (session, class) so a student keeps the same number
// across every examination of that session. Name and scholar number are
// snapshots so historical lists stay readable even if the student record
// changes later.
const historySchema = new mongoose.Schema(
  {
    rollNumber: Number,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, default: "" },
  },
  { _id: false },
);

const examRollNumberSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    scholarNumber: { type: String, required: true },
    studentName: { type: String, required: true },
    rollNumber: { type: Number, required: true, min: 1, max: 9999 },
    source: {
      type: String,
      enum: ["generated", "late_joiner", "manual"],
      default: "generated",
    },
    // Examination that was open when the number was first assigned (reference only).
    assignedForExam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true },
);

examRollNumberSchema.index({ session: 1, class: 1, student: 1 }, { unique: true });
examRollNumberSchema.index({ session: 1, class: 1, rollNumber: 1 }, { unique: true });

module.exports = mongoose.model("ExamRollNumber", examRollNumberSchema);
