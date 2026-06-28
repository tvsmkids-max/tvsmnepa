"use strict";

const mongoose = require("mongoose");

const readBySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },

    type: {
      type: String,
      enum: ["info", "warning", "alert", "success"],
      default: "info",
    },

    targetRole: {
      type: String,
      enum: ["admin", "teacher", "all"],
      default: "all",
    },

    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    readBy: {
      type: [readBySchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ─── AUTO-DELETE FIELD ───
    // Set when last reader marks it read (for TTL cleanup)
    // For broadcast notifications: when all targets have read it
    // For single-user notifications: when that user reads it
    readAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    link: {
      type: String,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ─── INDEXES ───
notificationSchema.index({ targetRole: 1, isActive: 1, createdAt: -1 });
notificationSchema.index({ targetUser: 1, isActive: 1 });
notificationSchema.index({ createdAt: -1 });

// TTL: auto-delete 7 days after readAt is set
notificationSchema.index(
  { readAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 },
);

// TTL: auto-delete after expiresAt
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

notificationSchema.methods.isReadByUser = function (userId) {
  return this.readBy.some(
    (r) => r.user && r.user.toString() === userId.toString(),
  );
};

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
