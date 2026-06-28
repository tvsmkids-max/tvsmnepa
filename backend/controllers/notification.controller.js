"use strict";

const notificationService = require("../services/notification.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const list = asyncHandler(async (req, res) => {
  const data = await notificationService.getMyNotifications(
    req.user._id,
    req.user.role,
  );
  return sendResponse(res).success({
    message: "Notifications fetched",
    data,
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(
    req.user._id,
    req.user.role,
  );
  return sendResponse(res).success({
    message: "Unread count",
    data: { count },
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user._id);
  return sendResponse(res).success({ message: "Marked as read" });
});

const markAllRead = asyncHandler(async (req, res) => {
  const updated = await notificationService.markAllRead(
    req.user._id,
    req.user.role,
  );
  return sendResponse(res).success({
    message: `${updated} notification${updated !== 1 ? "s" : ""} marked as read`,
    data: { updated },
  });
});

const remove = asyncHandler(async (req, res) => {
  const result = await notificationService.delete(req.params.id);
  if (!result) {
    return sendResponse(res).notFound({ message: "Notification not found" });
  }
  return sendResponse(res).success({ message: "Notification deleted" });
});

const checkPendingNow = asyncHandler(async (req, res) => {
  const result = await notificationService.checkPendingAttendance();
  return sendResponse(res).success({
    message: "Pending check completed",
    data: result,
  });
});

module.exports = {
  list,
  getUnreadCount,
  markAsRead,
  markAllRead,
  remove,
  checkPendingNow,
};
