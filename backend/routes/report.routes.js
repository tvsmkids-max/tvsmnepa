"use strict";

const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly, adminOrTeacher } = require("../middlewares/rbac.middleware");

router.use(authenticate);

router.get("/daily", adminOrTeacher, reportController.getDaily);
router.get("/monthly", adminOrTeacher, reportController.getMonthly);
router.get(
  "/monthly/class/:classId",
  adminOrTeacher,
  reportController.getMonthlyClassDetail,
);
router.get("/student/:id", adminOrTeacher, reportController.getStudent);
router.get("/defaulters", adminOrTeacher, reportController.getDefaulters);
router.get(
  "/class-trend/:classId",
  adminOrTeacher,
  reportController.getClassTrend,
);
router.get("/analytics", adminOnly, reportController.getAnalytics);

// ─── NEW: Attendance Register ───
router.get("/register", adminOrTeacher, reportController.getRegister);

module.exports = router;
