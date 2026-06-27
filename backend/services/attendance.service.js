"use strict";

const attendanceRepository = require("../repositories/attendance.repository");
const holidayRepository = require("../repositories/holiday.repository");
const studentRepository = require("../repositories/student.repository");
const classRepository = require("../repositories/class.repository");
const Settings = require("../models/Settings.model");
const { createAuditLog } = require("../middlewares/audit.middleware");
const { STATUSES_BLOCKING_ATTENDANCE } = require("../constants/studentStatus");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class AttendanceService {
  /**
   * Get attendance sheet for a class on a specific date
   * Returns students with current attendance (if marked)
   */
  async getSheet({ classId, date, user }) {
    const cls = await classRepository.findById(classId);
    if (!cls) throwError("Class not found", 404);

    // Get active session
    const settings = await Settings.getSettings();
    const sessionId = cls.session;

    // Check if holiday
    const holiday = await holidayRepository.isHoliday(date, sessionId);
    if (holiday && !holiday.allowAttendance) {
      return {
        students: [],
        isHoliday: true,
        holiday,
        isLocked: false,
        isMarked: false,
        stats: { Present: 0, Absent: 0, total: 0 },
      };
    }

    // Get all active students in this class
    const Student = require("../models/Student.model");
    const students = await Student.find({
      class: classId,
      status: { $nin: STATUSES_BLOCKING_ATTENDANCE },
      isActive: true,
    })
      .sort("rollNumber")
      .lean();

    // Get existing attendance records for this date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const Attendance = require("../models/Attendance.model");
    const records = await Attendance.find({
      class: classId,
      date: { $gte: dayStart, $lte: dayEnd },
    })
      .populate("markedBy", "name")
      .populate("editedBy", "name")
      .lean();

    const recordMap = {};
    records.forEach((r) => {
      recordMap[r.student.toString()] = r;
    });

    const isLocked = records.some((r) => r.isLocked);
    const isMarked = records.length > 0;

    const studentsWithAttendance = students.map((s) => {
      const rec = recordMap[s._id.toString()];
      return {
        student: s,
        attendance: rec
          ? {
              _id: rec._id,
              status: rec.status,
              isLocked: rec.isLocked,
              markedBy: rec.markedBy,
              markedAt: rec.markedAt,
              editedBy: rec.editedBy,
              editedAt: rec.editedAt,
              editReason: rec.editReason,
            }
          : null,
      };
    });

    const stats = {
      Present: records.filter((r) => r.status === "Present").length,
      Absent: records.filter((r) => r.status === "Absent").length,
      total: students.length,
    };

    return {
      students: studentsWithAttendance,
      class: cls,
      isHoliday: false,
      holiday: null,
      isLocked,
      isMarked,
      stats,
    };
  }

  /**
   * Mark or update attendance for entire class
   */
  async markAttendance({ classId, date, records, user, req }) {
    const cls = await classRepository.findById(classId);
    if (!cls) throwError("Class not found", 404);

    // Check holiday
    const holiday = await holidayRepository.isHoliday(date, cls.session);
    if (holiday && !holiday.allowAttendance) {
      throwError(
        `Cannot mark attendance on holiday: ${holiday.name}. Admin must enable override.`,
        400,
      );
    }

    // Check if locked
    const isLocked = await attendanceRepository.isLocked(classId, date);
    if (isLocked && user.role !== "admin") {
      throwError(
        "Attendance is locked for this date. Contact admin to unlock.",
        403,
      );
    }

    // Get students to validate
    const Student = require("../models/Student.model");
    const students = await Student.find({
      class: classId,
      status: { $nin: STATUSES_BLOCKING_ATTENDANCE },
      isActive: true,
    }).lean();
    const studentIds = new Set(students.map((s) => s._id.toString()));

    // Validate all records reference students in this class
    const validRecords = records.filter((r) =>
      studentIds.has(r.student.toString()),
    );

    if (validRecords.length === 0) {
      throwError("No valid attendance records to save", 400);
    }

    // Prepare bulk write records
    const bulkRecords = validRecords.map((r) => ({
      student: r.student,
      class: classId,
      session: cls.session,
      date,
      status: r.status,
      markedBy: user._id,
    }));

    const result = await attendanceRepository.upsertMany(bulkRecords);

    await createAuditLog({
      user,
      action: "MARK_ATTENDANCE",
      module: "Attendance",
      description: `Marked attendance for Class ${cls.name}-${cls.section} on ${new Date(date).toDateString()}`,
      resourceId: classId,
      resourceType: "Class",
      req,
    });

    return {
      saved: bulkRecords.length,
      modified: result.modifiedCount || 0,
      inserted: result.upsertedCount || 0,
    };
  }

  /**
   * Edit single attendance record
   */
  async editSingle({ id, status, editReason, user, req }) {
    const Attendance = require("../models/Attendance.model");
    const existing = await Attendance.findById(id).lean();
    if (!existing) throwError("Attendance record not found", 404);

    // Check lock
    if (existing.isLocked && user.role !== "admin") {
      throwError("Record is locked. Contact admin to unlock.", 403);
    }

    const updated = await attendanceRepository.editAttendance(
      id,
      status,
      user._id,
      editReason,
    );

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Attendance",
      description: `Edited attendance: ${existing.status} → ${status}`,
      resourceId: id,
      resourceType: "Attendance",
      before: { status: existing.status },
      after: { status },
      req,
    });

    return updated;
  }

  /**
   * Lock attendance for a class on a date
   */
  async lock({ classId, date, user, req }) {
    if (user.role !== "admin") {
      throwError("Only admin can lock attendance", 403);
    }

    const cls = await classRepository.findById(classId);
    if (!cls) throwError("Class not found", 404);

    const result = await attendanceRepository.lockByClassAndDate(classId, date);

    if (result.matchedCount === 0) {
      throwError("No attendance records found to lock", 404);
    }

    await createAuditLog({
      user,
      action: "LOCK",
      module: "Attendance",
      description: `Locked attendance for ${cls.name}-${cls.section} on ${new Date(date).toDateString()}`,
      resourceId: classId,
      resourceType: "Class",
      req,
    });

    return { locked: result.modifiedCount };
  }

  /**
   * Unlock attendance for a class on a date
   */
  async unlock({ classId, date, user, req }) {
    if (user.role !== "admin") {
      throwError("Only admin can unlock attendance", 403);
    }

    const cls = await classRepository.findById(classId);
    if (!cls) throwError("Class not found", 404);

    const result = await attendanceRepository.unlockByClassAndDate(
      classId,
      date,
    );

    await createAuditLog({
      user,
      action: "UNLOCK",
      module: "Attendance",
      description: `Unlocked attendance for ${cls.name}-${cls.section} on ${new Date(date).toDateString()}`,
      resourceId: classId,
      resourceType: "Class",
      req,
    });

    return { unlocked: result.modifiedCount };
  }

  async getStudentHistory({ studentId, dateFrom, dateTo }) {
    const student = await studentRepository.findById(studentId, [
      { path: "class", select: "name section" },
    ]);
    if (!student) throwError("Student not found", 404);

    const records = await attendanceRepository.findByStudentAndRange(
      studentId,
      dateFrom,
      dateTo,
    );

    // Calculate stats from records directly (faster + reliable)
    const stats = {
      Present: 0,
      Absent: 0,
      total: records.length,
      percentage: 0,
    };

    records.forEach((r) => {
      if (r.status === "Present") stats.Present++;
      else if (r.status === "Absent") stats.Absent++;
    });

    if (stats.total > 0) {
      stats.percentage = Math.round((stats.Present / stats.total) * 100);
    }

    return { records, stats, student };
  }
  /**
   * Get pending attendance classes for today
   */
  async getPendingToday() {
    const settings = await Settings.getSettings();
    if (!settings?.activeSession) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today is a holiday
    const holiday = await holidayRepository.isHoliday(
      today,
      settings.activeSession,
    );
    if (holiday && !holiday.allowAttendance) return [];

    // Check working day
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const workingDay = settings.workingDays?.find((d) => d.day === dayName);
    if (workingDay && !workingDay.isWorking) return [];

    return attendanceRepository.getPendingClasses(
      settings.activeSession,
      today,
    );
  }
  /**
   * Get today's attendance summary across all classes for active session
   */
  async getTodayStats() {
    const Settings = require("../models/Settings.model");
    const Class = require("../models/Class.model");
    const Student = require("../models/Student.model");
    const Attendance = require("../models/Attendance.model");
    const AcademicSession = require("../models/AcademicSession.model");

    console.log("\n[TodayStats] ═══════════════════════");
    console.log("[TodayStats] Starting calculation...");

    // ─── Step 1: Get active session (multiple fallbacks) ───
    let activeSessionId = null;

    // Try from settings first
    const settings = await Settings.findOne().populate("activeSession").lean();
    if (settings?.activeSession) {
      activeSessionId = settings.activeSession._id || settings.activeSession;
    }

    // Fallback: query session directly
    if (!activeSessionId) {
      const session = await AcademicSession.findOne({ isActive: true }).lean();
      if (session) activeSessionId = session._id;
    }

    console.log(
      "[TodayStats] Active session ID:",
      activeSessionId?.toString() || "NONE",
    );

    if (!activeSessionId) {
      console.log("[TodayStats] ❌ No active session found anywhere");
      return {
        isHoliday: false,
        holiday: null,
        totalStudents: 0,
        totalClasses: 0,
        markedClasses: 0,
        pendingClasses: 0,
        present: 0,
        absent: 0,
        unmarked: 0,
        percentage: 0,
        classBreakdown: [],
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ─── Step 2: Check holiday ───
    const holiday = await holidayRepository.isHoliday(today, activeSessionId);
    if (holiday && !holiday.allowAttendance) {
      console.log("[TodayStats] Today is holiday:", holiday.name);
      return {
        isHoliday: true,
        holiday,
        totalStudents: 0,
        totalClasses: 0,
        markedClasses: 0,
        pendingClasses: 0,
        present: 0,
        absent: 0,
        unmarked: 0,
        percentage: 0,
        classBreakdown: [],
      };
    }

    // ─── Step 3: Get all classes — try BOTH session formats ───
    let classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    }).lean();

    console.log(`[TodayStats] Classes with session match: ${classes.length}`);

    // If 0 classes, get ALL non-archived classes (any session)
    if (classes.length === 0) {
      console.log(
        "[TodayStats] ⚠️  No classes for active session, fetching ALL classes",
      );
      classes = await Class.find({ isArchived: false }).lean();
      console.log(`[TodayStats] All non-archived classes: ${classes.length}`);
    }

    if (classes.length === 0) {
      console.log("[TodayStats] ❌ No classes exist at all");
      return {
        isHoliday: false,
        holiday: null,
        totalStudents: 0,
        totalClasses: 0,
        markedClasses: 0,
        pendingClasses: 0,
        present: 0,
        absent: 0,
        unmarked: 0,
        percentage: 0,
        classBreakdown: [],
      };
    }

    const classIds = classes.map((c) => c._id);

    // ─── Step 4: Get students ───
    const allStudents = await Student.find({
      class: { $in: classIds },
      status: "Active",
      isActive: true,
    }).lean();

    console.log(
      `[TodayStats] Active students in these classes: ${allStudents.length}`,
    );

    // Build student count map per class
    const studentCountMap = {};
    allStudents.forEach((s) => {
      const cid = s.class.toString();
      studentCountMap[cid] = (studentCountMap[cid] || 0) + 1;
    });

    const totalStudents = allStudents.length;

    // ─── Step 5: Get today's attendance ───
    const todayAttendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: today, $lt: tomorrow },
    }).lean();

    console.log(
      `[TodayStats] Attendance records today: ${todayAttendance.length}`,
    );

    // Build attendance stats per class
    const classStatsMap = {};
    todayAttendance.forEach((rec) => {
      const cid = rec.class.toString();
      if (!classStatsMap[cid]) classStatsMap[cid] = { Present: 0, Absent: 0 };
      classStatsMap[cid][rec.status] =
        (classStatsMap[cid][rec.status] || 0) + 1;
    });

    // ─── Step 6: Build breakdown ───
    const classBreakdown = classes.map((cls) => {
      const cid = cls._id.toString();
      const stats = classStatsMap[cid] || { Present: 0, Absent: 0 };
      const totalInClass = studentCountMap[cid] || 0;
      const marked = stats.Present + stats.Absent;
      const percentage =
        marked > 0 ? Math.round((stats.Present / marked) * 100) : 0;

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        totalStudents: totalInClass,
        present: stats.Present,
        absent: stats.Absent,
        marked,
        unmarked: totalInClass - marked,
        isMarked: marked > 0,
        percentage,
      };
    });

    const present = classBreakdown.reduce((sum, c) => sum + c.present, 0);
    const absent = classBreakdown.reduce((sum, c) => sum + c.absent, 0);
    const markedClasses = classBreakdown.filter((c) => c.isMarked).length;
    const totalMarked = present + absent;
    const unmarked = totalStudents - totalMarked;

    const result = {
      isHoliday: false,
      holiday: null,
      totalStudents,
      totalClasses: classes.length,
      markedClasses,
      pendingClasses: classes.length - markedClasses,
      present,
      absent,
      unmarked,
      percentage:
        totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 0,
      classBreakdown: classBreakdown.sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    };

    console.log("[TodayStats] ✅ Final Result:");
    console.log(`  Total Classes: ${result.totalClasses}`);
    console.log(`  Marked Classes: ${result.markedClasses}`);
    console.log(`  Total Students: ${result.totalStudents}`);
    console.log(`  Present: ${result.present}`);
    console.log(`  Absent: ${result.absent}`);
    console.log(`  Percentage: ${result.percentage}%`);
    console.log("[TodayStats] ═══════════════════════\n");

    return result;
  }
}

module.exports = new AttendanceService();
