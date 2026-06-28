"use strict";

const holidayRepository = require("../repositories/holiday.repository");
const { createAuditLog } = require("../middlewares/audit.middleware");
const Settings = require("../models/Settings.model");
const notificationService = require("./notification.service");
const logger = require("../utils/logger");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

    // ─── NOTIFICATION: Notify everyone about new holiday ───
    try {
      const dateRange = holiday.endDate
        ? `${formatDate(holiday.date)} to ${formatDate(holiday.endDate)}`
        : formatDate(holiday.date);

      await notificationService.notifyAll({
        title: `🏖️ New Holiday: ${holiday.name}`,
        message: `${holiday.type} on ${dateRange}${
          holiday.description ? ` — ${holiday.description}` : ""
        }`,
        type: "info",
        link: "/holidays",
        metadata: {
          holidayId: holiday._id,
          name: holiday.name,
          date: holiday.date,
          endDate: holiday.endDate,
          type: holiday.type,
        },
        createdBy: user._id,
      });
    } catch (err) {
      logger.error(`[Holiday] Notification failed: ${err.message}`);
    }

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

    // ─── NOTIFICATION: Notify on date/name change ───
    try {
      const nameChanged = data.name && data.name !== existing.name;
      const dateChanged =
        data.date &&
        new Date(data.date).getTime() !== new Date(existing.date).getTime();

      if (nameChanged || dateChanged) {
        await notificationService.notifyAll({
          title: `📝 Holiday Updated: ${updated.name}`,
          message: `Holiday "${existing.name}" has been updated. New date: ${formatDate(updated.date)}`,
          type: "info",
          link: "/holidays",
          metadata: {
            holidayId: updated._id,
            name: updated.name,
            date: updated.date,
          },
          createdBy: user._id,
        });
      }
    } catch (err) {
      logger.error(`[Holiday] Update notification failed: ${err.message}`);
    }

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

    // ─── NOTIFICATION: Warn everyone about removed holiday ───
    try {
      await notificationService.notifyAll({
        title: `❌ Holiday Cancelled: ${holiday.name}`,
        message: `${holiday.name} (${formatDate(holiday.date)}) has been removed from the calendar`,
        type: "warning",
        link: "/holidays",
        metadata: {
          name: holiday.name,
          date: holiday.date,
          type: holiday.type,
        },
        createdBy: user._id,
      });
    } catch (err) {
      logger.error(`[Holiday] Delete notification failed: ${err.message}`);
    }

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
