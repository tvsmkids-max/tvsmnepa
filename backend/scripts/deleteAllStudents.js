"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("../models/Student.model");
const Attendance = require("../models/Attendance.model");
const readline = require("readline");

// ─── CONFIGURATION ───────────────────────────────────────────
const CONFIG = {
  // What to delete
  deleteAttendance: true, // Also delete attendance records?
  filter: {}, // {} = ALL, or use { scholarNumber: /^NEW-/ }

  // Safety
  requireConfirmation: true, // Type "DELETE" to confirm
  dryRun: false, // If true, only shows what WOULD be deleted
};
// ─────────────────────────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (q) => new Promise((resolve) => rl.question(q, resolve));

async function deleteAllStudents() {
  try {
    console.log("\n🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected!\n");

    // ─── Count what will be deleted ───
    const studentCount = await Student.countDocuments(CONFIG.filter);

    if (studentCount === 0) {
      console.log("ℹ️  No students match the filter. Nothing to delete.");
      process.exit(0);
    }

    console.log(`📊 Found ${studentCount} students matching filter:`);
    console.log(JSON.stringify(CONFIG.filter, null, 2));
    console.log("");

    // Show sample
    const sample = await Student.find(CONFIG.filter)
      .select("scholarNumber name")
      .limit(5)
      .lean();

    console.log("Sample students that will be deleted:");
    sample.forEach((s) => {
      console.log(`  - ${s.scholarNumber} (${s.name})`);
    });
    if (studentCount > 5) {
      console.log(`  ... and ${studentCount - 5} more`);
    }
    console.log("");

    // ─── Attendance count ───
    let attendanceCount = 0;
    if (CONFIG.deleteAttendance) {
      const studentIds = await Student.find(CONFIG.filter).select("_id").lean();
      const ids = studentIds.map((s) => s._id);
      attendanceCount = await Attendance.countDocuments({
        student: { $in: ids },
      });
      console.log(`📊 Found ${attendanceCount} attendance records to delete\n`);
    }

    // ─── Dry run check ───
    if (CONFIG.dryRun) {
      console.log("🧪 DRY RUN MODE - Nothing was deleted.");
      console.log(
        `Would delete: ${studentCount} students, ${attendanceCount} attendance records`,
      );
      process.exit(0);
    }

    // ─── Confirmation ───
    if (CONFIG.requireConfirmation) {
      console.log(
        "⚠️  WARNING: This action is PERMANENT and cannot be undone!\n",
      );
      const answer = await question(
        `Type "DELETE" (in caps) to confirm deletion of ${studentCount} students` +
          (CONFIG.deleteAttendance
            ? ` and ${attendanceCount} attendance records`
            : "") +
          ": ",
      );

      if (answer.trim() !== "DELETE") {
        console.log("\n❌ Cancelled. Nothing was deleted.");
        process.exit(0);
      }
    }

    console.log("\n💥 Deleting...\n");

    // ─── Delete attendance first (if enabled) ───
    if (CONFIG.deleteAttendance && attendanceCount > 0) {
      const studentIds = await Student.find(CONFIG.filter).select("_id").lean();
      const ids = studentIds.map((s) => s._id);
      const attResult = await Attendance.deleteMany({
        student: { $in: ids },
      });
      console.log(`✅ Deleted ${attResult.deletedCount} attendance records`);
    }

    // ─── Delete students ───
    const result = await Student.deleteMany(CONFIG.filter);
    console.log(`✅ Deleted ${result.deletedCount} students`);

    console.log("\n🎉 Done!\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

deleteAllStudents();
