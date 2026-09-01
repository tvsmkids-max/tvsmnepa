"use strict";

const Holiday = require("../models/Holiday.model");

class HolidayRepository {
  /**
   * Normalize any date input to an IST calendar day stored as
   * YYYY-MM-DDT00:00:00.000Z … T23:59:59.999Z
   * (same pattern as attendance.service _parseDateRange)
   */
  _istDayBounds(dateInput) {
    let dateStr;

    if (
      typeof dateInput === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ) {
      dateStr = dateInput;
    } else {
      const dObj = dateInput ? new Date(dateInput) : new Date();
      const tzOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(dObj.getTime() + tzOffset);
      const y = istTime.getUTCFullYear();
      const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
      const d = String(istTime.getUTCDate()).padStart(2, "0");
      dateStr = `${y}-${m}-${d}`;
    }

    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);
    return { start, end, dateStr };
  }

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

  /**
   * ✅ FIXED: Real DB query with IST day bounds.
   * NEVER call Holiday.isHoliday() — that static is missing/broken.
   *
   * Returns the holiday document if this IST calendar day is a holiday,
   * or null if not.
   */
  async isHoliday(date, sessionId) {
    if (!sessionId) return null;

    const { start: dayStart, end: dayEnd } = this._istDayBounds(date);

    // Match:
    // 1) Single-day: date falls inside [dayStart, dayEnd], endDate null/missing
    // 2) Multi-day: range overlaps this day (date <= dayEnd AND endDate >= dayStart)
    const holiday = await Holiday.findOne({
      session: sessionId,
      $or: [
        {
          endDate: null,
          date: { $gte: dayStart, $lte: dayEnd },
        },
        {
          endDate: { $exists: false },
          date: { $gte: dayStart, $lte: dayEnd },
        },
        {
          date: { $lte: dayEnd },
          endDate: { $gte: dayStart },
        },
      ],
    }).lean();

    return holiday || null;
  }

  async getMonthHolidays(year, month, sessionId) {
    // IST-safe month bounds (not server-local Date)
    const m = String(month).padStart(2, "0");
    const start = new Date(`${year}-${m}-01T00:00:00.000Z`);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const end = new Date(
      `${year}-${m}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`,
    );

    return Holiday.find({
      session: sessionId,
      $or: [
        { date: { $gte: start, $lte: end }, endDate: null },
        { date: { $lte: end }, endDate: { $gte: start } },
        {
          endDate: { $exists: false },
          date: { $gte: start, $lte: end },
        },
      ],
    })
      .sort("date")
      .lean();
  }
}

module.exports = new HolidayRepository();
