"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const env = require("../config/env");
const User = require("../models/User.model");
const { hashPassword, validatePasswordStrength } = require("../utils/passwordHelper");

const recoverAdminPassword = async () => {
  const accountId = process.argv[2];
  const recoveryToken = process.env.ADMIN_RECOVERY_TOKEN;
  const providedToken = process.env.ADMIN_RECOVERY_CONFIRMATION;
  const newPassword = process.env.ADMIN_NEW_PASSWORD;

  if (!recoveryToken || !providedToken || recoveryToken !== providedToken) {
    throw new Error("Set ADMIN_RECOVERY_TOKEN and matching ADMIN_RECOVERY_CONFIRMATION on the server");
  }
  if (!newPassword) throw new Error("Set ADMIN_NEW_PASSWORD for this recovery run");

  const validation = validatePasswordStrength(newPassword);
  if (!validation.isValid) throw new Error(validation.errors.join(". "));
  await mongoose.connect(env.MONGODB_URI);

  const query = accountId ? { _id: accountId, role: "admin" } : { role: "admin", isActive: true };
  const admin = await User.findOne(query).select("+password +refreshTokens");
  if (!admin) throw new Error("Admin account not found");

  admin.password = await hashPassword(newPassword);
  admin.passwordChangedAt = new Date();
  admin.refreshTokens = [];
  admin.loginAttempts = 0;
  admin.lockUntil = null;
  admin.isActive = true;
  await admin.save();

  console.log(`Recovered admin password for ${admin.name}`);
  await mongoose.disconnect();
};

recoverAdminPassword().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
