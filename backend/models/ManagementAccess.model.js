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

    // true  -> secretKey holds sha256(key); the real key is never stored.
    // false -> legacy plaintext key (kept working until migrated).
    keyHashed: {
      type: Boolean,
      default: false,
    },

    // First characters of the real key, so an admin can tell links apart.
    keyHint: {
      type: String,
      default: "",
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
managementAccessSchema.statics.hashKey = function (key) {
  return crypto.createHash("sha256").update(String(key)).digest("hex");
};

managementAccessSchema.statics.validateAccess = async function (secretKey) {
  if (!secretKey || typeof secretKey !== "string") return null;

  // A hashed record only matches the hash of the presented key. A legacy
  // plaintext record only matches when it is NOT hashed, so a leaked hash can
  // never be replayed as a key.
  const access = await this.findOne({
    isActive: true,
    $or: [
      { secretKey: this.hashKey(secretKey), keyHashed: true },
      { secretKey, keyHashed: { $ne: true } },
    ],
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
