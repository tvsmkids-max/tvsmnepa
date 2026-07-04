"use strict";

const express = require("express");
const router = express.Router();
const managementController = require("../controllers/management.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");
const {
  validateManagementKey,
} = require("../middlewares/managementAuth.middleware");

// ═══════════════════════════════════════════════════════════════════
//  ADMIN ROUTES — Manage access URLs
//  (Requires admin login)
// ═══════════════════════════════════════════════════════════════════
router.get(
  "/admin/access-urls",
  authenticate,
  adminOnly,
  managementController.listAccessUrls,
);
router.post(
  "/admin/access-urls",
  authenticate,
  adminOnly,
  managementController.createAccessUrl,
);
router.patch(
  "/admin/access-urls/:id/revoke",
  authenticate,
  adminOnly,
  managementController.revokeAccessUrl,
);
router.delete(
  "/admin/access-urls/:id",
  authenticate,
  adminOnly,
  managementController.deleteAccessUrl,
);

// ═══════════════════════════════════════════════════════════════════
//  PUBLIC ROUTES — Accessed via secret key
//  (NO login required, just valid key)
// ═══════════════════════════════════════════════════════════════════
router.get("/:secretKey/validate", managementController.validateAccess);

router.get(
  "/:secretKey/today",
  validateManagementKey,
  managementController.getTodayOverview,
);

router.get(
  "/:secretKey/monthly",
  validateManagementKey,
  managementController.getMonthlyTrends,
);

router.get(
  "/:secretKey/yearly",
  validateManagementKey,
  managementController.getYearlyPerformance,
);

router.get(
  "/:secretKey/alerts",
  validateManagementKey,
  managementController.getAlerts,
);

router.get(
  "/:secretKey/rankings",
  validateManagementKey,
  managementController.getRankings,
);

module.exports = router;
