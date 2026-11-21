"use strict";

const ExamAuditLog = require("../../models/exam/ExamAuditLog.model");
const logger = require("../../utils/logger");

/**
 * Append a record to the examination audit trail.
 * Awaited by callers so the record exists before the response is sent, but a
 * write failure is logged loudly rather than failing an already-applied change.
 */
const logExamAudit = async ({
  exam,
  classId = null,
  action,
  user,
  req,
  reason = "",
  before = null,
  after = null,
}) => {
  try {
    await ExamAuditLog.create({
      exam,
      class: classId,
      action,
      actor: { user: user?._id, name: user?.name || "", role: user?.role || "" },
      reason,
      before,
      after,
      ip: req?.ip || "",
    });
  } catch (err) {
    logger.error(`[ExamAudit] FAILED to record ${action}: ${err.message}`);
  }
};

module.exports = { logExamAudit };
