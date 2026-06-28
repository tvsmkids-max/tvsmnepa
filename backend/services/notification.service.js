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
   * Build base filter for user notifications
   */
  _buildUserFilter(userId, userRole) {
    return {
      isActive: true,
      $or: [
        { targetUser: userId }, // Specifically for this user
        { targetRole: userRole }, // For this user's role
        { targetRole: "all" }, // For everyone
      ],
    };
  }

  /**
   * Get notifications for any user (role-aware)
   */
  async getMyNotifications(userId, userRole, { limit = 50 } = {}) {
    const filter = this._buildUserFilter(userId, userRole);

    const notifications = await Notification.find(filter)
      .sort("-createdAt")
      .limit(limit)
      .lean();

    return notifications.map((n) => ({
      ...n,
      isRead:
        n.readBy?.some((r) => r.user?.toString() === userId.toString()) ||
        false,
    }));
  }

  /**
   * Get unread count for user (lightweight)
   */
  async getUnreadCount(userId, userRole) {
    const filter = this._buildUserFilter(userId, userRole);

    // Use aggregation for efficient counting
    const result = await Notification.aggregate([
      { $match: filter },
      {
        $match: {
          "readBy.user": { $ne: userId },
        },
      },
      { $count: "count" },
    ]);

    return result[0]?.count || 0;
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(id, userId) {
    const notification = await Notification.findById(id);
    if (!notification) {
      throw Object.assign(new Error("Notification not found"), {
        statusCode: 404,
      });
    }

    const alreadyRead = notification.readBy?.some(
      (r) => r.user?.toString() === userId.toString(),
    );

    if (!alreadyRead) {
      notification.readBy.push({ user: userId, readAt: new Date() });

      // For single-user notifications, set readAt → triggers TTL cleanup
      if (notification.targetUser) {
        notification.readAt = new Date();
      } else {
        // For broadcast: only set readAt if all relevant users have read it
        // For simplicity, set readAt after first read → 7-day countdown starts
        // (Users who haven't read it can still see it within 7 days)
        if (!notification.readAt) {
          notification.readAt = new Date();
        }
      }

      await notification.save();
    }
    return true;
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllRead(userId, userRole) {
    const filter = this._buildUserFilter(userId, userRole);
    const notifications = await Notification.find(filter);

    let updatedCount = 0;
    const now = new Date();

    for (const n of notifications) {
      const alreadyRead = n.readBy?.some(
        (r) => r.user?.toString() === userId.toString(),
      );
      if (!alreadyRead) {
        n.readBy.push({ user: userId, readAt: now });
        if (!n.readAt) n.readAt = now;
        await n.save();
        updatedCount++;
      }
    }
    return updatedCount;
  }

  /**
   * Delete notification
   */
  async delete(id) {
    return Notification.findByIdAndDelete(id);
  }

  // ─────────────────────────────────────────────────────────
  //  NOTIFICATION CREATION HELPERS
  // ─────────────────────────────────────────────────────────

  /**
   * Create notification for specific user
   */
  async createForUser({
    userId,
    title,
    message,
    type = "info",
    link,
    metadata,
    createdBy,
  }) {
    try {
      return await Notification.create({
        title,
        message,
        type,
        targetUser: userId,
        targetRole: "all",
        link: link || null,
        metadata: metadata || null,
        createdBy,
      });
    } catch (error) {
      logger.error(
        `[Notification] Failed to create for user: ${error.message}`,
      );
    }
  }

  /**
   * Create notification for role (admin/teacher/all)
   */
  async createForRole({
    targetRole,
    title,
    message,
    type = "info",
    link,
    metadata,
    createdBy,
  }) {
    try {
      return await Notification.create({
        title,
        message,
        type,
        targetRole,
        link: link || null,
        metadata: metadata || null,
        createdBy,
      });
    } catch (error) {
      logger.error(
        `[Notification] Failed to create for role: ${error.message}`,
      );
    }
  }

  /**
   * Notify all admins (system-wide alert)
   */
  async notifyAdmins({
    title,
    message,
    type = "info",
    link,
    metadata,
    createdBy,
  }) {
    return this.createForRole({
      targetRole: "admin",
      title,
      message,
      type,
      link,
      metadata,
      createdBy,
    });
  }

  /**
   * Notify all teachers (system-wide)
   */
  async notifyTeachers({
    title,
    message,
    type = "info",
    link,
    metadata,
    createdBy,
  }) {
    return this.createForRole({
      targetRole: "teacher",
      title,
      message,
      type,
      link,
      metadata,
      createdBy,
    });
  }

  /**
   * Notify everyone (admins + teachers)
   */
  async notifyAll({
    title,
    message,
    type = "info",
    link,
    metadata,
    createdBy,
  }) {
    return this.createForRole({
      targetRole: "all",
      title,
      message,
      type,
      link,
      metadata,
      createdBy,
    });
  }

  // ─────────────────────────────────────────────────────────
  //  CRON JOB: Pending Attendance
  // ─────────────────────────────────────────────────────────

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

      const holiday = await Holiday.isHoliday(today, sessionId);
      if (holiday && !holiday.allowAttendance) {
        logger.info(`[Cron] Today is holiday: ${holiday.name}, skipping`);
        return;
      }

      const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
      const workingDay = settings.workingDays?.find((d) => d.day === dayName);
      if (workingDay && !workingDay.isWorking) {
        logger.info(`[Cron] Today is non-working day: ${dayName}, skipping`);
        return;
      }

      const classes = await Class.find({
        session: sessionId,
        isArchived: false,
      })
        .populate("classTeacher", "name email user")
        .lean();

      if (classes.length === 0) {
        logger.info("[Cron] No classes found");
        return;
      }

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

      const admins = await User.find({ role: "admin", isActive: true }).lean();
      if (admins.length === 0) {
        logger.info("[Cron] No active admins to notify");
        return;
      }

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

      // ─── ADMIN NOTIFICATION ───
      await this.notifyAdmins({
        title,
        message,
        type: "warning",
        link: "/attendance/mark",
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
        createdBy: admins[0]._id,
      });

      // ─── TEACHER NOTIFICATIONS (individual to each teacher with pending classes) ───
      for (const cls of pendingClasses) {
        if (cls.classTeacher?.user) {
          await this.createForUser({
            userId: cls.classTeacher.user,
            title: `📝 Mark Attendance — Class ${cls.name}-${cls.section}`,
            message: `You haven't marked attendance for Class ${cls.name}-${cls.section} today. Please mark it now.`,
            type: "warning",
            link: "/attendance/mark",
            metadata: {
              classId: cls._id,
              className: `${cls.name}-${cls.section}`,
              date: today,
            },
            createdBy: admins[0]._id,
          });
        }
      }

      logger.info(
        `[Cron] ✅ Notifications created — ${pendingClasses.length} pending classes`,
      );
    } catch (error) {
      logger.error(
        `[Cron] Error checking pending attendance: ${error.message}`,
      );
    }
  }
}

module.exports = new NotificationService();
