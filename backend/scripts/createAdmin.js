"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const env = require("../config/env");
const User = require("../models/User.model");
const Settings = require("../models/Settings.model");
const { hashPassword } = require("../utils/passwordHelper");
const { ROLES } = require("../constants/roles");

const createAdmin = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const existing = await User.findOne({ email: env.ADMIN_EMAIL });

    if (existing) {
      console.log(`Admin already exists: ${env.ADMIN_EMAIL}`);
      await mongoose.disconnect();
      return;
    }

    const hashedPassword = await hashPassword(env.ADMIN_PASSWORD);

    const admin = await User.create({
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL,
      password: hashedPassword,
      role: ROLES.ADMIN,
      isActive: true,
    });

    console.log(`Admin created successfully: ${admin.email}`);

    const settingsExist = await Settings.findOne();
    if (!settingsExist) {
      await Settings.create({
        schoolName: env.DEFAULT_SCHOOL_NAME,
        updatedBy: admin._id,
      });
      console.log("Default settings created");
    }

    await mongoose.disconnect();
    console.log("Done. You can now login with:");
    console.log(`  Email: ${env.ADMIN_EMAIL}`);
    console.log(`  Password: ${env.ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("Error creating admin:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

createAdmin();
