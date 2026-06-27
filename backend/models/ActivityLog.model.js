"use strict";

const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    userName: {
      type: String,
      required: true,
    },

    userRole: {
      type: String,
      required: true,
    },

    action: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "EXPORT",
        "IMPORT",
        "BACKUP",
        "RESTORE",
        "PROMOTE",
        "LOCK",
        "UNLOCK",
        "MARK_ATTENDANCE",
      ],
      required: true,
    },

    module: {
      type: String,
      enum: [
        "Auth",
        "Student",
        "Class",
        "Teacher",
        "Attendance",
        "Holiday",
        "Session",
        "Settings",
        "Report",
        "Backup",
        "Notification",
      ],
      required: true,
    },

    description: {
      type: String,
      required: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    resourceType: {
      type: String,
      default: null,
    },

    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ module: 1, action: 1 });
activityLogSchema.index({ createdAt: -1 });

activityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 365 },
);

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

module.exports = ActivityLog;
