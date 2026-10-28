"use strict";

const mongoose = require("mongoose");
const User = require("../models/User.model");
const Attendance = require("../models/Attendance.model");
const Teacher = require("../models/Teacher.model");
const Class = require("../models/Class.model");
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

const updateDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return sendResponse(res).notFound({ message: "User not found" });

  const name = String(req.body.name ?? "").trim();
  if (name.length < 2 || name.length > 100) {
    return sendResponse(res).badRequest({ message: "Name must be between 2 and 100 characters" });
  }

  const updates = { name };
  if (user.role === "class") {
    const linkedClass = req.body.linkedClass || null;
    if (linkedClass && !mongoose.isValidObjectId(linkedClass)) {
      return sendResponse(res).badRequest({ message: "Invalid linked class" });
    }
    if (linkedClass) {
      const classExists = await Class.exists({ _id: linkedClass });
      if (!classExists) return sendResponse(res).badRequest({ message: "Linked class not found" });
    }
    updates.linkedClass = linkedClass;
  }

  const before = { name: user.name, linkedClass: user.linkedClass };
  await User.updateOne({ _id: user._id }, { $set: updates }, { runValidators: false });
  await createAuditLog({
    user: req.user, action: "UPDATE", module: "User",
    description: `Updated account details for ${name}`,
    resourceId: user._id, resourceType: "User", before,
    after: updates, req,
  });

  return sendResponse(res).success({ message: "User details updated" });
});

const remove = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return sendResponse(res).notFound({ message: "User not found" });
  if (user._id.equals(req.user._id)) {
    return sendResponse(res).badRequest({ message: "You cannot delete your currently logged-in admin account" });
  }

  if (user.role === "admin") {
    const otherAdminCount = await User.countDocuments({ role: "admin", _id: { $ne: user._id } });
    if (otherAdminCount === 0) {
      return sendResponse(res).badRequest({ message: "At least one admin account must remain" });
    }
  }

  const attendanceReferences = await Attendance.countDocuments({
    $or: [{ markedBy: user._id }, { editedBy: user._id }],
  });
  // Preserve a permanent attribution snapshot before removing the account.
  // Attendance documents themselves are never deleted.
  await Attendance.updateMany(
    { markedBy: user._id },
    { $set: { markedByName: user.name } },
  );
  await Attendance.updateMany(
    { editedBy: user._id },
    { $set: { editedByName: user.name } },
  );

  const teacher = await Teacher.findOne({ user: user._id });
  if (teacher) {
    await Class.updateMany(
      { $or: [{ classTeacher: teacher._id }, { assignedTeachers: teacher._id }] },
      { $pull: { assignedTeachers: teacher._id }, $unset: { classTeacher: "" } },
    );
    await Teacher.deleteOne({ _id: teacher._id });
  }

  const before = user.toObject();
  await User.deleteOne({ _id: user._id });
  await createAuditLog({
    user: req.user, action: "DELETE", module: "User",
    description: `Deleted account ${user.name}`,
    resourceId: user._id, resourceType: "User", before, req,
  });

  return sendResponse(res).success({ message: "User deleted successfully" });
});

module.exports = { list, setStatus, resetCredential, unlock, updateDetails, remove };