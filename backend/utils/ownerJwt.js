"use strict";

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

// Owner tokens use their own secret (derived, or OWNER_JWT_SECRET) and audience,
// so a school token can never pass as an owner token, nor the reverse.
const secret = () =>
  process.env.OWNER_JWT_SECRET ||
  crypto.createHmac("sha256", env.JWT_SECRET).update("platform-owner").digest("hex");
const OPTS = { issuer: "school-attendance-system", audience: "platform-owner-client" };

const signOwnerToken = (owner) =>
  jwt.sign({ id: String(owner._id), role: "owner" }, secret(), {
    ...OPTS,
    expiresIn: process.env.OWNER_JWT_EXPIRES_IN || "8h",
  });

const verifyOwnerToken = (token) => {
  try {
    const payload = jwt.verify(token, secret(), OPTS);
    return payload.role === "owner" ? payload : null;
  } catch {
    return null;
  }
};

module.exports = { signOwnerToken, verifyOwnerToken };
