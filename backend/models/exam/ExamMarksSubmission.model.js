"use strict";

const mongoose = require("mongoose");

// Marks-entry state of one class in one examination (all subjects together).
const historySchema = new mongoose.Schema(
  {
    action: { type: String, enum: ["submitted", "reopened"], required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    byName: { type: String, default: "" },
    reason: { type: String, default: "" },
  },
  { _id: false },
);

const examMarksSubmissionSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },
    status: { type: String, enum: ["draft", "submitted"], default: "draft" },
    submittedAt: { type: Date, default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reopenCount: { type: Number, default: 0 },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true },
);

examMarksSubmissionSchema.index({ exam: 1, class: 1 }, { unique: true });

module.exports = mongoose.model("ExamMarksSubmission", examMarksSubmissionSchema);
