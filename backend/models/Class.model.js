"use strict";

const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
      maxlength: [50, "Class name cannot exceed 50 characters"],
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
      maxlength: [20, "Section cannot exceed 20 characters"],
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: [true, "Academic session is required"],
    },
    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },
    assignedTeachers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      },
    ],
    displayOrder: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500],
      default: "",
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

// Unique constraint: name + section + session
classSchema.index({ name: 1, section: 1, session: 1 }, { unique: true });
classSchema.index({ session: 1, isArchived: 1 });
classSchema.index({ classTeacher: 1 });

classSchema.virtual("fullName").get(function () {
  return `${this.name} - ${this.section}`;
});

classSchema.set("toJSON", { virtuals: true });
classSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Class", classSchema);
