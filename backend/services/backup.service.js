"use strict";

const mongoose = require("mongoose");
const logger = require("../utils/logger");

// All models that get backed up
const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const Teacher = require("../models/Teacher.model");
const Attendance = require("../models/Attendance.model");
const Holiday = require("../models/Holiday.model");
const AcademicSession = require("../models/AcademicSession.model");
const Settings = require("../models/Settings.model");
const User = require("../models/User.model");
const Notification = require("../models/Notification.model");
const ActivityLog = require("../models/ActivityLog.model");

const { createAuditLog } = require("../middlewares/audit.middleware");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const BACKUP_VERSION = "1.0.0";

// Models config for backup/restore (ordered by dependency)
const BACKUP_MODELS = [
  { name: "users", model: User, includeInRestore: false }, // Excluded from default restore (security)
  { name: "settings", model: Settings, includeInRestore: true },
  { name: "academicSessions", model: AcademicSession, includeInRestore: true },
  { name: "classes", model: Class, includeInRestore: true },
  { name: "teachers", model: Teacher, includeInRestore: true },
  { name: "students", model: Student, includeInRestore: true },
  { name: "attendance", model: Attendance, includeInRestore: true },
  { name: "holidays", model: Holiday, includeInRestore: true },
  { name: "notifications", model: Notification, includeInRestore: false },
  { name: "activityLogs", model: ActivityLog, includeInRestore: false },
];

class BackupService {
  /**
   * Generate full backup of database
   * Returns JSON object ready to be downloaded
   */
  async createBackup(user, req) {
    try {
      logger.info(`[Backup] Started by ${user.email}`);
      const startTime = Date.now();

      const data = {};
      const stats = {};

      // Fetch all collections
      for (const config of BACKUP_MODELS) {
        try {
          const docs = await config.model.find({}).lean();
          data[config.name] = docs;
          stats[config.name] = docs.length;
        } catch (err) {
          logger.error(
            `[Backup] Failed to fetch ${config.name}: ${err.message}`,
          );
          data[config.name] = [];
          stats[config.name] = 0;
        }
      }

      const totalDocs = Object.values(stats).reduce((sum, n) => sum + n, 0);
      const durationMs = Date.now() - startTime;

      // Build backup object
      const backup = {
        metadata: {
          version: BACKUP_VERSION,
          createdAt: new Date().toISOString(),
          createdBy: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          schoolInfo: await this._getSchoolInfo(),
          stats,
          totalDocuments: totalDocs,
          durationMs,
          source: "TVSMNEPA-Backup-v1",
        },
        data,
      };

      // Audit log
      await createAuditLog({
        user,
        action: "BACKUP",
        module: "System",
        description: `Created backup with ${totalDocs} documents across ${Object.keys(stats).length} collections`,
        resourceType: "Backup",
        after: { stats, totalDocs, durationMs },
        req,
      });

      // Update last backup timestamp in settings
      await this._updateLastBackupTime();

      logger.info(
        `[Backup] ✅ Complete — ${totalDocs} docs in ${durationMs}ms`,
      );

      return backup;
    } catch (error) {
      logger.error(`[Backup] Failed: ${error.message}`);
      throwError(`Backup failed: ${error.message}`, 500);
    }
  }

