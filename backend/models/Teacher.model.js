"use strict";

const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User account is required"],
      unique: true,
    },
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [30],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },
    mobile: {
      type: String,
      required: [true, "Mobile is required"],
      trim: true,
      match: [/^[6-9]\d{9}$/, "Invalid 10-digit Indian mobile number"],
    },
    alternateMobile: {
      type: String,
      trim: true,
      default: "",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: [true, "Gender is required"],
    },
    dob: {
      type: Date,
      default: null,
    },
    qualification: {
      type: String,
      trim: true,
      maxlength: [200],
      default: "",
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100],
      default: "Teacher",
    },
    joinDate: {
      type: Date,
      required: [true, "Join date is required"],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500],
      default: "",
    },
    photo: {
      type: String,
      default: null,
    },
    assignedClasses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
    ],
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
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

teacherSchema.index({ employeeId: 1 });
teacherSchema.index({ user: 1 });
teacherSchema.index({ session: 1, isActive: 1 });
teacherSchema.index({ name: "text", employeeId: "text", email: "text" });

module.exports = mongoose.model("Teacher", teacherSchema);
