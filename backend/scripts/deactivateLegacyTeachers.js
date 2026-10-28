"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User.model");

async function deactivateLegacyTeachers() {
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const teacherIds = await User.distinct("_id", { role: "teacher" });

    const attendanceCollection = mongoose.connection.db.collection("attendances");
    const attendanceTotal = await attendanceCollection.countDocuments({});
    const attendanceReferences = await attendanceCollection.countDocuments({
      $or: [
        { markedBy: { $in: teacherIds } },
        { editedBy: { $in: teacherIds } },
      ],
    });

    const result = await User.updateMany(
      { role: "teacher", isActive: true },
      { $set: { isActive: false } },
    );

    console.log(
      JSON.stringify({
        legacyTeacherIds: teacherIds.length,
        totalAttendanceRecords: attendanceTotal,
        attendanceRecordsReferencingTeachers: attendanceReferences,
        teacherAccountsDeactivated: result.modifiedCount,
        activeTeacherAccountsAfterCleanup: await User.countDocuments({
          role: "teacher",
          isActive: true,
        }),
      }),
    );
  } finally {
    await mongoose.disconnect();
  }
}

deactivateLegacyTeachers().catch((error) => {
  console.error(`Legacy teacher cleanup failed: ${error.message}`);
  process.exit(1);
});
