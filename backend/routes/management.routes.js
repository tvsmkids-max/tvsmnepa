"use strict";

const express = require("express");
const router = express.Router();
const managementController = require("../controllers/management.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");
const {
  validateManagementKey,
} = require("../middlewares/managementAuth.middleware");

// ADMIN
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

// PUBLIC
router.get("/:secretKey/validate", managementController.validateAccess);
router.get(
  "/:secretKey/range",
  validateManagementKey,
  managementController.getRangeOverview,
);
router.get(
  "/:secretKey/class/:classId",
  validateManagementKey,
  managementController.getClassDetail,
);
router.get(
  "/:secretKey/monthly-report",
  validateManagementKey,
  managementController.getMonthlyReport,
);
router.get(
  "/:secretKey/monthly-class/:classId",
  validateManagementKey,
  managementController.getMonthlyClassDetail,
);
router.get(
  "/:secretKey/monthly-matrix",
  validateManagementKey,
  managementController.getMonthlyMatrix,
);

module.exports = router;
