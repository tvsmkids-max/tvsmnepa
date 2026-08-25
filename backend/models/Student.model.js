"use strict";

const mongoose = require("mongoose");
const { STUDENT_STATUS_LIST } = require("../constants/studentStatus");

const studentSchema = new mongoose.Schema(
  {
    scholarNumber: {
      type: String,
      required: [true, "Scholar number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [30],
    },
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
      maxlength: [100],
    },
    fatherName: {
      type: String,
      required: [true, "Father's name is required"],
      trim: true,
      maxlength: [100],
    },
    motherName: {
      type: String,
      required: [true, "Mother's name is required"],
      trim: true,
      maxlength: [100],
    },
    mobile: {
      type: String,
      required: false,
      trim: true,
      default: "",
      validate: {
        validator: function (v) {
          if (!v || v === "") return true;
          return /^[6-9]\d{9}$/.test(v);
        },
        message: "Invalid mobile number. Must be 10 digits starting with 6-9",
      },
    },
    alternateMobile: {
      type: String,
      trim: true,
      default: "",
    },
    dob: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: [true, "Gender is required"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: [500],
    },
    photo: {
      type: String,
      default: null,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class is required"],
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },
    admissionDate: {
      type: Date,
      required: [true, "Admission date is required"],
    },
    status: {
      type: String,
      enum: STUDENT_STATUS_LIST,
      default: "Active",
      required: true,
    },
    statusRemark: {
      type: String,
      trim: true,
      maxlength: [500],
      default: "",
    },
    statusDate: {
      type: Date,
      default: null,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", ""],
      default: "",
    },
    category: {
      type: String,
      enum: ["General", "OBC", "SC", "ST", "EWS", ""],
      default: "",
    },
    religion: {
      type: String,
      trim: true,
      default: "",
    },
    aadharNumber: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

// ═══════════════════════════════════════════════════════════════════
//  INDEXES (rollNumber indexes completely removed)
// ═══════════════════════════════════════════════════════════════════
studentSchema.index({ scholarNumber: 1 });
studentSchema.index({ class: 1, session: 1, status: 1 });
studentSchema.index({
  name: "text",
  fatherName: "text",
  scholarNumber: "text",
  mobile: "text",
});

module.exports = mongoose.model("Student", studentSchema);
