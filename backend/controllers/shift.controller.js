"use strict";

const shiftService = require("../services/shift.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Preview shift before execution
 */
const preview = asyncHandler(async (req, res) => {
  const { sourceClassId, targetClassId, studentIds } = req.body;

  const data = await shiftService.preview({
    sourceClassId,
    targetClassId,
    studentIds,
    user: req.user,
  });

  return sendResponse(res).success({
    message: "Shift preview generated",
    data,
  });
});

/**
 * Execute the shift
 */
const execute = asyncHandler(async (req, res) => {
  const { sourceClassId, targetClassId, studentIds } = req.body;

  const data = await shiftService.execute({
    sourceClassId,
    targetClassId,
    studentIds,
    user: req.user,
    req,
  });

  return sendResponse(res).success({
    message: `Successfully shifted ${data.shifted} student${data.shifted !== 1 ? "s" : ""} from ${data.sourceClass} to ${data.targetClass}`,
    data,
  });
});

module.exports = {
  preview,
  execute,
};
