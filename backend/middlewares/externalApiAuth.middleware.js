"use strict";

const crypto = require("crypto");
const ExternalApiKey = require("../models/ExternalApiKey.model");
const env = require("../config/env");
const { sendResponse } = require("../utils/apiResponse");
const { getClientIp } = require("./audit.middleware");

const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const safeEqualString = (a, b) => {
  const digestA = crypto.createHash("sha256").update(String(a)).digest();
  const digestB = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(digestA, digestB);
};

const extractExternalKey = (req) => {
  const headerKey = req.headers["x-api-key"];
  if (headerKey && typeof headerKey === "string" && headerKey.trim()) {
    return headerKey.trim();
  }

  const authHeader = req.headers.authorization;
  if (
    authHeader &&
    typeof authHeader === "string" &&
    authHeader.startsWith("Bearer ")
  ) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  return null;
};

/**
 * Strictly blocks any mutating HTTP verb on external read-only endpoints.
 */
const enforceReadOnly = (req, res, next) => {
  if (!READ_ONLY_METHODS.has(req.method.toUpperCase())) {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return sendResponse(res).error({
      statusCode: 405,
      message: "Read-only API: Only GET requests are permitted.",
    });
  }
  return next();
};

/**
 * Validates the external API key from X-API-Key or Authorization: Bearer header.
 * Supports both Admin-created database keys and optional EXTERNAL_READONLY_API_KEY in .env.
 */
const validateExternalApiKey = async (req, res, next) => {
  try {
    const providedKey = extractExternalKey(req);

    if (!providedKey) {
      return sendResponse(res).unauthorized({
        message:
          "External API key required. Provide it in the X-API-Key header.",
      });
    }

    // 1. Check static .env key if configured
    if (
      env.EXTERNAL_READONLY_API_KEY &&
      env.EXTERNAL_READONLY_API_KEY.length >= 16 &&
      safeEqualString(providedKey, env.EXTERNAL_READONLY_API_KEY)
    ) {
      req.externalClient = {
        id: "env",
        label: "Environment Read-Only Key",
      };
      return next();
    }

    // 2. Check database-managed API keys
    const keyDoc = await ExternalApiKey.validateKey(providedKey);
    if (!keyDoc) {
      return sendResponse(res).unauthorized({
        message: "Invalid, revoked, or expired external API key.",
      });
    }

    // 3. Enforce per-key allowedOrigins if configured and Origin header is sent
    const origin = req.headers.origin;
    if (
      origin &&
      Array.isArray(keyDoc.allowedOrigins) &&
      keyDoc.allowedOrigins.length > 0 &&
      !keyDoc.allowedOrigins.includes(origin)
    ) {
      return sendResponse(res).forbidden({
        message: `Origin ${origin} is not authorized for this API key.`,
      });
    }

    // Fire-and-forget usage tracking
    ExternalApiKey.logUsage(keyDoc._id, getClientIp(req)).catch(() => {});

    req.externalClient = {
      id: keyDoc._id,
      label: keyDoc.label,
      keyPrefix: keyDoc.keyPrefix,
    };

    return next();
  } catch {
    return sendResponse(res).error({
      statusCode: 500,
      message: "External API authentication failed.",
    });
  }
};

module.exports = {
  enforceReadOnly,
  validateExternalApiKey,
};
