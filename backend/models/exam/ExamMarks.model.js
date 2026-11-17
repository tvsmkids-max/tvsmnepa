"use strict";

const mongoose = require("mongoose");

// One row = one student's result for one subject of one class in one exam.
// Absence is stored in `attendance`, never as a zero in `marks`.
const examMarksSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },
    subjectKey: { type: String, required: true },
    subjectName: { type: String, required: true },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    // Snapshots so marksheets stay readable and tied to the exam as it was held.
    rollNumber: { type: Number, required: true },
    scholarNumber: { type: String, default: "" },
    studentName: { type: String, default: "" },
    maxMarks: { type: Number, required: true },
    passingMarks: { type: Number, required: true },

    attendance: {
      type: String,
      enum: ["present", "absent"],
      default: "present",
    },
    // null = not entered yet. Always null when absent.
    marks: { type: Number, default: null, min: 0 },
    remarks: { type: String, trim: true, maxlength: 200, default: "" },

    status: { type: String, enum: ["draft", "submitted"], default: "draft" },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Set when the Admin corrects a submitted value.
    correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    correctedAt: { type: Date, default: null },
    correctionCount: { type: Number, default: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Prevents duplicate marks records.
examMarksSchema.index(
  { exam: 1, class: 1, subjectKey: 1, student: 1 },
  { unique: true },
);
examMarksSchema.index({ exam: 1, class: 1, status: 1 });

module.exports = mongoose.model("ExamMarks", examMarksSchema);
