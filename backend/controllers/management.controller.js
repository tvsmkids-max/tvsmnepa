"use strict";

const managementService = require("../services/management.service");
const ManagementAccess = require("../models/ManagementAccess.model");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const validateAccess = asyncHandler(async (req, res) => {
  const { secretKey } = req.params;
  const access = await ManagementAccess.validateAccess(secretKey);
  if (!access)
    return sendResponse(res).unauthorized({
      message: "Invalid or expired access key",
    });
  return sendResponse(res).success({
    message: "Access valid",
    data: { valid: true, label: access.label },
  });
});

const getRangeOverview = asyncHandler(async (req, res) => {
  const { from, to, group } = req.query;
  if (!from || !to)
    return sendResponse(res).badRequest({
      message: "from and to dates are required",
    });
  const data = await managementService.getRangeOverview({ from, to, group });
  return sendResponse(res).success({ message: "Range overview fetched", data });
});

const getClassDetail = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { date } = req.query;
  const data = await managementService.getClassDetail({ classId, date });
  return sendResponse(res).success({ message: "Class detail fetched", data });
});

const getMonthlyReport = asyncHandler(async (req, res) => {
  const now = new Date();
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const data = await managementService.getMonthlyReport({ year, month });
  return sendResponse(res).success({ message: "Monthly report fetched", data });
});

const getMonthlyClassDetail = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const now = new Date();
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const data = await managementService.getMonthlyClassDetail({
    classId,
    year,
    month,
  });
  return sendResponse(res).success({
    message: "Monthly class detail fetched",
    data,
  });
});

const getMonthlyMatrix = asyncHandler(async (req, res) => {
  const now = new Date();
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const data = await managementService.getMonthlyMatrix({ year, month });
  return sendResponse(res).success({ message: "Monthly matrix fetched", data });
});

// ─── ADMIN ───
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
    message: "Access URL created",
    data: access,
  });
});

const revokeAccessUrl = asyncHandler(async (req, res) => {
  const access = await managementService.revokeAccessUrl(req.params.id);
  if (!access) return sendResponse(res).notFound({ message: "Not found" });
  return sendResponse(res).success({
    message: "Access URL revoked",
    data: access,
  });
});

const deleteAccessUrl = asyncHandler(async (req, res) => {
  const access = await managementService.deleteAccessUrl(req.params.id);
  if (!access) return sendResponse(res).notFound({ message: "Not found" });
  return sendResponse(res).success({ message: "Access URL deleted" });
});

module.exports = {
  validateAccess,
  getRangeOverview,
  getClassDetail,
  getMonthlyReport,
  getMonthlyClassDetail,
  getMonthlyMatrix,
  listAccessUrls,
  createAccessUrl,
  revokeAccessUrl,
  deleteAccessUrl,
};
