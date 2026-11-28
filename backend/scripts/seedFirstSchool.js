"use strict";

// Registers the existing school as School #1 (code TVSM) in the new "schools"
// collection, copying its identity from the current settings / printed-card profile.
// READ-ONLY on all existing collections; only inserts one document into "schools".
//   node scripts/seedFirstSchool.js          -> dry run (prints what would be created)
//   node scripts/seedFirstSchool.js --apply  -> creates it (skips if code exists)
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const env = require("../config/env");
const School = require("../models/School.model");
const Settings = require("../models/Settings.model");
const profile = require("../constants/schoolProfile");
const { checkImageDataUrl } = require("../utils/imageData");

const CODE = process.env.FIRST_SCHOOL_CODE || "TVSM";
const apply = process.argv.includes("--apply");

(async () => {
  await mongoose.connect(env.MONGODB_URI);
  const existing = await School.findOne({ code: CODE }).lean();
  if (existing) {
    console.log(`School ${CODE} already exists (${existing.name}). Nothing to do.`);
    return;
  }
  const settings = await Settings.findOne().lean(); // read-only
  let logo = null;
  try {
    logo = checkImageDataUrl(settings?.schoolLogo || null, "Logo");
  } catch {
    console.log("Note: current logo is not an embeddable PNG/JPEG/WebP data URL; upload it in the owner panel.");
  }
  const doc = {
    code: CODE,
    name: (settings?.schoolName && settings.schoolName !== "Setup Required" ? settings.schoolName : profile.nameLines.join(" ")).trim(),
    nameLines: profile.nameLines,
    logo,
    address: profile.address || settings?.address || "",
    recognition: profile.recognition,
    udiseCode: profile.diseCode,
    affiliationCode: process.env.FIRST_SCHOOL_AFFILIATION || "572078",
    footer: profile.footer,
    phone: settings?.phone || "",
    email: settings?.email || "",
  };
  console.log(apply ? "Creating:" : "DRY RUN - would create:", { ...doc, logo: logo ? "(image)" : null });
  if (apply) {
    await School.create(doc);
    console.log("Done.");
  } else {
    console.log("Re-run with --apply to create it.");
  }
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
