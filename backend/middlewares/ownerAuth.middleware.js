"use strict";

const Owner = require("../models/Owner.model");
const { verifyOwnerToken } = require("../utils/ownerJwt");
const { extractBearerToken } = require("../utils/jwtHelper");
const { sendResponse } = require("../utils/apiResponse");

const authenticateOwner = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  const payload = token && verifyOwnerToken(token);
  if (!payload) {
    return sendResponse(res).unauthorized({ message: "Owner login required." });
  }
  const owner = await Owner.findById(payload.id).select("-password -loginAttempts -lockUntil");
  if (!owner || !owner.isActive) {
    return sendResponse(res).unauthorized({ message: "Owner account not available." });
  }
  // A password change invalidates older tokens.
  if (owner.passwordChangedAt && payload.iat * 1000 < owner.passwordChangedAt.getTime()) {
    return sendResponse(res).unauthorized({ message: "Session expired. Please login again." });
  }
  req.owner = owner;
  next();
};

module.exports = { authenticateOwner };
