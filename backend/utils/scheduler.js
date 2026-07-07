"use strict";

const cron = require("node-cron");
const logger = require("./logger");
const Settings = require("../models/Settings.model");

// Note: Notification-based reminders removed.
// Kept minimal scheduler in case future cron jobs are needed.

// Placeholder — no cron jobs active currently
let placeholderJob = null;

/**
 * Initialize all scheduled jobs
 */
const initScheduler = async () => {
  logger.info("[Cron] Scheduler initialized (no active jobs)");
  // Add cron jobs here if needed in future
};

/**
 * Restart scheduler (call after settings change)
 */
const restartScheduler = async () => {
  logger.info("[Cron] Scheduler restarted (no active jobs)");
  // Re-schedule jobs here if needed
};

module.exports = {
  initScheduler,
  restartScheduler,
};
