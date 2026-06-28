"use strict";

const cron = require("node-cron");
const logger = require("./logger");
const Settings = require("../models/Settings.model");

let attendanceCronJob = null;
let weeklyBackupCronJob = null;

// ════════════════════════════════════════════════════════════
//  ATTENDANCE CHECK CRON
// ════════════════════════════════════════════════════════════

/**
 * Schedule daily attendance check based on settings lock time
 */
const scheduleAttendanceCheck = async () => {
  try {
    if (attendanceCronJob) {
      attendanceCronJob.stop();
      attendanceCronJob = null;
    }

    const settings = await Settings.getSettings();
    const lockTime = settings?.attendanceLockTime || "10:00";

    const [hours, minutes] = lockTime.split(":").map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
      logger.warn(`[Cron] Invalid lock time: ${lockTime}, using default 10:00`);
      return scheduleAttendanceWithTime(10, 0);
    }

    scheduleAttendanceWithTime(hours, minutes);
  } catch (error) {
    logger.error(
      `[Cron] Failed to schedule attendance check: ${error.message}`,
    );
  }
};

const scheduleAttendanceWithTime = (hours, minutes) => {
  const cronExpression = `${minutes} ${hours} * * *`;

  logger.info(
    `[Cron] Scheduling pending attendance check at ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} daily`,
  );

  attendanceCronJob = cron.schedule(
    cronExpression,
    async () => {
      logger.info(
        `[Cron] Running scheduled attendance check at ${new Date().toISOString()}`,
      );
      try {
        const notificationService = require("../services/notification.service");
        await notificationService.checkPendingAttendance();
      } catch (error) {
        logger.error(`[Cron] Attendance job failed: ${error.message}`);
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    },
  );

  logger.info("[Cron] ✅ Attendance scheduler started");
};

// ════════════════════════════════════════════════════════════
//  WEEKLY BACKUP REMINDER CRON
// ════════════════════════════════════════════════════════════

/**
 * Schedule weekly backup reminder
 * Runs every Monday at 9:00 AM
 */
const scheduleWeeklyBackupReminder = () => {
  try {
    if (weeklyBackupCronJob) {
      weeklyBackupCronJob.stop();
      weeklyBackupCronJob = null;
    }

    // Cron format: minute hour day-of-month month day-of-week
    // "0 9 * * 1" = Every Monday at 9:00 AM
    const cronExpression = "0 9 * * 1";

    logger.info("[Cron] Scheduling weekly backup reminder (Mondays 9:00 AM)");

    weeklyBackupCronJob = cron.schedule(
      cronExpression,
      async () => {
        logger.info(
          `[Cron] Running weekly backup reminder at ${new Date().toISOString()}`,
        );
        try {
          await checkBackupReminder();
        } catch (error) {
          logger.error(`[Cron] Backup reminder failed: ${error.message}`);
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Kolkata",
      },
    );

    logger.info("[Cron] ✅ Weekly backup reminder scheduler started");
  } catch (error) {
    logger.error(`[Cron] Failed to schedule weekly backup: ${error.message}`);
  }
};

/**
 * Check if backup reminder should be sent
 * Sends notification if last backup is older than 7 days
 */
const checkBackupReminder = async () => {
  try {
    const settings = await Settings.getSettings();
    if (!settings) {
      logger.info("[Cron] No settings found, skipping backup reminder");
      return;
    }

    const lastBackup = settings.lastBackupAt;
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    let shouldRemind = false;
    let daysSinceBackup = null;

    if (!lastBackup) {
      // Never backed up
      shouldRemind = true;
    } else {
      const lastBackupMs = new Date(lastBackup).getTime();
      const diffMs = now - lastBackupMs;
      daysSinceBackup = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMs >= sevenDaysMs) {
        shouldRemind = true;
      }
    }

    if (!shouldRemind) {
      logger.info(
        `[Cron] Backup is recent (${daysSinceBackup} days ago), skipping reminder`,
      );
      return;
    }

    // Get admin users
    const User = require("../models/User.model");
    const admins = await User.find({
      role: "admin",
      isActive: true,
    }).lean();

    if (admins.length === 0) {
      logger.info("[Cron] No admin users to notify");
      return;
    }

    // Check if reminder already sent in last 24 hours (avoid duplicates)
    const Notification = require("../models/Notification.model");
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const existingReminder = await Notification.findOne({
      targetRole: "admin",
      title: /Backup Reminder/i,
      createdAt: { $gte: last24h },
    });

    if (existingReminder) {
      logger.info("[Cron] Backup reminder already sent in last 24h, skipping");
      return;
    }

    // Send notification
    const notificationService = require("../services/notification.service");
    const title = lastBackup
      ? `💾 Weekly Backup Reminder`
      : `💾 First Backup Recommended`;

    const message = lastBackup
      ? `It's been ${daysSinceBackup} days since your last backup. Create a fresh backup to protect your data.`
      : `Your school data has never been backed up. Create a backup now to protect against data loss.`;

    await notificationService.notifyAdmins({
      title,
      message,
      type: "warning",
      link: "/backup",
      metadata: {
        lastBackupAt: lastBackup,
        daysSinceBackup,
        reminderType: "weekly",
      },
      createdBy: admins[0]._id,
    });

    logger.info(
      `[Cron] ✅ Backup reminder sent — ${daysSinceBackup || "never"} days since last backup`,
    );
  } catch (error) {
    logger.error(`[Cron] Backup reminder check failed: ${error.message}`);
  }
};

/**
 * Initialize all scheduled jobs
 */
const initScheduler = async () => {
  logger.info("[Cron] Initializing scheduler...");
  await scheduleAttendanceCheck();
  scheduleWeeklyBackupReminder();

  // Run backup check once on startup (after 30 sec delay)
  setTimeout(async () => {
    logger.info("[Cron] Running startup backup reminder check...");
    await checkBackupReminder();
  }, 30 * 1000);
};

/**
 * Restart scheduler (call after settings change)
 */
const restartScheduler = async () => {
  logger.info("[Cron] Restarting scheduler...");
  await scheduleAttendanceCheck();
  scheduleWeeklyBackupReminder();
};

module.exports = {
  initScheduler,
  restartScheduler,
  scheduleAttendanceCheck,
  scheduleWeeklyBackupReminder,
  checkBackupReminder,
};
