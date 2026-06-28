"use strict";

const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly, adminOrTeacher } = require("../middlewares/rbac.middleware");

router.use(authenticate);

// ─── Available to BOTH admin & teacher ───
router.get("/", adminOrTeacher, notificationController.list);
router.get(
  "/unread-count",
  adminOrTeacher,
  notificationController.getUnreadCount,
);
router.patch("/:id/read", adminOrTeacher, notificationController.markAsRead);
router.patch("/read-all", adminOrTeacher, notificationController.markAllRead);
router.delete("/:id", adminOrTeacher, notificationController.remove);

// ─── ADMIN ONLY ───
router.post(
  "/check-pending",
  adminOnly,
  notificationController.checkPendingNow,
);

module.exports = router;
