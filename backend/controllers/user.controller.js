"use strict";

const User = require("../models/User.model");
const { hashPassword, validatePasswordStrength } = require("../utils/passwordHelper");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/apiResponse");
const { createAuditLog } = require("../middlewares/audit.middleware");

const list = asyncHandler(async (req, res) => {
  const users = await User.find({})
    .select("name role linkedClass isActive lastLogin loginAttempts lockUntil passwordChangedAt createdAt")
    .populate("linkedClass", "name section")
    .sort({ role: 1, name: 1 })
    .lean();

  const now = Date.now();
  const data = users.map((user) => ({
    ...user,
    isLocked: Boolean(user.lockUntil && new Date(user.lockUntil).getTime() > now),
  }));

  return sendResponse(res).success({ message: "Users fetched", data });
});

const setStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") {
    return sendResponse(res).badRequest({ message: "isActive must be true or false" });
  }

  const user = await User.findById(req.params.id);
  if (!user) return sendResponse(res).notFound({ message: "User not found" });

  const before = { isActive: user.isActive };
  await User.updateOne({ _id: user._id }, { $set: { isActive } }, { runValidators: false });

  await createAuditLog({
    user: req.user, action: isActive ? "UNLOCK" : "LOCK", module: "User",
    description: `${isActive ? "Activated" : "Deactivated"} account ${user.name}`,
    resourceId: user._id, resourceType: "User", before, after: { isActive }, req,
  });

  return sendResponse(res).success({ message: `Account ${isActive ? "activated" : "deactivated"}` });
});

const resetCredential = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("+password +refreshTokens");
  if (!user) return sendResponse(res).notFound({ message: "User not found" });

  const password = String(req.body.password ?? "").trim();
  let hashed;

  if (user.role === "class") {
    if (!/^\d{5}$/.test(password)) {
      return sendResponse(res).badRequest({ message: "Class PIN must be exactly 5 digits" });
    }
    hashed = await hashPassword(password);
  } else {
    const validation = validatePasswordStrength(password);
    if (!validation.isValid) {
      return sendResponse(res).badRequest({ message: validation.errors.join(". ") });
    }
    hashed = await hashPassword(password);
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { password: hashed, passwordChangedAt: new Date(), refreshTokens: [], loginAttempts: 0, lockUntil: null } },
    { runValidators: false },
  );

  await createAuditLog({
    user: req.user, action: "UPDATE", module: "User",
    description: `Reset credential for account ${user.name}`,
    resourceId: user._id, resourceType: "User", req,
  });

  return sendResponse(res).success({ message: "Credential reset successfully" });
});

const unlock = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return sendResponse(res).notFound({ message: "User not found" });
  await User.updateOne(
    { _id: user._id },
    { $set: { loginAttempts: 0, lockUntil: null } },
    { runValidators: false },
  );

  await createAuditLog({
    user: req.user, action: "UNLOCK", module: "User",
    description: `Cleared login lock for account ${user.name}`,
    resourceId: user._id, resourceType: "User", req,
  });

  return sendResponse(res).success({ message: "Account lock cleared" });
});

module.exports = { list, setStatus, resetCredential, unlock };