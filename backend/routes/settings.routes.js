"use strict";

const express = require("express");
const router = express.Router();
const Settings = require("../models/Settings.model");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");
const { restartScheduler } = require("../utils/scheduler");

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const settings = await Settings.getSettings();
    return sendResponse(res).success({
      message: "Settings fetched",
      data: settings,
    });
  }),
);

router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    settings.updatedBy = req.user._id;
    await settings.save();
    await settings.populate("activeSession");

    // Restart scheduler if lock time changed
    if (req.body.attendanceLockTime) {
      try {
        await restartScheduler();
      } catch {
        // ignore
      }
    }

    return sendResponse(res).success({
      message: "Settings updated",
      data: settings,
    });
  }),
);

module.exports = router;
