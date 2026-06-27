"use strict";

const attendanceService = require("../services/attendance.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { validateBody } = require("../middlewares/validate.middleware");
const {
  markAttendanceSchema,
  editAttendanceSchema,
  lockUnlockSchema,
} = require("../validators/attendance.validator");

const getSheet = asyncHandler(async (req, res) => {
  const { class: classId, date } = req.query;
  if (!classId || !date) {
    return sendResponse(res).badRequest({
      message: "class and date are required",
    });
  }
  const data = await attendanceService.getSheet({
    classId,
    date,
    user: req.user,
  });
  return sendResponse(res).success({
    message: "Attendance sheet fetched",
    data,
  });
});

const markAttendance = [
  validateBody(markAttendanceSchema),
  asyncHandler(async (req, res) => {
    const result = await attendanceService.markAttendance({
      classId: req.body.class,
      date: req.body.date,
      records: req.body.records,
      user: req.user,
      req,
    });
    return sendResponse(res).success({
      message: `Attendance saved successfully (${result.saved} records)`,
      data: result,
    });
  }),
];

const editSingle = [
  validateBody(editAttendanceSchema),
  asyncHandler(async (req, res) => {
    const updated = await attendanceService.editSingle({
      id: req.params.id,
      status: req.body.status,
      editReason: req.body.editReason,
      user: req.user,
      req,
    });
    return sendResponse(res).success({
      message: "Attendance updated successfully",
      data: updated,
    });
  }),
];

const lockAttendance = [
  validateBody(lockUnlockSchema),
  asyncHandler(async (req, res) => {
    const result = await attendanceService.lock({
      classId: req.body.class,
      date: req.body.date,
      user: req.user,
      req,
    });
    return sendResponse(res).success({
      message: `Locked ${result.locked} record(s)`,
      data: result,
    });
  }),
];

const unlockAttendance = [
  validateBody(lockUnlockSchema),
  asyncHandler(async (req, res) => {
    const result = await attendanceService.unlock({
      classId: req.body.class,
      date: req.body.date,
      user: req.user,
      req,
    });
    return sendResponse(res).success({
      message: `Unlocked ${result.unlocked} record(s)`,
      data: result,
    });
  }),
];

const getStudentHistory = asyncHandler(async (req, res) => {
  const data = await attendanceService.getStudentHistory({
    studentId: req.params.studentId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  return sendResponse(res).success({
    message: "Attendance history fetched",
    data,
  });
});

const getPending = asyncHandler(async (req, res) => {
  const pending = await attendanceService.getPendingToday();
  return sendResponse(res).success({
    message: "Pending attendance fetched",
    data: pending,
  });
});

const getTodayStats = asyncHandler(async (req, res) => {
  const data = await attendanceService.getTodayStats();
  return sendResponse(res).success({
    message: "Today stats fetched",
    data,
  });
});

module.exports = {
  getSheet,
  markAttendance,
  editSingle,
  lockAttendance,
  unlockAttendance,
  getStudentHistory,
  getPending,
  getTodayStats,
};
