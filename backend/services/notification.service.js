"use strict";

const Notification = require("../models/Notification.model");
const User = require("../models/User.model");
const Class = require("../models/Class.model");
const Attendance = require("../models/Attendance.model");
const Holiday = require("../models/Holiday.model");
const Settings = require("../models/Settings.model");
const logger = require("../utils/logger");

class NotificationService {
  /**
   * Get notifications for admin only
   */
  async getMyNotifications(userId, userRole) {
    if (userRole !== "admin") return [];

    const notifications = await Notification.find({
      isActive: true,
      $or: [
        { targetRole: "admin" },
        { targetRole: "all" },
        { targetUser: userId },
      ],
    })
      .sort("-createdAt")
      .limit(50)
      .lean();

    return notifications.map((n) => ({
      ...n,
      isRead:
        n.readBy?.some((r) => r.user?.toString() === userId.toString()) ||
        false,
    }));
  }

  async getUnreadCount(userId, userRole) {
    if (userRole !== "admin") return 0;

    const notifications = await Notification.find({
      isActive: true,
      $or: [
        { targetRole: "admin" },
        { targetRole: "all" },
        { targetUser: userId },
      ],
    }).lean();

    return notifications.filter(
      (n) => !n.readBy?.some((r) => r.user?.toString() === userId.toString()),
    ).length;
  }

  async markAsRead(id, userId) {
    const notification = await Notification.findById(id);
    if (!notification) throw new Error("Notification not found");

    const alreadyRead = notification.readBy?.some(
      (r) => r.user?.toString() === userId.toString(),
    );

    if (!alreadyRead) {
      notification.readBy.push({ user: userId, readAt: new Date() });
      await notification.save();
    }
    return true;
  }

  async markAllRead(userId, userRole) {
    if (userRole !== "admin") return true;

    const notifications = await Notification.find({
      isActive: true,
      $or: [
        { targetRole: "admin" },
        { targetRole: "all" },
        { targetUser: userId },
      ],
    });

    for (const n of notifications) {
      const alreadyRead = n.readBy?.some(
        (r) => r.user?.toString() === userId.toString(),
      );
      if (!alreadyRead) {
        n.readBy.push({ user: userId, readAt: new Date() });
        await n.save();
      }
    }
    return true;
  }

  async delete(id) {
    return Notification.findByIdAndDelete(id);
  }

  /**
   * MAIN JOB: Check pending attendance and notify admin
   * Runs daily at lock time (configured in settings)
   */
  async checkPendingAttendance() {
    try {
      logger.info("[Cron] Checking pending attendance...");

      const settings = await Settings.getSettings();
      const sessionId = settings?.activeSession?._id || settings?.activeSession;

      if (!sessionId) {
        logger.info("[Cron] No active session, skipping");
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if today is a holiday
      const holiday = await Holiday.isHoliday(today, sessionId);
      if (holiday && !holiday.allowAttendance) {
        logger.info(`[Cron] Today is holiday: ${holiday.name}, skipping`);
        return;
      }

      // Check if today is a working day
      const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
      const workingDay = settings.workingDays?.find((d) => d.day === dayName);
      if (workingDay && !workingDay.isWorking) {
        logger.info(`[Cron] Today is non-working day: ${dayName}, skipping`);
        return;
      }

      // Get all active classes
      const classes = await Class.find({
        session: sessionId,
        isArchived: false,
      })
        .populate("classTeacher", "name email")
        .lean();

      if (classes.length === 0) {
        logger.info("[Cron] No classes found");
        return;
      }

      // Check which classes have NOT been marked today
      const classIds = classes.map((c) => c._id);
      const markedAttendance = await Attendance.distinct("class", {
        class: { $in: classIds },
        date: { $gte: today, $lt: tomorrow },
      });

      const markedClassIds = new Set(
        markedAttendance.map((id) => id.toString()),
      );

      const pendingClasses = classes.filter(
        (c) => !markedClassIds.has(c._id.toString()),
      );

      logger.info(
        `[Cron] Pending classes: ${pendingClasses.length} / ${classes.length}`,
      );

      if (pendingClasses.length === 0) {
        logger.info("[Cron] All classes marked, no notification needed");
        return;
      }

      // Get admin users
      const admins = await User.find({ role: "admin", isActive: true }).lean();
      if (admins.length === 0) {
        logger.info("[Cron] No active admins to notify");
        return;
      }

      // Check if notification already exists for today
      const existingNotif = await Notification.findOne({
        type: "warning",
        targetRole: "admin",
        createdAt: { $gte: today, $lt: tomorrow },
        title: /Pending Attendance/i,
      });

      if (existingNotif) {
        logger.info("[Cron] Notification already sent today, skipping");
        return;
      }

      // Build notification message
      const pendingNames = pendingClasses
        .map((c) => `${c.name}-${c.section}`)
        .join(", ");

      const teacherNames = [
        ...new Set(
          pendingClasses.map((c) => c.classTeacher?.name).filter(Boolean),
        ),
      ].join(", ");

      const title = `⚠️ Pending Attendance — ${pendingClasses.length} Class${pendingClasses.length > 1 ? "es" : ""}`;
      const message =
        `Attendance not marked yet for: ${pendingNames}.` +
        (teacherNames ? ` Teachers: ${teacherNames}.` : "") +
        ` Please follow up.`;

      // Create notification for admin
      const notification = await Notification.create({
        title,
        message,
        type: "warning",
        targetRole: "admin",
        createdBy: admins[0]._id,
        metadata: {
          pendingCount: pendingClasses.length,
          totalClasses: classes.length,
          classes: pendingClasses.map((c) => ({
            id: c._id,
            name: c.name,
            section: c.section,
            teacher: c.classTeacher?.name || "Unassigned",
          })),
          date: today,
        },
      });

      logger.info(
        `[Cron] ✅ Notification created for ${admins.length} admin(s) — ${pendingClasses.length} pending classes`,
      );

      return notification;
    } catch (error) {
      logger.error(
        `[Cron] Error checking pending attendance: ${error.message}`,
      );
    }
  }
}

module.exports = new NotificationService();
