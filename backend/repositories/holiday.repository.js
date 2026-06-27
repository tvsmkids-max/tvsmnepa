"use strict";

const Holiday = require("../models/Holiday.model");

class HolidayRepository {
  async findAll(filter = {}) {
    return Holiday.find(filter)
      .sort("date")
      .populate("createdBy", "name")
      .lean();
  }

  async findById(id) {
    return Holiday.findById(id).lean();
  }

  async create(data) {
    const holiday = new Holiday(data);
    await holiday.save();
    return holiday.toObject();
  }

  async updateById(id, data) {
    return Holiday.findByIdAndUpdate(
      id,
      { $set: data },
      {
        new: true,
        runValidators: true,
      },
    ).lean();
  }

  async deleteById(id) {
    return Holiday.findByIdAndDelete(id).lean();
  }

  async isHoliday(date, sessionId) {
    return Holiday.isHoliday(date, sessionId);
  }

  async getMonthHolidays(year, month, sessionId) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return Holiday.find({
      session: sessionId,
      $or: [
        { date: { $gte: start, $lte: end } },
        {
          date: { $lte: end },
          endDate: { $gte: start },
        },
      ],
    })
      .sort("date")
      .lean();
  }
}

module.exports = new HolidayRepository();
