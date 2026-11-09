"use strict";

const externalApiService = require("../services/externalApi.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

// ═══════════════════════════════════════════════════════════════
//  ADMIN: MANAGE EXTERNAL API KEYS
// ═══════════════════════════════════════════════════════════════
const listKeys = asyncHandler(async (req, res) => {
  const keys = await externalApiService.listKeys();
  return sendResponse(res).success({
    message: "External API keys fetched",
    data: keys,
  });
});

const createKey = asyncHandler(async (req, res) => {
  const { label, expiresAt, allowedOrigins } = req.body;
  const result = await externalApiService.createKey({
    label,
    expiresAt,
    allowedOrigins,
    createdBy: req.user._id,
  });

  if (req.audit) {
    await req.audit({
      action: "CREATE",
      module: "Settings",
      description: `Created external read-only API key "${result.key.label}" (${result.key.keyPrefix})`,
      resourceId: result.key._id,
      resourceType: "ExternalApiKey",
    });
  }

  return sendResponse(res).created({
    message:
      "External API key generated. Copy this secret key now — it will not be shown again.",
    data: result,
  });
});

const revokeKey = asyncHandler(async (req, res) => {
  const revoked = await externalApiService.revokeKey(req.params.id);
  if (!revoked) {
    return sendResponse(res).notFound({ message: "External API key not found" });
  }

  if (req.audit) {
    await req.audit({
      action: "UPDATE",
      module: "Settings",
      description: `Revoked external read-only API key "${revoked.label}" (${revoked.keyPrefix})`,
      resourceId: revoked._id,
      resourceType: "ExternalApiKey",
    });
  }

  return sendResponse(res).success({
    message: "External API key revoked",
    data: revoked,
  });
});

const deleteKey = asyncHandler(async (req, res) => {
  const deleted = await externalApiService.deleteKey(req.params.id);
  if (!deleted) {
    return sendResponse(res).notFound({ message: "External API key not found" });
  }

  if (req.audit) {
    await req.audit({
      action: "DELETE",
      module: "Settings",
      description: `Deleted external read-only API key "${deleted.label}" (${deleted.keyPrefix})`,
      resourceId: deleted._id,
      resourceType: "ExternalApiKey",
    });
  }

  return sendResponse(res).success({
    message: "External API key deleted",
  });
});

// ═══════════════════════════════════════════════════════════════
//  EXTERNAL READ-ONLY DATA CONTROLLERS
// ═══════════════════════════════════════════════════════════════
const getStatus = asyncHandler(async (req, res) => {
  const data = await externalApiService.getSchoolStatus();
  return sendResponse(res).success({
    message: "External read-only API connection verified",
    data,
  });
});

const getSessions = asyncHandler(async (req, res) => {
  const data = await externalApiService.getSessions();
  return sendResponse(res).success({
    message: "Academic sessions fetched",
    data,
  });
});

const getClasses = asyncHandler(async (req, res) => {
  const { sessionId, group } = req.query;
  const data = await externalApiService.getClasses({ sessionId, group });
  return sendResponse(res).success({
    message: "Classes fetched",
    data,
  });
});

const getDailyOverview = asyncHandler(async (req, res) => {
  const { date, sessionId, group } = req.query;
  const data = await externalApiService.getDailyOverview({
    date,
    sessionId,
    group,
  });
  return sendResponse(res).success({
    message: "Daily attendance overview fetched",
    data,
  });
});

const getClassAttendance = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { date } = req.query;
  const data = await externalApiService.getClassAttendance({ classId, date });
  return sendResponse(res).success({
    message: "Class attendance fetched",
    data,
  });
});

const getAttendanceRecords = asyncHandler(async (req, res) => {
  const {
    date,
    from,
    to,
    classId,
    status,
    scholarNumber,
    search,
    sessionId,
    page,
    limit,
  } = req.query;

  const { records, pagination } =
    await externalApiService.getAttendanceRecords({
      date,
      from,
      to,
      classId,
      status,
      scholarNumber,
      search,
      sessionId,
      page,
      limit,
    });

  return sendResponse(res).success({
    message: "Attendance records fetched",
    data: records,
    pagination,
  });
});

const getStudentAttendance = asyncHandler(async (req, res) => {
  const { scholarNumber } = req.params;
  const { from, to, month, year, sessionId } = req.query;
  const data = await externalApiService.getStudentAttendance({
    scholarNumber,
    from,
    to,
    month,
    year,
    sessionId,
  });
  return sendResponse(res).success({
    message: "Student attendance fetched",
    data,
  });
});

const getMonthlySummary = asyncHandler(async (req, res) => {
  const { year, month, sessionId } = req.query;
  const data = await externalApiService.getMonthlySummary({
    year,
    month,
    sessionId,
  });
  return sendResponse(res).success({
    message: "Monthly attendance summary fetched",
    data,
  });
});

module.exports = {
  listKeys,
  createKey,
  revokeKey,
  deleteKey,
  getStatus,
  getSessions,
  getClasses,
  getDailyOverview,
  getClassAttendance,
  getAttendanceRecords,
  getStudentAttendance,
  getMonthlySummary,
};
