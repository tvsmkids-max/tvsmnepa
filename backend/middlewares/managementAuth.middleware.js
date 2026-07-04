"use strict";

const ManagementAccess = require("../models/ManagementAccess.model");
const { sendResponse } = require("../utils/apiResponse");

/**
 * Validates management secret key from URL params
 * Logs the access if valid
 */
const validateManagementKey = async (req, res, next) => {
  try {
    const { secretKey } = req.params;

    if (!secretKey || typeof secretKey !== "string") {
      return sendResponse(res).unauthorized({
        message: "Access key required",
      });
    }

    const access = await ManagementAccess.validateAccess(secretKey);
    if (!access) {
      return sendResponse(res).unauthorized({
        message: "Invalid or expired access key",
      });
    }

    // Log access (fire and forget)
    ManagementAccess.logAccess(access._id, req.ip).catch(() => {
      // Silent fail — don't block on logging
    });

    req.managementAccess = access;
    next();
  } catch (err) {
    return sendResponse(res).serverError({
      message: "Access validation failed",
    });
  }
};

module.exports = { validateManagementKey };
