"use strict";

require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const env = require("../config/env");

// ─── IMPORT ALL MODELS FIRST (registers schemas) ───
require("../models/User.model");
require("../models/Teacher.model");
require("../models/Class.model");
require("../models/AcademicSession.model");

const check = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log(`\n Database: ${mongoose.connection.name}\n`);

    const Teacher = mongoose.model("Teacher");

    const teachers = await Teacher.find()
      .populate("user", "email")
      .populate("assignedClasses", "name section")
      .lean();

    console.log("═══════════════════════════════════════════");
    console.log("  TEACHERS & ASSIGNED CLASSES");
    console.log("═══════════════════════════════════════════");

    if (teachers.length === 0) {
      console.log("No teachers found!");
    }

    teachers.forEach((t) => {
      console.log(`\n👤 ${t.name} (${t.employeeId})`);
      console.log(`   Email: ${t.user?.email || t.email}`);
      console.log(`   User ID: ${t.user?._id || t.user}`);
      console.log(`   Assigned Classes (${t.assignedClasses?.length || 0}):`);
      if (!t.assignedClasses || t.assignedClasses.length === 0) {
        console.log("     ❌ NONE");
      } else {
        t.assignedClasses.forEach((c) => {
          console.log(
            `     ✅ ${c.name}-${c.section} (id: ${c._id?.toString().slice(-6)})`,
          );
        });
      }
    });

    console.log("\n═══════════════════════════════════════════\n");

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

check();
