"use strict";

const cron = require("node-cron");
const logger = require("./logger");
const Settings = require("../models/Settings.model");

let attendanceCronJob = null;

/**
 * Schedule daily attendance check based on settings lock time
 */
const scheduleAttendanceCheck = async () => {
  try {
    // Stop existing job if any
    if (attendanceCronJob) {
      attendanceCronJob.stop();
      attendanceCronJob = null;
    }

    const settings = await Settings.getSettings();
    const lockTime = settings?.attendanceLockTime || "10:00";

    // Parse HH:MM format
    const [hours, minutes] = lockTime.split(":").map(Number);

    if (isNaN(hours) || isNaN(minutes)) {
      logger.warn(`[Cron] Invalid lock time: ${lockTime}, using default 10:00`);
      return scheduleWithTime(10, 0);
    }

    scheduleWithTime(hours, minutes);
  } catch (error) {
    logger.error(`[Cron] Failed to schedule: ${error.message}`);
  }
};

const scheduleWithTime = (hours, minutes) => {
  // Cron format: minute hour * * * (every day at HH:MM)
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
        logger.error(`[Cron] Job failed: ${error.message}`);
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    },
  );

  logger.info("[Cron] ✅ Scheduler started");
};

/**
 * Initialize all scheduled jobs
 */
const initScheduler = async () => {
  logger.info("[Cron] Initializing scheduler...");
  await scheduleAttendanceCheck();
};

/**
 * Restart scheduler (call after settings change)
 */
const restartScheduler = async () => {
  logger.info("[Cron] Restarting scheduler...");
  await scheduleAttendanceCheck();
};

module.exports = {
  initScheduler,
  restartScheduler,
  scheduleAttendanceCheck,
};
