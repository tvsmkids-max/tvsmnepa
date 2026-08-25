"use strict";

const path = require("path");
// Explicitly load .env from the backend directory
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");

// Support both common naming conventions
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error(
    "ERROR: Neither MONGO_URI nor MONGODB_URI was found in .env file!",
  );
  console.error("Checked path:", path.resolve(__dirname, "../.env"));
  process.exit(1);
}

async function migrate() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully!\n");

    const db = mongoose.connection.db;
    const studentsCollection = db.collection("students");

    // Step 1: Count how many students have rollNumber
    const countBefore = await studentsCollection.countDocuments({
      rollNumber: { $exists: true },
    });
    console.log(`Found ${countBefore} students with rollNumber field.`);

    if (countBefore === 0) {
      console.log("Nothing to clean. All students are already roll-free!");
      await mongoose.disconnect();
      return;
    }

    // Step 2: Remove rollNumber from all student documents
    const result = await studentsCollection.updateMany(
      { rollNumber: { $exists: true } },
      { $unset: { rollNumber: "" } },
    );
    console.log(`Cleaned ${result.modifiedCount} student records.`);

    // Step 3: Drop old rollNumber indexes
    const indexes = await studentsCollection.indexes();
    let droppedCount = 0;

    for (const idx of indexes) {
      if (idx.key && idx.key.rollNumber) {
        try {
          await studentsCollection.dropIndex(idx.name);
          console.log(`Dropped old index: ${idx.name}`);
          droppedCount++;
        } catch (err) {
          console.warn(`Could not drop index ${idx.name}: ${err.message}`);
        }
      }
    }
    console.log(`Dropped ${droppedCount} legacy rollNumber indexes.`);

    // Step 4: Verify
    const countAfter = await studentsCollection.countDocuments({
      rollNumber: { $exists: true },
    });
    console.log(
      `\nVerification: ${countAfter} students still have rollNumber.`,
    );
    console.log(
      countAfter === 0
        ? "Migration SUCCESSFUL!"
        : "WARNING: Some records still have rollNumber.",
    );

    await mongoose.disconnect();
    console.log("\nDisconnected. Done!");
  } catch (err) {
    console.error("Migration FAILED:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrate();
