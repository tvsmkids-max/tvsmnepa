"use strict";

const { verifyAccessToken, extractBearerToken } = require("../utils/jwtHelper");
const User = require("../models/User.model");
const { sendResponse } = require("../utils/apiResponse");
const logger = require("../utils/logger");

const authenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return sendResponse(res).unauthorized({
        message: "Access token required. Please login.",
      });
    }

    const { valid, payload, expired } = verifyAccessToken(token);

    if (expired) {
      return sendResponse(res).unauthorized({
        message: "Token expired. Please refresh your session.",
      });
    }

    if (!valid || !payload) {
      return sendResponse(res).unauthorized({
        message: "Invalid token. Please login again.",
      });
    }

    const user = await User.findById(payload.id).select(
      "-password -refreshTokens -loginAttempts -lockUntil",
    );

    if (!user) {
      return sendResponse(res).unauthorized({
        message: "User account not found. Please contact admin.",
      });
    }

    if (!user.isActive) {
      return sendResponse(res).unauthorized({
        message: "Your account has been deactivated. Please contact admin.",
      });
    }

    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return sendResponse(res).unauthorized({
      message: "Authentication failed. Please login again.",
    });
  }
};

module.exports = { authenticate };
