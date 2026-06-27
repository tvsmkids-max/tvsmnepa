"use strict";

const mongoose = require("mongoose");
const { ATTENDANCE_STATUS_LIST } = require("../constants/attendanceStatus");

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUS_LIST,
      required: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    editReason: {
      type: String,
      trim: true,
      maxlength: [500],
      default: "",
    },
  },
  { timestamps: true, versionKey: false },
);

// One attendance per student per date
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ class: 1, date: 1 });
attendanceSchema.index({ session: 1, date: 1 });

// Normalize date to start of day before saving
attendanceSchema.pre("save", function (next) {
  if (this.date) {
    const d = new Date(this.date);
    d.setHours(0, 0, 0, 0);
    this.date = d;
  }
  next();
});

module.exports = mongoose.model("Attendance", attendanceSchema);
