"use strict";

const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const sessionRoutes = require("./session.routes");
const settingsRoutes = require("./settings.routes");
const classRoutes = require("./class.routes");
const teacherRoutes = require("./teacher.routes");
const studentRoutes = require("./student.routes");
const attendanceRoutes = require("./attendance.routes");
const holidayRoutes = require("./holiday.routes");
const notificationRoutes = require("./notification.routes");
const reportRoutes = require("./report.routes");
const importRoutes = require("./import.routes");
const analyticsRoutes = require("./analytics.routes");
const activityLogRoutes = require("./activityLog.routes");
const promotionRoutes = require("./promotion.routes");
const backupRoutes = require("./backup.routes");
const shiftRoutes = require("./shift.routes");
const managementRoutes = require("./management.routes");

router.use("/auth", authRoutes);
router.use("/sessions", sessionRoutes);
router.use("/settings", settingsRoutes);
router.use("/classes", classRoutes);
router.use("/teachers", teacherRoutes);
router.use("/students", studentRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/holidays", holidayRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", reportRoutes);
router.use("/import", importRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/activity-logs", activityLogRoutes);
router.use("/promotion", promotionRoutes);
router.use("/backup", backupRoutes);
router.use("/shift", shiftRoutes);
router.use("/management", managementRoutes);

router.get("/health", (req, res) => {
  const { getConnectionStatus } = require("../config/db");
  const dbStatus = getConnectionStatus();
  res.status(200).json({
    success: true,
    message: "School Attendance API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: { connected: dbStatus.isConnected, host: dbStatus.host || "N/A" },
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

module.exports = router;
