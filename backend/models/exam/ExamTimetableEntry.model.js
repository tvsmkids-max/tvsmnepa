"use strict";

const mongoose = require("mongoose");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// One row = one subject of one class in one examination.
// date is a plain "YYYY-MM-DD" string and times are "HH:mm" (24h) so there are
// no timezone surprises; both sort and compare correctly as strings.
const examTimetableEntrySchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },
    // Subjects are identified by lower-cased name inside the class configuration.
    subjectKey: { type: String, required: true },
    subjectName: { type: String, required: true, trim: true },
    date: { type: String, required: true, match: DATE_RE },
    startTime: { type: String, required: true, match: TIME_RE },
    endTime: { type: String, required: true, match: TIME_RE },
    remarks: { type: String, trim: true, maxlength: 300, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

examTimetableEntrySchema.pre("validate", function (next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate("endTime", "End time must be after start time");
  }
  next();
});

// Duplicate prevention: a subject appears once per class per examination.
examTimetableEntrySchema.index(
  { exam: 1, class: 1, subjectKey: 1 },
  { unique: true },
);
examTimetableEntrySchema.index({ class: 1, date: 1 });

module.exports = mongoose.model("ExamTimetableEntry", examTimetableEntrySchema);
