"use strict";

const { sendResponse } = require("../utils/apiResponse");
const { ROLES } = require("../constants/roles");
const logger = require("../utils/logger");

/**
 * Authorize specific roles
 * @param {...string} roles - Allowed roles
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

/**
 * Admin only
 */
const adminOnly = authorize(ROLES.ADMIN);

/**
 * Admin or Teacher
 */
const adminOrTeacher = authorize(ROLES.ADMIN, ROLES.TEACHER);

/**
 * Check if user can access resource (admin full, teacher restricted to assigned)
 * Used for class-level access checks
 */
const canAccessClass = (classIdParam = "classId") => {
  return async (req, res, next) => {
    if (!req.user) {
      return sendResponse(res).unauthorized({
        message: "Authentication required.",
      });
    }

    if (req.user.role === ROLES.ADMIN) {
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

module.exports = { authorize, adminOnly, adminOrTeacher, canAccessClass };
