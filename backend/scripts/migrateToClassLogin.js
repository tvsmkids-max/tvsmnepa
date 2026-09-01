"use strict";

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const { hashPassword } = require("../utils/passwordHelper");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DEFAULT_PASSWORD = "Teacher@123";

if (!MONGO_URI) {
  console.error("ERROR: MONGO_URI not found in .env!");
  process.exit(1);
}

async function migrate() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected!\n");

    const db = mongoose.connection.db;
    const classesCollection = db.collection("classes");
    const usersCollection = db.collection("users");

    // ═══════════════════════════════════════════════════════════════════
    //  STEP 0: Drop legacy email_1 unique index on users collection
    // ═══════════════════════════════════════════════════════════════════
    try {
      await usersCollection.dropIndex("email_1");
      console.log(
        "✅ Successfully dropped legacy 'email_1' index from users collection.",
      );
    } catch (idxErr) {
      console.log("Note on email index:", idxErr.message);
    }

    // Step 1: Get all classes
    const classes = await classesCollection.find({}).toArray();
    console.log(`\nFound ${classes.length} classes.`);

    if (classes.length === 0) {
      console.log("No classes to migrate.");
      await mongoose.disconnect();
      return;
    }

    // Step 2: Hash default password
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
    console.log(`Default password hashed successfully: Teacher@123\n`);

    let created = 0;
    let skipped = 0;

    // Step 3: Create a User account for each class
    for (const cls of classes) {
      const className = `${cls.name}-${cls.section}`;

      // Check if a user already exists for this class
      const existingUser = await usersCollection.findOne({
        linkedClass: cls._id,
        role: "class",
      });

      if (existingUser) {
        console.log(`SKIP: ${className} (user already exists)`);
        skipped++;
        continue;
      }

      // Create User account
      await usersCollection.insertOne({
        name: className,
        password: hashedPassword,
        role: "class",
        linkedClass: cls._id,
        isActive: !cls.isArchived,
        refreshTokens: [],
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`CREATED: ${className}`);
      created++;
    }

    // Step 4: Verify Admin account exists
    const admin = await usersCollection.findOne({ role: "admin" });
    if (admin) {
      console.log(`\nAdmin account found: ${admin.name}`);
    } else {
      console.log("\n⚠️ WARNING: No admin account found!");
    }

    console.log(`\n═══════════════════════════════`);
    console.log(`Migration Complete!`);
    console.log(`Created: ${created} class login accounts`);
    console.log(`Skipped: ${skipped} (already existed)`);
    console.log(`Default Password: Teacher@123`);
    console.log(`═══════════════════════════════\n`);

    await mongoose.disconnect();
    console.log("Disconnected. Done!");
  } catch (err) {
    console.error("Migration FAILED:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrate();
