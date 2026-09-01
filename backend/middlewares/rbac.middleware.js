"use strict";

const { sendResponse } = require("../utils/apiResponse");
const { ROLES } = require("../constants/roles");
const logger = require("../utils/logger");

/**
 * Authorize specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res).unauthorized({
        message: "Authentication required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `RBAC: User ${req.user.name || req.user._id} (${req.user.role}) attempted to access ` +
          `${req.method} ${req.originalUrl} - required: [${roles.join(", ")}]`,
      );

      return sendResponse(res).forbidden({
        message: `Access denied. This action requires one of these roles: ${roles.join(", ")}.`,
      });
    }

    next();
  };
};

// ─── ROLE SHORTCUTS ───
const adminOnly = authorize(ROLES.ADMIN);
const adminOrClass = authorize(ROLES.ADMIN, ROLES.CLASS);
const anyRole = authorize(ROLES.ADMIN, ROLES.CLASS);

// ─── LEGACY ALIASES (backward-compat for old imports) ───
// Prevents old routes from crashing if they still import `adminOrTeacher`.
// Behaves identically to adminOrClass.
const adminOrTeacher = adminOrClass;

/**
 * Check if user can access a specific class
 * Admin: full access
 * Class user: only their own linked class
 */
const canAccessClass = (classIdParam = "classId") => {
  return async (req, res, next) => {
    if (!req.user) {
      return sendResponse(res).unauthorized({
        message: "Authentication required.",
      });
    }

    // Admin can access all classes
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    const classId =
      req.params[classIdParam] ||
      req.body[classIdParam] ||
      req.query[classIdParam];

    if (!classId) {
      return sendResponse(res).badRequest({
        message: "Class ID is required.",
      });
    }

    // Class user: must match their linkedClass
    if (req.user.role === ROLES.CLASS) {
      const linked = req.user.linkedClass?.toString();
      if (!linked) {
        return sendResponse(res).forbidden({
          message: "No class is linked to this account.",
        });
      }

      if (linked !== classId.toString()) {
        return sendResponse(res).forbidden({
          message: "Access denied. You can only access your own class.",
        });
      }

      return next();
    }

    return sendResponse(res).forbidden({
      message: "Access denied.",
    });
  };
};

module.exports = {
  authorize,
  adminOnly,
  adminOrClass,
  adminOrTeacher, // legacy alias
  anyRole,
  canAccessClass,
};
