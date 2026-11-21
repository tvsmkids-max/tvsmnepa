"use strict";

const mongoose = require("mongoose");

// School-wide subject list: classes pick from this instead of typing names.
const examSubjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    nameKey: { type: String, required: true, unique: true },
    displayOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ExamSubject", examSubjectSchema);
