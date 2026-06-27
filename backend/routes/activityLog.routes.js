"use strict";

const express = require("express");
const router = express.Router();
const ActivityLog = require("../models/ActivityLog.model");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");

router.use(authenticate);
router.use(adminOnly);

// Get all logs with filters + pagination
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 30,
      user: userId,
      module,
      action,
      status,
      search,
      dateFrom,
      dateTo,
      sort = "-createdAt",
    } = req.query;

    const filter = {};

    if (userId) filter.user = userId;
    if (module) filter.module = module;
    if (action) filter.action = action;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { description: new RegExp(search, "i") },
        { userName: new RegExp(search, "i") },
        { module: new RegExp(search, "i") },
      ];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const safeLimit = Math.min(parseInt(limit, 10), 100);

    const [data, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .populate("user", "name email role")
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    return sendResponse(res).success({
      message: "Activity logs fetched",
      data,
      pagination: {
        page: parseInt(page, 10),
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  }),
);

// Get available filter options
router.get(
  "/filters",
  asyncHandler(async (req, res) => {
    const [modules, actions, users] = await Promise.all([
      ActivityLog.distinct("module"),
      ActivityLog.distinct("action"),
      ActivityLog.distinct("userName"),
    ]);

    return sendResponse(res).success({
      message: "Filter options",
      data: { modules, actions, users },
    });
  }),
);

module.exports = router;
