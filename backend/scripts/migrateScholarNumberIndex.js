"use strict";

/**
 * One-time migration: scholar number uniqueness moves from GLOBAL
 * (index scholarNumber_1, unique) to PER SESSION (scholarNumber_1_session_1, unique),
 * so a promoted student keeps the same scholar number in the next session.
 *
 *   node scripts/migrateScholarNumberIndex.js          # dry run (report only)
 *   node scripts/migrateScholarNumberIndex.js --apply  # create new index, drop old
 *
 * Safe order: the new index is created FIRST; the old one is dropped only if that
 * succeeds. Existing data satisfied the stricter old rule, so the new index
 * cannot conflict; duplicates are still checked and reported before changing anything.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const env = require("../config/env");

const OLD = "scholarNumber_1";
const NEW = "scholarNumber_1_session_1";

(async () => {
  const apply = process.argv.includes("--apply");
  try {
    await mongoose.connect(env.MONGODB_URI);
    const col = mongoose.connection.collection("students");
    const indexes = await col.indexes();
    console.log("Current indexes:", indexes.map((i) => `${i.name}${i.unique ? " (unique)" : ""}`).join(", "));

    const dups = await col
      .aggregate([
        { $group: { _id: { s: "$scholarNumber", session: "$session" }, n: { $sum: 1 } } },
        { $match: { n: { $gt: 1 } } },
      ])
      .toArray();
    if (dups.length) {
      console.error(`ABORT: ${dups.length} duplicate (scholarNumber, session) pairs exist; fix these first:`);
      dups.slice(0, 20).forEach((d) => console.error(`  ${d._id.s} / ${d._id.session} x${d.n}`));
      process.exitCode = 1;
      return;
    }
    console.log("No duplicate (scholarNumber, session) pairs.");

    const hasNew = indexes.some((i) => i.name === NEW);
    const hasOld = indexes.some((i) => i.name === OLD);
    if (!apply) {
      console.log(`DRY RUN: would ${hasNew ? "keep" : "create"} ${NEW} and ${hasOld ? "drop" : "skip (absent)"} ${OLD}. Re-run with --apply.`);
      return;
    }
    if (!hasNew) {
      await col.createIndex({ scholarNumber: 1, session: 1 }, { unique: true, name: NEW });
      console.log(`Created ${NEW}`);
    }
    if (hasOld) {
      await col.dropIndex(OLD);
      console.log(`Dropped ${OLD}`);
    }
    console.log("Done.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
