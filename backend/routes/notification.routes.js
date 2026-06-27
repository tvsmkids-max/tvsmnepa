"use strict";

const express = require("express");
const router = express.Router();
const notificationService = require("../services/notification.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");

router.use(authenticate);
router.use(adminOnly); // ─── ADMIN ONLY for ALL notification routes ───

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await notificationService.getMyNotifications(
      req.user._id,
      req.user.role,
    );
    return sendResponse(res).success({
      message: "Notifications fetched",
      data,
    });
  }),
);

router.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const count = await notificationService.getUnreadCount(
      req.user._id,
      req.user.role,
    );
    return sendResponse(res).success({
      message: "Unread count",
      data: { count },
    });
  }),
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await notificationService.markAsRead(req.params.id, req.user._id);
    return sendResponse(res).success({ message: "Marked as read" });
  }),
);

router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user._id, req.user.role);
    return sendResponse(res).success({ message: "All marked as read" });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await notificationService.delete(req.params.id);
    if (!result) {
      return sendResponse(res).notFound({ message: "Notification not found" });
    }
    return sendResponse(res).success({ message: "Notification deleted" });
  }),
);

// Manual trigger for testing (admin only)
router.post(
  "/check-pending",
  asyncHandler(async (req, res) => {
    const result = await notificationService.checkPendingAttendance();
    return sendResponse(res).success({
      message: "Pending check completed",
      data: result,
    });
  }),
);

module.exports = router;
