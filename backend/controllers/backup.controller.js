"use strict";

const backupService = require("../services/backup.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Get backup statistics (what would be backed up)
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await backupService.getBackupStats();
  return sendResponse(res).success({
    message: "Backup stats fetched",
    data: stats,
  });
});

/**
 * Create + download backup as JSON file
 */
const createBackup = asyncHandler(async (req, res) => {
  const backup = await backupService.createBackup(req.user, req);

  // Build filename: backup_SCHOOLNAME_YYYY-MM-DD_HH-MM.json
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0];
  const timeStr = `${String(date.getHours()).padStart(2, "0")}-${String(date.getMinutes()).padStart(2, "0")}`;

  const schoolName = (backup.metadata.schoolInfo?.name || "school")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .slice(0, 30);

  const filename = `backup_${schoolName}_${dateStr}_${timeStr}.json`;

  // Send as JSON download
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("X-Backup-Version", backup.metadata.version);
  res.setHeader("X-Backup-Total", backup.metadata.totalDocuments);

  return res.send(JSON.stringify(backup, null, 2));
});

/**
 * Validate uploaded backup file (preview before restore)
 */
const validateBackup = asyncHandler(async (req, res) => {
  const { backup } = req.body;

  if (!backup) {
    return sendResponse(res).badRequest({
      message: "Backup data is required",
    });
  }

  const validation = await backupService.validateBackup(backup);
  return sendResponse(res).success({
    message: "Backup is valid",
    data: validation,
  });
});

/**
 * Restore from uploaded backup (merge mode)
 */
const restoreBackup = asyncHandler(async (req, res) => {
  const { backup, collections } = req.body;

  if (!backup) {
    return sendResponse(res).badRequest({
      message: "Backup data is required",
    });
  }

  const result = await backupService.restoreBackup(
    backup,
    { collections },
    req.user,
    req,
  );

  return sendResponse(res).success({
    message: `Restore complete: ${result.totalInserted} new records added, ${result.totalSkipped} duplicates skipped`,
    data: result,
  });
});

module.exports = {
  getStats,
  createBackup,
  validateBackup,
  restoreBackup,
};
