"use strict";

const express = require("express");
const router = express.Router();
const examController = require("../controllers/exam/exam.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");

// Phase 1: every examination route is Admin-only and enforced here on the
// server. Class-teacher access is added in Phase 2 with per-class checks.
router.use(authenticate, adminOnly);

router.get("/", examController.list);
router.post("/", examController.create);
router.get("/:id", examController.getById);
router.put("/:id", examController.update);
router.delete("/:id", examController.remove);
router.patch("/:id/status", examController.changeStatus);
router.get("/:id/audit", examController.listAudit);

router.get("/:id/classes", examController.listClassConfigs);
router.put("/:id/classes", examController.upsertClassConfigs);
router.delete("/:id/classes/:classId", examController.removeClassConfig);

module.exports = router;
