"use strict";

const mongoose = require("mongoose");

// Platform owner (the company that runs the product). Deliberately separate
// from User so school logins, roles and the login dropdown are never affected.
const ownerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 60,
    },
    password: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Owner", ownerSchema);
