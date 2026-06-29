"use strict";

const principalService = require("../services/principal.service");
const { sendResponse } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getDashboard = asyncHandler(async (req, res) => {
  const data = await principalService.getDashboard();
  return sendResponse(res).success({
    message: "Principal dashboard fetched",
    data,
  });
});

module.exports = {
  getDashboard,
};
