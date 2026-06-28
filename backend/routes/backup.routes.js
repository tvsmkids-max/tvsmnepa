"use strict";

const express = require("express");
const router = express.Router();
const backupController = require("../controllers/backup.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");

router.use(authenticate);
router.use(adminOnly); // ─── ADMIN ONLY for ALL backup routes ───

router.get("/stats", backupController.getStats);
router.get("/create", backupController.createBackup);
router.post("/validate", backupController.validateBackup);
router.post("/restore", backupController.restoreBackup);

module.exports = router;
