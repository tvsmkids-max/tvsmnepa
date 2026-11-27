"use strict";

/**
 * Hashes legacy plaintext management access keys.
 * Existing shared links keep working (the same key still opens the dashboard);
 * only the stored value changes. Nothing is deleted.
 *
 *   node scripts/migrateManagementKeys.js           # dry run: shows what would change
 *   node scripts/migrateManagementKeys.js --apply   # does it
 */
require("dotenv").config();
const mongoose = require("mongoose");
const ManagementAccess = require("../models/ManagementAccess.model");

const apply = process.argv.includes("--apply");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const legacy = await ManagementAccess.find({ keyHashed: { $ne: true } });
  console.log(`${legacy.length} legacy plaintext key(s) found.`);
  for (const doc of legacy) {
    const label = `${doc.label} (${doc._id})`;
    if (!apply) {
      console.log(`  would hash: ${label}`);
      continue;
    }
    const plain = doc.secretKey;
    await ManagementAccess.updateOne(
      { _id: doc._id, keyHashed: { $ne: true }, secretKey: plain },
      { $set: { secretKey: ManagementAccess.hashKey(plain), keyHashed: true, keyHint: plain.slice(0, 4) } },
    );
    console.log(`  hashed: ${label}`);
  }
  if (!apply && legacy.length) console.log("Dry run only. Re-run with --apply to change data.");
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
