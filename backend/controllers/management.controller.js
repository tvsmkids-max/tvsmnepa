"use strict";

const managementService = require("../services/management.service");
const ManagementAccess = require("../models/ManagementAccess.model");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

// ═══════════════════════════════════════════════════════════════════
//  PUBLIC ENDPOINTS (access via secret key)
// ═══════════════════════════════════════════════════════════════════

const getTodayOverview = asyncHandler(async (req, res) => {
  const data = await managementService.getTodayOverview();
  return sendResponse(res).success({
    message: "Today overview fetched",
    data,
  });
});

const getMonthlyTrends = asyncHandler(async (req, res) => {
  const data = await managementService.getMonthlyTrends();
  return sendResponse(res).success({
    message: "Monthly trends fetched",
    data,
  });
});

const getYearlyPerformance = asyncHandler(async (req, res) => {
  const data = await managementService.getYearlyPerformance();
  return sendResponse(res).success({
    message: "Yearly performance fetched",
    data,
  });
});

const getAlerts = asyncHandler(async (req, res) => {
  const data = await managementService.getAlerts();
  return sendResponse(res).success({
    message: "Alerts fetched",
    data,
  });
});

const getRankings = asyncHandler(async (req, res) => {
  const period = req.query.period || "month";
  if (!["today", "month", "year"].includes(period)) {
    return sendResponse(res).badRequest({
      message: "Invalid period. Use: today, month, year",
    });
  }
  const data = await managementService.getRankings({ period });
  return sendResponse(res).success({
    message: "Rankings fetched",
    data,
  });
});

// ═══════════════════════════════════════════════════════════════════
//  VALIDATE ACCESS (used by frontend to verify secret key)
// ═══════════════════════════════════════════════════════════════════
const validateAccess = asyncHandler(async (req, res) => {
  const { secretKey } = req.params;
  const access = await ManagementAccess.validateAccess(secretKey);

  if (!access) {
    return sendResponse(res).unauthorized({
      message: "Invalid or expired access key",
    });
  }

  return sendResponse(res).success({
    message: "Access valid",
    data: {
      valid: true,
      label: access.label,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS — Manage access URLs
// ═══════════════════════════════════════════════════════════════════
const listAccessUrls = asyncHandler(async (req, res) => {
  const urls = await managementService.listAccessUrls();
  return sendResponse(res).success({
    message: "Access URLs fetched",
    data: urls,
  });
});

const createAccessUrl = asyncHandler(async (req, res) => {
  const { label, expiresAt } = req.body;
  const access = await managementService.createAccessUrl({
    label,
    expiresAt,
    createdBy: req.user._id,
  });
  return sendResponse(res).created({
    message: "Access URL created successfully",
    data: access,
  });
});

const revokeAccessUrl = asyncHandler(async (req, res) => {
  const access = await managementService.revokeAccessUrl(req.params.id);
  if (!access) {
    return sendResponse(res).notFound({
      message: "Access URL not found",
    });
  }
  return sendResponse(res).success({
    message: "Access URL revoked",
    data: access,
  });
});

const deleteAccessUrl = asyncHandler(async (req, res) => {
  const access = await managementService.deleteAccessUrl(req.params.id);
  if (!access) {
    return sendResponse(res).notFound({
      message: "Access URL not found",
    });
  }
  return sendResponse(res).success({
    message: "Access URL deleted",
  });
});

module.exports = {
  // Public endpoints
  getTodayOverview,
  getMonthlyTrends,
  getYearlyPerformance,
  getAlerts,
  getRankings,
  validateAccess,
  // Admin endpoints
  listAccessUrls,
  createAccessUrl,
  revokeAccessUrl,
  deleteAccessUrl,
};
