"use strict";

require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const env = require("../config/env");

const diagnose = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log(`\n Database: ${mongoose.connection.name}\n`);

    const User = require("../models/User.model");
    const AcademicSession = require("../models/AcademicSession.model");
    const Settings = require("../models/Settings.model");
    const Class = require("../models/Class.model");
    const Student = require("../models/Student.model");
    const Teacher = require("../models/Teacher.model");

    console.log("═══════════════════════════════════════");
    console.log("  USERS");
    console.log("═══════════════════════════════════════");
    const users = await User.find().lean();
    console.table(
      users.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.isActive,
      })),
    );

    console.log("\n═══════════════════════════════════════");
    console.log("  ACADEMIC SESSIONS");
    console.log("═══════════════════════════════════════");
    const sessions = await AcademicSession.find().lean();
    console.table(
      sessions.map((s) => ({
        name: s.name,
        active: s.isActive ? "✅ YES" : "no",
        id: s._id.toString().slice(-6),
      })),
    );

    const activeSession = sessions.find((s) => s.isActive);
    if (!activeSession) {
      console.log("\n  ❌ NO ACTIVE SESSION! Activate one.");
    }

    console.log("\n═══════════════════════════════════════");
    console.log("  SETTINGS");
    console.log("═══════════════════════════════════════");
    const settings = await Settings.findOne().populate("activeSession").lean();
    if (settings) {
      console.log(`  School Name : ${settings.schoolName}`);
      console.log(
        `  Active Sess : ${settings.activeSession?.name || "NOT SET"}`,
      );
      console.log(`  Timezone    : ${settings.timezone}`);
    } else {
      console.log("  ❌ No settings record!");
    }

    console.log("\n═══════════════════════════════════════");
    console.log("  TEACHERS");
    console.log("═══════════════════════════════════════");
    const teachers = await Teacher.find().populate("session", "name").lean();
    console.table(
      teachers.map((t) => ({
        empId: t.employeeId,
        name: t.name,
        session: t.session?.name || "❌ NONE",
        active: t.isActive,
      })),
    );

    console.log("\n═══════════════════════════════════════");
    console.log("  CLASSES");
    console.log("═══════════════════════════════════════");
    const classes = await Class.find()
      .populate("session", "name")
      .populate("classTeacher", "name")
      .lean();
    console.table(
      classes.map((c) => ({
        name: c.name,
        section: c.section,
        session: c.session?.name || "❌ NONE",
        teacher: c.classTeacher?.name || "—",
        archived: c.isArchived,
        id: c._id.toString().slice(-6),
      })),
    );

    console.log("\n═══════════════════════════════════════");
    console.log("  STUDENTS");
    console.log("═══════════════════════════════════════");
    const students = await Student.find()
      .populate("class", "name section")
      .populate("session", "name")
      .lean();
    console.table(
      students.map((s) => ({
        scholar: s.scholarNumber,
        roll: s.rollNumber,
        name: s.name,
        class:
          s.class?.name && s.class?.section
            ? `${s.class.name}-${s.class.section}`
            : "❌ NONE",
        session: s.session?.name || "❌ NONE",
        status: s.status,
        active: s.isActive,
      })),
    );

    console.log("\n═══════════════════════════════════════");
    console.log("  ATTENDANCE QUERY TEST");
    console.log("═══════════════════════════════════════");

    if (activeSession && classes.length > 0) {
      for (const cls of classes) {
        const studentsInClass = await Student.find({
          class: cls._id,
          status: { $nin: ["TC", "Transferred"] },
          isActive: true,
        }).lean();

        console.log(`\n  Class: ${cls.name}-${cls.section}`);
        console.log(
          `    Session match: ${cls.session?._id?.toString() === activeSession._id.toString() ? "✅" : "❌ MISMATCH"}`,
        );
        console.log(`    Students found: ${studentsInClass.length}`);

        if (studentsInClass.length === 0) {
          console.log(`    ⚠️  No students in this class!`);
        }
      }
    }

    console.log("\n═══════════════════════════════════════\n");

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

diagnose();
