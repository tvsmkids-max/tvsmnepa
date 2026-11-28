"use strict";

const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/apiResponse");
const { authenticateOwner } = require("../middlewares/ownerAuth.middleware");
const ownerService = require("../services/owner.service");
const platformService = require("../services/platform.service");
const schoolService = require("../services/school.service");
const mongoose = require("mongoose");

const okId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id) ? next() : sendResponse(res).badRequest({ message: "Invalid id" });

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = await ownerService.login(req.body || {});
    return sendResponse(res).success({ message: "Login successful", data });
  }),
);

router.use(authenticateOwner);

router.get("/me", (req, res) =>
  sendResponse(res).success({ message: "OK", data: ownerService.publicOwner(req.owner) }),
);

router.post(
  "/change-password",
  asyncHandler(async (req, res) => {
    const token = await ownerService.changePassword(req.owner._id, req.body || {});
    return sendResponse(res).success({ message: "Password changed", data: { token } });
  }),
);

router.get(
  "/platform",
  asyncHandler(async (req, res) =>
    sendResponse(res).success({ message: "OK", data: await platformService.getPublic() }),
  ),
);
router.put(
  "/platform",
  asyncHandler(async (req, res) =>
    sendResponse(res).success({ message: "Saved", data: await platformService.update(req.owner._id, req.body || {}) }),
  ),
);

router.get(
  "/schools",
  asyncHandler(async (req, res) =>
    sendResponse(res).success({ message: "OK", data: await schoolService.list({ q: req.query.q }) }),
  ),
);
router.post(
  "/schools",
  asyncHandler(async (req, res) =>
    sendResponse(res).created({ message: "School created", data: await schoolService.create(req.owner._id, req.body || {}) }),
  ),
);
router.get(
  "/schools/:id",
  okId,
  asyncHandler(async (req, res) =>
    sendResponse(res).success({ message: "OK", data: await schoolService.get(req.params.id) }),
  ),
);
router.put(
  "/schools/:id",
  okId,
  asyncHandler(async (req, res) =>
    sendResponse(res).success({ message: "Saved", data: await schoolService.update(req.owner._id, req.params.id, req.body || {}) }),
  ),
);
router.patch(
  "/schools/:id/status",
  okId,
  asyncHandler(async (req, res) =>
    sendResponse(res).success({ message: "Status updated", data: await schoolService.setStatus(req.owner._id, req.params.id, (req.body || {}).status) }),
  ),
);

module.exports = router;
