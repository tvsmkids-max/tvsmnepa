"use strict";

const mongoose = require("mongoose");
const env = require("../config/env");

const workingDaySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      required: true,
    },
    isWorking: { type: Boolean, default: true },
  },
  { _id: false },
);

const settingsSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: [true, "School name is required"],
      trim: true,
      maxlength: [200, "School name cannot exceed 200 characters"],
      default: env.DEFAULT_SCHOOL_NAME,
    },

    schoolLogo: {
      type: String,
      default: null,
    },

    address: {
      type: String,
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"],
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    activeSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      default: null,
    },

    attendanceOpenTime: {
      type: String,
      default: "07:00",
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format. Use HH:MM"],
    },

    attendanceLockTime: {
      type: String,
      default: "23:59",
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format. Use HH:MM"],
    },

    warningPercentage: {
      type: Number,
      default: 75,
      min: [1, "Warning percentage must be at least 1"],
      max: [100, "Warning percentage cannot exceed 100"],
    },

    workingDays: {
      type: [workingDaySchema],
      default: [
        { day: "Monday", isWorking: true },
        { day: "Tuesday", isWorking: true },
        { day: "Wednesday", isWorking: true },
        { day: "Thursday", isWorking: true },
        { day: "Friday", isWorking: true },
        { day: "Saturday", isWorking: true },
        { day: "Sunday", isWorking: false },
      ],
    },

    timezone: {
      type: String,
      default: env.DEFAULT_TIMEZONE,
    },

    academicYearStartMonth: {
      type: Number,
      default: 4,
      min: 1,
      max: 12,
    },

    // ─── SESSION SECURITY (Idle Auto-Logout) ───
    sessionIdleEnabled: {
      type: Boolean,
      default: true,
    },

    sessionIdleTimeout: {
      type: Number,
      default: 15,
      min: [1, "Idle timeout must be at least 1 minute"],
      max: [240, "Idle timeout cannot exceed 240 minutes (4 hours)"],
    },

    sessionIdleWarning: {
      type: Number,
      default: 60,
      min: [10, "Warning duration must be at least 10 seconds"],
      max: [300, "Warning duration cannot exceed 300 seconds (5 minutes)"],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne().populate("activeSession");
  if (!settings) {
    settings = await this.create({
      schoolName: "Setup Required",
    });
    settings = await this.findById(settings._id).populate("activeSession");
  }
  return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);
