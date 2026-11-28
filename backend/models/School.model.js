"use strict";

const mongoose = require("mongoose");

const SCHOOL_STATUS = Object.freeze({ ACTIVE: "active", SUSPENDED: "suspended" });

// A school that uses the product. Phase 2 only creates the record and its
// public identity; data separation between schools comes in a later phase.
const schoolSchema = new mongoose.Schema(
  {
    // Login code, e.g. "TVSM": uppercase letters/digits, unique.
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z0-9]{2,12}$/,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    // Printed on documents: name split over up to two lines.
    nameLines: { type: [String], default: [] },
    logo: { type: String, default: null }, // data URL (png/jpeg/webp)
    principalSignature: { type: String, default: null }, // data URL
    address: { type: String, trim: true, maxlength: 500, default: "" },
    recognition: { type: String, trim: true, maxlength: 200, default: "" },
    udiseCode: { type: String, trim: true, maxlength: 30, default: "" },
    affiliationCode: { type: String, trim: true, maxlength: 30, default: "" },
    footer: { type: String, trim: true, maxlength: 300, default: "" },
    phone: { type: String, trim: true, maxlength: 40, default: "" },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: "" },
    status: { type: String, enum: Object.values(SCHOOL_STATUS), default: SCHOOL_STATUS.ACTIVE },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", default: null },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("School", schoolSchema);
module.exports.SCHOOL_STATUS = SCHOOL_STATUS;
