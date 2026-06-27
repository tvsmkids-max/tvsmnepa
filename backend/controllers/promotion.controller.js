"use strict";

const promotionService = require("../services/promotion.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const preview = asyncHandler(async (req, res) => {
  const { sourceClassId, sourceSessionId, targetClassId, targetSessionId } =
    req.body;

  if (
    !sourceClassId ||
    !sourceSessionId ||
    !targetClassId ||
    !targetSessionId
  ) {
    return sendResponse(res).badRequest({
      message:
        "All fields required: sourceClassId, sourceSessionId, targetClassId, targetSessionId",
    });
  }

  const data = await promotionService.preview({
    sourceClassId,
    sourceSessionId,
    targetClassId,
    targetSessionId,
  });

  return sendResponse(res).success({ message: "Preview ready", data });
});

const execute = asyncHandler(async (req, res) => {
  const {
    sourceClassId,
    sourceSessionId,
    targetClassId,
    targetSessionId,
    studentIds,
  } = req.body;

  if (
    !sourceClassId ||
    !sourceSessionId ||
    !targetClassId ||
    !targetSessionId
  ) {
    return sendResponse(res).badRequest({ message: "All fields required" });
  }

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return sendResponse(res).badRequest({ message: "No students selected" });
  }

  const data = await promotionService.execute({
    sourceClassId,
    sourceSessionId,
    targetClassId,
    targetSessionId,
    studentIds,
    user: req.user,
    req,
  });

  return sendResponse(res).success({
    message: `Promoted ${data.promoted} student(s) successfully`,
    data,
  });
});

module.exports = { preview, execute };
