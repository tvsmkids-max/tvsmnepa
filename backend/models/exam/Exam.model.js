"use strict";

const mongoose = require("mongoose");
const {
  EXAM_TYPE_LIST,
  EXAM_STATUS_LIST,
  EXAM_STATUS,
} = require("../../constants/examStatus");

const statusHistorySchema = new mongoose.Schema(
  {
    from: { type: String, enum: EXAM_STATUS_LIST, default: null },
    to: { type: String, enum: EXAM_STATUS_LIST, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    byName: { type: String, default: "" },
    reason: { type: String, trim: true, maxlength: 500, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const examSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Examination name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    // Lower-cased name used only for the per-session uniqueness index.
    nameKey: { type: String, required: true, select: false },
    examType: {
      type: String,
      enum: EXAM_TYPE_LIST,
      required: [true, "Examination type is required"],
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: [true, "Academic session is required"],
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    instructions: { type: String, trim: true, maxlength: 3000, default: "" },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    status: {
      type: String,
      enum: EXAM_STATUS_LIST,
      default: EXAM_STATUS.DRAFT,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

examSchema.pre("validate", function (next) {
  if (this.name) this.nameKey = this.name.trim().toLowerCase();
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate("endDate", "End date cannot be before start date");
  }
  next();
});

// One exam name per session.
examSchema.index({ session: 1, nameKey: 1 }, { unique: true });
examSchema.index({ session: 1, examType: 1, status: 1 });

module.exports = mongoose.model("Exam", examSchema);
