"use strict";

const mongoose = require("mongoose");
const crypto = require("crypto");

const managementAccessSchema = new mongoose.Schema(
  {
    // The secret key used in URL
    secretKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Human-readable label (for admin to identify)
    label: {
      type: String,
      default: "Management Dashboard",
      trim: true,
      maxlength: 100,
    },

    // Is this key currently valid?
    isActive: {
      type: Boolean,
      default: true,
    },

    // Track total accesses (analytics)
    accessCount: {
      type: Number,
      default: 0,
    },

    // Last accessed timestamp
    lastAccessedAt: {
      type: Date,
      default: null,
    },

    // Last IP that accessed (basic security tracking)
    lastAccessIp: {
      type: String,
      default: null,
    },

    // Optional expiry (null = never expires)
    expiresAt: {
      type: Date,
      default: null,
    },

    // Who created this URL
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ═══════════════════════════════════════════════════════════════════
//  STATIC METHOD: Generate a random secret key
// ═══════════════════════════════════════════════════════════════════
managementAccessSchema.statics.generateSecretKey = function () {
  // 24 characters, URL-safe (alphanumeric)
  return crypto
    .randomBytes(18)
    .toString("base64")
    .replace(/[+/=]/g, (c) => (c === "+" ? "-" : c === "/" ? "_" : ""));
};

// ═══════════════════════════════════════════════════════════════════
//  STATIC METHOD: Validate access key
// ═══════════════════════════════════════════════════════════════════
managementAccessSchema.statics.validateAccess = async function (secretKey) {
  if (!secretKey || typeof secretKey !== "string") return null;

  const access = await this.findOne({
    secretKey,
    isActive: true,
  }).lean();

  if (!access) return null;

  // Check expiry
  if (access.expiresAt && new Date(access.expiresAt) < new Date()) {
    return null;
  }

  return access;
};

// ═══════════════════════════════════════════════════════════════════
//  STATIC METHOD: Log an access
// ═══════════════════════════════════════════════════════════════════
managementAccessSchema.statics.logAccess = async function (accessId, ip) {
  return this.updateOne(
    { _id: accessId },
    {
      $inc: { accessCount: 1 },
      $set: {
        lastAccessedAt: new Date(),
        lastAccessIp: ip || null,
      },
    },
  );
};

module.exports = mongoose.model("ManagementAccess", managementAccessSchema);
