"use strict";

const mongoose = require("mongoose");

const academicSessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Session name is required"],
      trim: true,
      unique: true,
      maxlength: [20, "Session name cannot exceed 20 characters"],
      match: [
        /^\d{4}-\d{2,4}$/,
        "Session name must be in format YYYY-YY or YYYY-YYYY (e.g., 2025-26)",
      ],
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: "End date must be after start date",
      },
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
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

academicSessionSchema.index({ isActive: 1 });
academicSessionSchema.index({ name: 1 });

academicSessionSchema.pre("save", async function (next) {
  if (this.isModified("isActive") && this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isActive: false } },
    );
  }
  next();
});

academicSessionSchema.statics.getActiveSession = async function () {
  return this.findOne({ isActive: true });
};

const AcademicSession = mongoose.model(
  "AcademicSession",
  academicSessionSchema,
);

module.exports = AcademicSession;
