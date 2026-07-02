"use strict";

const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOrTeacher, anyRole } = require("../middlewares/rbac.middleware");

router.use(authenticate);

// Teacher-specific endpoints
router.get(
  "/teacher/summary",
  adminOrTeacher,
  dashboardController.getTeacherSummary,
);
router.get(
  "/teacher/defaulters",
  adminOrTeacher,
  dashboardController.getTeacherDefaulters,
);

// Common: upcoming holidays (all roles)
router.get(
  "/upcoming-holidays",
  anyRole,
  dashboardController.getUpcomingHolidays,
);

module.exports = router;
