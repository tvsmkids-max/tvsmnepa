"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const externalApiController = require("../controllers/externalApi.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");
const {
  enforceReadOnly,
  validateExternalApiKey,
} = require("../middlewares/externalApiAuth.middleware");

// Dedicated rate limiter for external read-only consumers
const externalReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "External API rate limit exceeded. Please try again shortly.",
  },
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN ROUTES — Create / List / Revoke / Delete External API Keys
// ═══════════════════════════════════════════════════════════════
router.get(
  "/admin/keys",
  authenticate,
  adminOnly,
  externalApiController.listKeys,
);
router.post(
  "/admin/keys",
  authenticate,
  adminOnly,
  externalApiController.createKey,
);
router.patch(
  "/admin/keys/:id/revoke",
  authenticate,
  adminOnly,
  externalApiController.revokeKey,
);
router.delete(
  "/admin/keys/:id",
  authenticate,
  adminOnly,
  externalApiController.deleteKey,
);

// ═══════════════════════════════════════════════════════════════
//  EXTERNAL READ-ONLY DATA ROUTES (GET ONLY + X-API-Key Required)
// ═══════════════════════════════════════════════════════════════
router.use(externalReadLimiter);
router.use(enforceReadOnly);
router.use(validateExternalApiKey);

router.get("/status", externalApiController.getStatus);
router.get("/sessions", externalApiController.getSessions);
router.get("/classes", externalApiController.getClasses);
router.get(
  "/classes/:classId/attendance",
  externalApiController.getClassAttendance,
);
router.get("/overview", externalApiController.getDailyOverview);
router.get("/monthly-summary", externalApiController.getMonthlySummary);
router.get("/attendance", externalApiController.getAttendanceRecords);
router.get(
  "/students/:scholarNumber/attendance",
  externalApiController.getStudentAttendance,
);

module.exports = router;
