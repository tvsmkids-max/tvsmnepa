"use strict";

const ActivityLog = require("../models/ActivityLog.model");
const logger = require("../utils/logger");

/**
 * Create an audit log entry
 */
const createAuditLog = async ({
  user,
  action,
  module,
  description,
  resourceId = null,
  resourceType = null,
  before = null,
  after = null,
  req = null,
  status = "success",
}) => {
  try {
    await ActivityLog.create({
      user: user._id,
      userName: user.name,
      userRole: user.role,
      action,
      module,
      description,
      resourceId,
      resourceType,
      before,
      after,
      ipAddress: req ? getClientIp(req) : null,
      userAgent: req ? req.headers["user-agent"] : null,
      status,
    });
  } catch (error) {
    logger.error(`Failed to create audit log: ${error.message}`);
  }
};

/**
 * Get real client IP (handles proxies)
 */
const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip
  );
};

/**
 * Auto audit middleware - attaches audit logger to req
 */
const auditMiddleware = (req, res, next) => {
  req.audit = async (auditData) => {
    if (req.user) {
      await createAuditLog({ ...auditData, user: req.user, req });
    }
  };
  next();
};

module.exports = { createAuditLog, auditMiddleware, getClientIp };