  /**
   * Get current backup-able stats (without creating full backup)
   * Used to show what would be backed up
   */
  async getBackupStats() {
    const stats = {};
    let total = 0;

    for (const config of BACKUP_MODELS) {
      try {
        const count = await config.model.countDocuments();
        stats[config.name] = count;
        total += count;
      } catch {
        stats[config.name] = 0;
      }
    }

    const settings = await Settings.getSettings().catch(() => null);

    return {
      stats,
      total,
      lastBackupAt: settings?.lastBackupAt || null,
      daysSinceLastBackup: settings?.lastBackupAt
        ? Math.floor(
            (Date.now() - new Date(settings.lastBackupAt).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null,
    };
  }

  /**
   * Validate uploaded backup file structure
   */
  async validateBackup(backupData) {
    if (!backupData || typeof backupData !== "object") {
      throwError("Invalid backup file format", 400);
    }

    if (!backupData.metadata || !backupData.data) {
      throwError("Missing required backup sections (metadata, data)", 400);
    }

    if (!backupData.metadata.version) {
      throwError("Backup version missing", 400);
    }

    // Version check (allow same major version)
    const backupMajor = backupData.metadata.version.split(".")[0];
    const currentMajor = BACKUP_VERSION.split(".")[0];

    if (backupMajor !== currentMajor) {
      throwError(
        `Backup version mismatch. File: v${backupData.metadata.version}, Expected: v${BACKUP_VERSION}`,
        400,
      );
    }

    if (backupData.metadata.source !== "TVSMNEPA-Backup-v1") {
      throwError("Backup file is not from TVSMNEPA system", 400);
    }

    // Validate data structure
    const issues = [];
    for (const config of BACKUP_MODELS) {
      if (config.includeInRestore && backupData.data[config.name]) {
        if (!Array.isArray(backupData.data[config.name])) {
          issues.push(`${config.name} is not an array`);
        }
      }
    }

    if (issues.length > 0) {
      throwError(`Backup validation failed: ${issues.join(", ")}`, 400);
    }

    return {
      valid: true,
      metadata: backupData.metadata,
      preview: this._buildRestorePreview(backupData),
    };
  }

  /**
   * Restore data from backup (merge mode - skips duplicates)
   */
  async restoreBackup(backupData, options = {}, user, req) {
    try {
      logger.info(`[Restore] Started by ${user.email}`);
      const startTime = Date.now();

      // Validate first
      const validation = await this.validateBackup(backupData);
      if (!validation.valid) {
        throwError("Invalid backup", 400);
      }

      const { collections = null } = options;
      const results = {};

      // Restore each collection
      for (const config of BACKUP_MODELS) {
        // Skip if model is excluded from restore
        if (!config.includeInRestore) {
          results[config.name] = {
            skipped: true,
            reason: "Excluded from restore",
          };
          continue;
        }

        // Skip if user specified collections and this isn't in the list
        if (collections && !collections.includes(config.name)) {
          results[config.name] = { skipped: true, reason: "Not selected" };
          continue;
        }

        const docs = backupData.data[config.name] || [];
        if (docs.length === 0) {
          results[config.name] = {
            inserted: 0,
            skipped: 0,
            failed: 0,
            total: 0,
          };
          continue;
        }

        results[config.name] = await this._restoreCollection(
          config.model,
          config.name,
          docs,
        );
      }

      const durationMs = Date.now() - startTime;
      const summary = this._buildRestoreSummary(results, durationMs);

      // Audit log
      await createAuditLog({
        user,
        action: "RESTORE",
        module: "System",
        description: `Restored backup: ${summary.totalInserted} new, ${summary.totalSkipped} skipped, ${summary.totalFailed} failed`,
        resourceType: "Backup",
        before: { source: "backup_restore" },
        after: { results, durationMs },
        req,
      });

      logger.info(
        `[Restore] ✅ Complete — ${summary.totalInserted} new, ${summary.totalSkipped} skipped, in ${durationMs}ms`,
      );

      return summary;
    } catch (error) {
      logger.error(`[Restore] Failed: ${error.message}`);
      throwError(`Restore failed: ${error.message}`, 500);
    }
  }

  // ─── PRIVATE HELPERS ───

  async _restoreCollection(Model, name, docs) {
    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    const failedIds = [];

    for (const doc of docs) {
      try {
        if (!doc._id) {
          failed++;
          continue;
        }

        // Check if document already exists
        const existing = await Model.findById(doc._id).lean();
        if (existing) {
          skipped++;
          continue;
        }

        // Insert with original _id
        const cleanDoc = this._cleanDocument(doc);
        await Model.create(cleanDoc);
        inserted++;
      } catch (err) {
        failed++;
        failedIds.push(doc._id);
        logger.warn(`[Restore] ${name} ${doc._id}: ${err.message}`);
      }
    }

    return {
      inserted,
      skipped,
      failed,
      total: docs.length,
      ...(failedIds.length > 0 && { failedIds: failedIds.slice(0, 5) }),
    };
  }

  /**
   * Clean document for insertion (remove problematic fields)
   */
  _cleanDocument(doc) {
    const clean = { ...doc };
    // Remove version key if present (MongoDB will set it)
    delete clean.__v;
    // Convert _id string to ObjectId if needed
    if (clean._id && typeof clean._id === "string") {
      try {
        clean._id = new mongoose.Types.ObjectId(clean._id);
      } catch {
        // Keep as string if invalid
      }
    }
    return clean;
  }

  _buildRestorePreview(backupData) {
    const preview = {};
    for (const config of BACKUP_MODELS) {
      if (config.includeInRestore) {
        preview[config.name] = backupData.data[config.name]?.length || 0;
      }
    }
    return preview;
  }

  _buildRestoreSummary(results, durationMs) {
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let totalProcessed = 0;

    Object.values(results).forEach((r) => {
      if (r.skipped === true) return;
      totalInserted += r.inserted || 0;
      totalSkipped += r.skipped || 0;
      totalFailed += r.failed || 0;
      totalProcessed += r.total || 0;
    });

    return {
      totalInserted,
      totalSkipped,
      totalFailed,
      totalProcessed,
      durationMs,
      collections: results,
    };
  }

  async _getSchoolInfo() {
    try {
      const settings = await Settings.getSettings();
      return {
        name: settings?.schoolName || "Unknown",
        address: settings?.address || "",
        phone: settings?.phone || "",
        email: settings?.email || "",
      };
    } catch {
      return { name: "Unknown" };
    }
  }

  async _updateLastBackupTime() {
    try {
      await Settings.updateOne({}, { $set: { lastBackupAt: new Date() } });
    } catch (err) {
      logger.error(`[Backup] Failed to update lastBackupAt: ${err.message}`);
    }
  }
}

module.exports = new BackupService();
