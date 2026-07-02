"use strict";

const dashboardService = require("../services/dashboard.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * GET /dashboard/teacher/summary?period=today|week|month
 */
const getTeacherSummary = asyncHandler(async (req, res) => {
  const period = req.query.period || "today";

  if (!["today", "week", "month"].includes(period)) {
    return sendResponse(res).badRequest({
      message: "Invalid period. Use: today, week, month",
    });
  }

  const data = await dashboardService.getTeacherSummary({
    user: req.user,
    period,
  });

  return sendResponse(res).success({
    message: "Teacher summary fetched",
    data,
  });
});

/**
 * GET /dashboard/teacher/defaulters?limit=5&threshold=75
 */
const getTeacherDefaulters = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 5;
  const threshold = parseInt(req.query.threshold, 10) || 75;

  const data = await dashboardService.getTeacherDefaulters({
    user: req.user,
    limit: Math.min(limit, 20),
    threshold,
  });

  return sendResponse(res).success({
    message: "Defaulters fetched",
    data,
  });
});

/**
 * GET /dashboard/upcoming-holidays?limit=3&days=60
 */
const getUpcomingHolidays = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 3;
  const days = parseInt(req.query.days, 10) || 60;

  const data = await dashboardService.getUpcomingHolidays({
    limit: Math.min(limit, 10),
    days: Math.min(days, 365),
  });

  return sendResponse(res).success({
    message: "Upcoming holidays fetched",
    data,
  });
});

module.exports = {
  getTeacherSummary,
  getTeacherDefaulters,
  getUpcomingHolidays,
};
