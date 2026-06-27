"use strict";

const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendance.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly, adminOrTeacher } = require("../middlewares/rbac.middleware");

router.use(authenticate);

// ─── GET Routes ────────────────────────────────────────────────
router.get("/sheet", adminOrTeacher, attendanceController.getSheet);
router.get("/pending", adminOrTeacher, attendanceController.getPending);
router.get("/today-stats", adminOrTeacher, attendanceController.getTodayStats);
router.get(
  "/student/:studentId",
  adminOrTeacher,
  attendanceController.getStudentHistory,
);

// ─── POST/PUT Routes ───────────────────────────────────────────
router.post("/mark", adminOrTeacher, attendanceController.markAttendance);
router.put("/:id", adminOrTeacher, attendanceController.editSingle);

// ─── Admin Only ────────────────────────────────────────────────
router.post("/lock", adminOnly, attendanceController.lockAttendance);
router.post("/unlock", adminOnly, attendanceController.unlockAttendance);

module.exports = router;
