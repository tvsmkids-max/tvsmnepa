"use strict";

const reportService = require("../services/report.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getDaily = asyncHandler(async (req, res) => {
  const data = await reportService.getDailyReport({
    date: req.query.date || new Date(),
    classId: req.query.class,
    user: req.user,
  });
  return sendResponse(res).success({ message: "Daily report", data });
});

const getMonthly = asyncHandler(async (req, res) => {
  const now = new Date();
  const data = await reportService.getMonthlyReport({
    year: parseInt(req.query.year) || now.getFullYear(),
    month: parseInt(req.query.month) || now.getMonth() + 1,
    classId: req.query.class,
    user: req.user,
  });
  return sendResponse(res).success({ message: "Monthly report", data });
});

const getStudent = asyncHandler(async (req, res) => {
  const data = await reportService.getStudentReport({
    studentId: req.params.id,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  return sendResponse(res).success({ message: "Student report", data });
});

const getDefaulters = asyncHandler(async (req, res) => {
  const data = await reportService.getDefaulterReport({
    classId: req.query.class,
    threshold: parseInt(req.query.threshold) || 75,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    user: req.user,
  });
  return sendResponse(res).success({ message: "Defaulter report", data });
});

const getClassTrend = asyncHandler(async (req, res) => {
  const data = await reportService.getClassTrend({
    classId: req.params.classId,
    days: parseInt(req.query.days) || 30,
  });
  return sendResponse(res).success({ message: "Class trend", data });
});

const getAnalytics = asyncHandler(async (req, res) => {
  const data = await reportService.getAnalyticsOverview();
  return sendResponse(res).success({ message: "Analytics overview", data });
});

module.exports = {
  getDaily,
  getMonthly,
  getStudent,
  getDefaulters,
  getClassTrend,
  getAnalytics,
};
