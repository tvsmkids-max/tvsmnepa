"use strict";

const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // Lower-cased name for duplicate detection inside one configuration.
    nameKey: { type: String, required: true },
    maxMarks: { type: Number, required: true, min: 1, max: 1000 },
    passingMarks: { type: Number, required: true, min: 0 },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: true },
);

const examClassConfigSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    // Denormalised so historical records stay tied to the session even if a
    // class is later archived. Copied from the exam, never edited directly.
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },
    subjects: {
      type: [subjectSchema],
      validate: [
        {
          validator: (v) => Array.isArray(v) && v.length >= 1,
          message: "At least one subject is required",
        },
        {
          validator: (v) => new Set(v.map((s) => s.nameKey)).size === v.length,
          message: "Duplicate subject names are not allowed",
        },
        {
          validator: (v) => v.every((s) => s.passingMarks <= s.maxMarks),
          message: "Passing marks cannot exceed maximum marks",
        },
      ],
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

examClassConfigSchema.index({ exam: 1, class: 1 }, { unique: true });
examClassConfigSchema.index({ class: 1 });

module.exports = mongoose.model("ExamClassConfig", examClassConfigSchema);
