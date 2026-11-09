"use strict";

const mongoose = require("mongoose");
const crypto = require("crypto");

const KEY_PREFIX = "tvsm_ro_";

const externalApiKeySchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, "API key label is required"],
      trim: true,
      maxlength: [100, "Label cannot exceed 100 characters"],
      default: "External MERN Website",
    },

    // Safe display prefix (e.g. "tvsm_ro_8f3a91c2...") — raw key is never persisted
    keyPrefix: {
      type: String,
      required: true,
      trim: true,
    },

    // SHA-256 hash of the raw API key
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      select: false,
    },

    // Optional list of allowed Origin URLs (empty = unrestricted / server-to-server)
    allowedOrigins: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    requestCount: {
      type: Number,
      default: 0,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },

    lastUsedIp: {
      type: String,
      default: null,
    },

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

externalApiKeySchema.statics.hashKey = function (rawKey) {
  return crypto.createHash("sha256").update(String(rawKey)).digest("hex");
};

externalApiKeySchema.statics.generateKeyPair = function () {
  const randomPart = crypto.randomBytes(24).toString("hex");
  const rawKey = `${KEY_PREFIX}${randomPart}`;
  const keyPrefix = `${KEY_PREFIX}${randomPart.slice(0, 8)}...${randomPart.slice(-4)}`;
  const keyHash = this.hashKey(rawKey);
  return { rawKey, keyPrefix, keyHash };
};

externalApiKeySchema.statics.validateKey = async function (rawKey) {
  if (!rawKey || typeof rawKey !== "string") return null;

  const keyHash = this.hashKey(rawKey.trim());
  const keyDoc = await this.findOne({
    keyHash,
    isActive: true,
  }).lean();

  if (!keyDoc) return null;

  if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
    return null;
  }

  return keyDoc;
};

externalApiKeySchema.statics.logUsage = async function (keyId, ip) {
  return this.updateOne(
    { _id: keyId },
    {
      $inc: { requestCount: 1 },
      $set: {
        lastUsedAt: new Date(),
        lastUsedIp: ip || null,
      },
    },
  );
};

module.exports = mongoose.model("ExternalApiKey", externalApiKeySchema);
