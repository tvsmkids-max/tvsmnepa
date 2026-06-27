"use strict";

const mongoose = require("mongoose");
const { HOLIDAY_TYPE_LIST } = require("../constants/holidayTypes");

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Holiday name is required"],
      trim: true,
      maxlength: [200],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    endDate: {
      type: Date,
      default: null,
    },
    type: {
      type: String,
      enum: HOLIDAY_TYPE_LIST,
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500],
      default: "",
    },
    allowAttendance: {
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

holidaySchema.index({ date: 1, session: 1 });
holidaySchema.index({ session: 1, type: 1 });

holidaySchema.statics.isHoliday = async function (date, sessionId) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return this.findOne({
    session: sessionId,
    $or: [
      { date: { $gte: dayStart, $lte: dayEnd }, endDate: null },
      {
        date: { $lte: dayEnd },
        endDate: { $gte: dayStart },
      },
    ],
  }).lean();
};

module.exports = mongoose.model("Holiday", holidaySchema);
