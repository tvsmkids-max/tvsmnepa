"use strict";

const express = require("express");
const router = express.Router();
const studentController = require("../controllers/student.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly, adminOrTeacher } = require("../middlewares/rbac.middleware");

router.use(authenticate);

// ─── Static routes FIRST ───
router.get("/search", adminOrTeacher, studentController.search);
router.get("/sections", adminOrTeacher, studentController.getSections);
router.get("/", adminOrTeacher, studentController.list);

// ─── Bulk operations (admin only) ───
router.post("/bulk-delete", adminOnly, studentController.bulkDelete);

// ─── Create ───
router.post("/", adminOrTeacher, studentController.create);

// ─── Dynamic routes ───
router.get("/:id", adminOrTeacher, studentController.getById);
router.put("/:id", adminOrTeacher, studentController.update);

// ✅ CHANGED: Teacher can toggle Active/Inactive, service layer enforces restriction
router.patch("/:id/status", adminOrTeacher, studentController.updateStatus);

// Delete stays admin only
router.delete("/:id", adminOnly, studentController.remove);

module.exports = router;
