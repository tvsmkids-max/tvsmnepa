"use strict";

// Creates the platform owner login. Usage (never stores a default password):
//   OWNER_USERNAME=you OWNER_PASSWORD='Strong#Pass1' [OWNER_NAME="Your Name"] node scripts/createOwner.js
// Only adds one document to the new "owners" collection; touches nothing else.
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const env = require("../config/env");
const Owner = require("../models/Owner.model");
const { hashPassword, validatePasswordStrength } = require("../utils/passwordHelper");

(async () => {
  const username = String(process.env.OWNER_USERNAME || "").trim().toLowerCase();
  const password = String(process.env.OWNER_PASSWORD || "");
  const name = String(process.env.OWNER_NAME || "Platform Owner").trim();
  if (username.length < 3) throw new Error("Set OWNER_USERNAME (min 3 characters)");
  const strength = validatePasswordStrength(password);
  if (!strength.isValid) throw new Error(`OWNER_PASSWORD too weak: ${strength.errors.join("; ")}`);
  await mongoose.connect(env.MONGODB_URI);
  if (await Owner.exists({ username })) {
    console.log(`Owner "${username}" already exists. Nothing changed.`);
  } else {
    await Owner.create({ name, username, password: await hashPassword(password) });
    console.log(`Owner "${username}" created.`);
  }
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
