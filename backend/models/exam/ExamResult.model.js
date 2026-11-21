"use strict";

const mongoose = require("mongoose");

const subjectResultSchema = new mongoose.Schema(
  {
    subjectKey: { type: String, required: true },
    subjectName: { type: String, required: true },
    maxMarks: { type: Number, required: true },
    passingMarks: { type: Number, required: true },
    attendance: { type: String, enum: ["present", "absent"], required: true },
    // null when absent. Absent is never stored as zero.
    marks: { type: Number, default: null },
    writtenMarks: { type: Number, default: null },
    internalMarks: { type: Number, default: null },
    oralMarks: { type: Number, default: null },
    internalMax: { type: Number, default: 0 },
    oralMax: { type: Number, default: 0 },
    gradeOnly: { type: Boolean, default: false },
    grade: { type: String, default: null },
    // "graded" = grade-only subject (no pass/fail).
    result: { type: String, enum: ["pass", "fail", "absent", "graded"], required: true },
    // Subject percentage; null when absent.
    percentage: { type: Number, default: null },
  },
  { _id: false },
);

// One calculated result per student per exam per calculation `version`.
// Older versions are kept as "superseded" so a published result is never
// silently overwritten.
const examResultSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    version: { type: Number, required: true },
    status: {
      type: String,
      enum: ["prepared", "published", "superseded"],
      default: "prepared",
    },
    rollNumber: { type: Number, required: true },
    scholarNumber: { type: String, default: "" },
    studentName: { type: String, default: "" },
    subjects: { type: [subjectResultSchema], default: [] },
    absentCount: { type: Number, default: 0 },
    // Overall figures exist only when the student was present in every subject
    // (approved rule: absent in any subject => overall shown as Incomplete).
    overallComplete: { type: Boolean, default: false },
    totalObtained: { type: Number, default: null },
    totalMax: { type: Number, default: null },
    percentage: { type: Number, default: null },
    calculatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    calculatedAt: { type: Date, default: Date.now },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

examResultSchema.index({ exam: 1, student: 1, version: 1 }, { unique: true });
examResultSchema.index({ exam: 1, class: 1, version: 1 });

module.exports = mongoose.model("ExamResult", examResultSchema);
