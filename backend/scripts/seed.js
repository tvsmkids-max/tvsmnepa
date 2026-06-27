"use strict";

require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const env = require("../config/env");
const { hashPassword } = require("../utils/passwordHelper");
const User = require("../models/User.model");

const seed = async () => {
  try {
    console.log("\n Starting production seed...");

    await mongoose.connect(env.MONGODB_URI);
    const dbName = mongoose.connection.name;
    console.log(` Connected to database: "${dbName}"`);

    if (dbName === "test") {
      console.error(" Wrong database! Fix MONGODB_URI");
      process.exit(1);
    }

    console.log("\n Dropping ALL collections (clean start)...");
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name);

    const toDrop = [
      "users",
      "teachers",
      "classes",
      "students",
      "academicsessions",
      "settings",
      "notifications",
      "activitylogs",
      "attendances",
      "holidays",
    ];

    for (const col of toDrop) {
      if (names.includes(col)) {
        await db.collection(col).drop();
        console.log(`   Dropped: ${col}`);
      }
    }

    // ═══════════════════════════════════════════════
    //  CREATE ONLY ADMIN USER — Nothing else
    // ═══════════════════════════════════════════════
    const adminPassword = await hashPassword(env.ADMIN_PASSWORD);
    const admin = await User.create({
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL,
      password: adminPassword,
      role: "admin",
      isActive: true,
    });

    await mongoose.disconnect();

    console.log("\n══════════════════════════════════════════");
    console.log("   PRODUCTION READY — Clean Install");
    console.log("══════════════════════════════════════════");
    console.log("");
    console.log("  Admin Login Credentials:");
    console.log(`    Email   : ${admin.email}`);
    console.log(`    Password: ${env.ADMIN_PASSWORD}`);
    console.log(`    Name    : ${admin.name}`);
    console.log("");
    console.log("  Next Steps (do via admin panel):");
    console.log("    1. Login as admin");
    console.log("    2. Configure School Settings");
    console.log("    3. Create Academic Session → Activate");
    console.log("    4. Add Classes");
    console.log("    5. Add Teachers");
    console.log("    6. Add Students");
    console.log("    7. Start marking attendance");
    console.log("");
    console.log("══════════════════════════════════════════\n");
  } catch (error) {
    console.error("\n Seed failed:", error.message);
    console.error(error);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  }
};

seed();
