"use strict";

const express = require("express");
const router = express.Router();
const AcademicSession = require("../models/AcademicSession.model");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/rbac.middleware");

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const sessions = await AcademicSession.find()
      .sort("-startDate")
      .populate("createdBy", "name")
      .lean();
    return sendResponse(res).success({
      message: "Sessions fetched",
      data: sessions,
    });
  }),
);

router.get(
  "/active",
  asyncHandler(async (req, res) => {
    const session = await AcademicSession.getActiveSession();
    return sendResponse(res).success({
      message: "Active session fetched",
      data: session,
    });
  }),
);

router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const session = await AcademicSession.create({
      ...req.body,
      createdBy: req.user._id,
    });
    return sendResponse(res).created({
      message: "Session created",
      data: session,
    });
  }),
);

router.patch(
  "/:id/activate",
  adminOnly,
  asyncHandler(async (req, res) => {
    const session = await AcademicSession.findById(req.params.id);
    if (!session) {
      return sendResponse(res).notFound({ message: "Session not found" });
    }
    session.isActive = true;
    await session.save();
    return sendResponse(res).success({
      message: "Session activated",
      data: session,
    });
  }),
);

router.put(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const session = await AcademicSession.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!session) {
      return sendResponse(res).notFound({ message: "Session not found" });
    }
    return sendResponse(res).success({
      message: "Session updated",
      data: session,
    });
  }),
);

router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const session = await AcademicSession.findById(req.params.id);
    if (!session) {
      return sendResponse(res).notFound({ message: "Session not found" });
    }
    if (session.isActive) {
      return sendResponse(res).badRequest({
        message: "Cannot delete active session",
      });
    }
    await AcademicSession.findByIdAndDelete(req.params.id);
    return sendResponse(res).success({ message: "Session deleted" });
  }),
);

module.exports = router;
