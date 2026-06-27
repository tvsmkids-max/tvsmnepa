"use strict";

require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const env = require("../config/env");
const User = require("../models/User.model");
const Teacher = require("../models/Teacher.model");

const cleanup = async () => {
  try {
    console.log(" Connecting to MongoDB...");
    await mongoose.connect(env.MONGODB_URI);

    if (mongoose.connection.name === "test") {
      console.error(" Wrong database!");
      process.exit(1);
    }

    console.log(` Database: ${mongoose.connection.name}\n`);

    // Find orphan teacher users (role=teacher but no Teacher document)
    const teacherUsers = await User.find({ role: "teacher" }).lean();
    console.log(` Found ${teacherUsers.length} users with role=teacher`);

    let orphans = 0;
    for (const u of teacherUsers) {
      const teacher = await Teacher.findOne({ user: u._id }).lean();
      if (!teacher) {
        console.log(`  Orphan user: ${u.email} (${u._id})`);
        await User.findByIdAndDelete(u._id);
        orphans++;
      }
    }

    console.log(`\n Cleaned up ${orphans} orphan user(s)`);

    await mongoose.disconnect();
  } catch (error) {
    console.error(" Error:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

cleanup();
