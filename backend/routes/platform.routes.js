"use strict";

const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/apiResponse");
const platformService = require("../services/platform.service");

// Public: the product brand for the login page, header and install name.
router.get(
  "/brand",
  asyncHandler(async (req, res) =>
    sendResponse(res).success({ message: "OK", data: await platformService.getPublic() }),
  ),
);

module.exports = router;
