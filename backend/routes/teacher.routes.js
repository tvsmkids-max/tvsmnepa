"use strict";

const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacher.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly, adminOrTeacher } = require("../middlewares/rbac.middleware");

router.use(authenticate);

// Teacher can access their own profile
router.get("/me", adminOrTeacher, teacherController.getMyProfile);

// Admin-only routes
router.get("/", adminOnly, teacherController.list);
router.get("/:id", adminOnly, teacherController.getById);
router.post("/", adminOnly, teacherController.create);
router.put("/:id", adminOnly, teacherController.update);
router.delete("/:id", adminOnly, teacherController.remove);
router.patch("/:id/assign", adminOnly, teacherController.assignClasses);
router.patch("/:id/reset-password", adminOnly, teacherController.resetPassword);

module.exports = router;
