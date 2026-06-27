"use strict";

const analyticsService = require("../services/analytics.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getQuickStats = asyncHandler(async (req, res) => {
  const data = await analyticsService.getQuickStats(req.user);
  return sendResponse(res).success({
    message: "Quick stats fetched",
    data,
  });
});

const getTrend = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const data = await analyticsService.getTrend(req.user, days);
  return sendResponse(res).success({
    message: "Trend data fetched",
    data,
  });
});

const getClassComparison = asyncHandler(async (req, res) => {
  const data = await analyticsService.getClassComparison(req.user);
  return sendResponse(res).success({
    message: "Class comparison fetched",
    data,
  });
});

const getDistribution = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDistribution(req.user);
  return sendResponse(res).success({
    message: "Distribution fetched",
    data,
  });
});

const getTopDefaulters = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const data = await analyticsService.getTopDefaulters(req.user, limit);
  return sendResponse(res).success({
    message: "Top defaulters fetched",
    data,
  });
});

const getInsights = asyncHandler(async (req, res) => {
  const data = await analyticsService.getInsights(req.user);
  return sendResponse(res).success({
    message: "Insights fetched",
    data,
  });
});

module.exports = {
  getQuickStats,
  getTrend,
  getClassComparison,
  getDistribution,
  getTopDefaulters,
  getInsights,
};
