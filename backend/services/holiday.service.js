"use strict";

const holidayRepository = require("../repositories/holiday.repository");
const { createAuditLog } = require("../middlewares/audit.middleware");
const Settings = require("../models/Settings.model");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class HolidayService {
  async list(query) {
    const filter = {};
    if (query.session) {
      filter.session = query.session;
    } else {
      const settings = await Settings.getSettings();
      if (settings?.activeSession) {
        filter.session = settings.activeSession;
      }
    }
    if (query.type) filter.type = query.type;

    if (query.month && query.year) {
      return holidayRepository.getMonthHolidays(
        query.year,
        query.month,
        filter.session,
      );
    }

    return holidayRepository.findAll(filter);
  }

  async getById(id) {
    const holiday = await holidayRepository.findById(id);
    if (!holiday) throwError("Holiday not found", 404);
    return holiday;
  }

  async create(data, user, req) {
    const holiday = await holidayRepository.create({
      ...data,
      createdBy: user._id,
    });

    await createAuditLog({
      user,
      action: "CREATE",
      module: "Holiday",
      description: `Created holiday: ${holiday.name}`,
      resourceId: holiday._id,
      resourceType: "Holiday",
      after: holiday,
      req,
    });

    return holiday;
  }

  async update(id, data, user, req) {
    const existing = await holidayRepository.findById(id);
    if (!existing) throwError("Holiday not found", 404);

    const updated = await holidayRepository.updateById(id, data);

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Holiday",
      description: `Updated holiday: ${updated.name}`,
      resourceId: id,
      resourceType: "Holiday",
      before: existing,
      after: updated,
      req,
    });

    return updated;
  }

  async delete(id, user, req) {
    const holiday = await holidayRepository.findById(id);
    if (!holiday) throwError("Holiday not found", 404);

    await holidayRepository.deleteById(id);

    await createAuditLog({
      user,
      action: "DELETE",
      module: "Holiday",
      description: `Deleted holiday: ${holiday.name}`,
      resourceId: id,
      resourceType: "Holiday",
      before: holiday,
      req,
    });

    return true;
  }

  async checkDate(date, sessionId) {
    if (!sessionId) {
      const settings = await Settings.getSettings();
      sessionId = settings?.activeSession;
    }
    if (!sessionId) return { isHoliday: false };

    const holiday = await holidayRepository.isHoliday(date, sessionId);
    return {
      isHoliday: !!holiday,
      holiday: holiday || null,
    };
  }
}

module.exports = new HolidayService();
