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
        `RBAC: User ${req.user.email} (${req.user.role}) attempted to access ` +
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
const adminOrTeacher = authorize(ROLES.ADMIN, ROLES.TEACHER);
const adminOrPrincipal = authorize(ROLES.ADMIN, ROLES.PRINCIPAL);
const anyRole = authorize(ROLES.ADMIN, ROLES.TEACHER, ROLES.PRINCIPAL);

/**
 * Check if user can access class (admin full, teacher restricted)
 */
const canAccessClass = (classIdParam = "classId") => {
  return async (req, res, next) => {
    if (!req.user) {
      return sendResponse(res).unauthorized({
        message: "Authentication required.",
      });
    }

    // Admin and Principal can access all classes
    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.PRINCIPAL) {
      return next();
    }

    const classId =
      req.params[classIdParam] ||
      req.body[classIdParam] ||
      req.query[classIdParam];

    if (!classId) {
      return sendResponse(res).badRequest({ message: "Class ID is required." });
    }

    const Teacher = require("../models/Teacher.model");
    const teacher = await Teacher.findOne({
      user: req.user._id,
      isActive: true,
    });

    if (!teacher) {
      return sendResponse(res).forbidden({
        message: "Teacher profile not found.",
      });
    }

    const isAssigned = teacher.assignedClasses.some(
      (id) => id.toString() === classId.toString(),
    );

    if (!isAssigned) {
      return sendResponse(res).forbidden({
        message: "Access denied. You are not assigned to this class.",
      });
    }

    req.teacher = teacher;
    next();
  };
};

module.exports = {
  authorize,
  adminOnly,
  adminOrTeacher,
  adminOrPrincipal,
  anyRole,
  canAccessClass,
};
