"use strict";

require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const env = require("../config/env");

const fixIndexes = async () => {
  try {
    console.log(" Connecting to MongoDB...");
    await mongoose.connect(env.MONGODB_URI);

    const dbName = mongoose.connection.name;
    console.log(` Connected to: ${dbName}`);

    if (dbName === "test") {
      console.error(
        " Wrong database! Fix MONGODB_URI to include /school_attendance",
      );
      process.exit(1);
    }

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log("\n Inspecting collections:\n");

    for (const col of collections) {
      const name = col.name;
      const indexes = await db.collection(name).indexes();
      console.log(`──── ${name} ────`);

      for (const idx of indexes) {
        console.log(`  Index: ${idx.name}`);
      }

      // Drop bad indexes
      const badIndexes = indexes.filter((idx) => {
        const keys = Object.keys(idx.key || {});
        return (
          keys.includes("tenantId") ||
          keys.includes("username") ||
          idx.name === "tenantId_1_username_1"
        );
      });

      for (const bad of badIndexes) {
        try {
          await db.collection(name).dropIndex(bad.name);
          console.log(`   Dropped bad index: ${bad.name}`);
        } catch (e) {
          console.log(`   Could not drop ${bad.name}: ${e.message}`);
        }
      }
    }

    console.log("\n Index cleanup complete!");
    await mongoose.disconnect();
  } catch (error) {
    console.error(" Error:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

fixIndexes();
