"use strict";

const jwt = require("jsonwebtoken");
const env = require("../config/env");
const logger = require("./logger");

/**
 * Generate access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: "school-attendance-system",
    audience: "school-attendance-client",
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: "school-attendance-system",
    audience: "school-attendance-client",
  });
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    return {
      valid: true,
      payload: jwt.verify(token, env.JWT_SECRET, {
        issuer: "school-attendance-system",
        audience: "school-attendance-client",
      }),
      expired: false,
    };
  } catch (error) {
    logger.warn(`JWT verification failed: ${error.message}`);
    return {
      valid: false,
      payload: null,
      expired: error.name === "TokenExpiredError",
    };
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return {
      valid: true,
      payload: jwt.verify(token, env.JWT_REFRESH_SECRET, {
        issuer: "school-attendance-system",
        audience: "school-attendance-client",
      }),
      expired: false,
    };
  } catch (error) {
    logger.warn(`Refresh token verification failed: ${error.message}`);
    return {
      valid: false,
      payload: null,
      expired: error.name === "TokenExpiredError",
    };
  }
};

/**
 * Generate both tokens for login response
 */
const generateTokenPair = (user) => {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken({ id: user._id.toString() }),
  };
};

/**
 * Extract token from Authorization header
 */
const extractBearerToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  extractBearerToken,
};
