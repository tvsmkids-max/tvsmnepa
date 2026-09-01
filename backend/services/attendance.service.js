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
  // ═══════════════════════════════════════════════════════════════
  //  SECURITY: Class User Guard
  // ═══════════════════════════════════════════════════════════════
  _assertClassAccess(user, classId) {
    if (!user || user.role !== "class") return;

    const linked = user.linkedClass?.toString?.() || user.linkedClass;
    if (!linked) {
      throwError("No class is linked to this account.", 403);
    }
    if (linked !== classId.toString()) {
      throwError("You can only access your own class.", 403);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  TIMEZONE-AWARE DATE PARSER (Forced to Asia/Kolkata UTC Midnights)
  // ═══════════════════════════════════════════════════════════════
  _parseDateRange(dateInput) {
    let dateStr;
    if (
      typeof dateInput === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ) {
      dateStr = dateInput;
    } else {
      const dObj = dateInput ? new Date(dateInput) : new Date();
      const tzOffset = 5.5 * 60 * 60 * 1000; // IST offset
      const istTime = new Date(dObj.getTime() + tzOffset);
      const y = istTime.getUTCFullYear();
      const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
      const d = String(istTime.getUTCDate()).padStart(2, "0");
      dateStr = `${y}-${m}-${d}`;
    }
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);
    return { start, end };
  }

  /**
   * Get attendance sheet for a class on a specific date
   */
  async getSheet({ classId, date, user }) {
    const cls = await classRepository.findById(classId);
    if (!cls) throwError("Class not found", 404);

    this._assertClassAccess(user, classId);

    const settings = await Settings.getSettings();
    const sessionId = cls.session;

    const { start: dayStart, end: dayEnd } = this._parseDateRange(date);

    // 1. Check Holiday
    const holiday = await holidayRepository.isHoliday(dayStart, sessionId);
    if (holiday && !holiday.allowAttendance) {
      return {
        students: [],
        isHoliday: true,
        isNonWorkingDay: false,
        holiday,
        isLocked: false,
        isMarked: false,
        stats: { Present: 0, Absent: 0, total: 0 },
      };
    }

    // 2. Check Sunday / Non-working day
    const dayNameFromStr = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "UTC", // dayStart is already IST-midnight-as-Z
    }).format(dayStart);

    const workingDay = settings?.workingDays?.find(
      (d) => d.day === dayNameFromStr,
    );
    const isWorkingDay = !workingDay || workingDay.isWorking !== false;

    if (!isWorkingDay) {
      return {
        students: [],
        class: cls,
        isHoliday: false,
        isNonWorkingDay: true,
        nonWorkingDayName: dayNameFromStr,
        holiday: null,
        isLocked: false,
        isMarked: false,
        stats: { Present: 0, Absent: 0, total: 0 },
      };
    }

    const Student = require("../models/Student.model");
    const students = await Student.find({
      class: classId,
      status: { $nin: STATUSES_BLOCKING_ATTENDANCE },
      isActive: true,
    })
      .sort("name")
      .lean();

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
      isNonWorkingDay: false,
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

    this._assertClassAccess(user, classId);

    const { start: normalizedDate } = this._parseDateRange(date);

    // 1. Holiday block
    const holiday = await holidayRepository.isHoliday(
      normalizedDate,
      cls.session,
    );
    if (holiday && !holiday.allowAttendance) {
      throwError(`Cannot mark attendance on holiday: ${holiday.name}.`, 400);
    }

    // 2. Sunday / Non-working day block
    const settings = await Settings.getSettings();
    const dayNameFromStr = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "UTC",
    }).format(normalizedDate);

    const workingDay = settings?.workingDays?.find(
      (d) => d.day === dayNameFromStr,
    );
    const isWorkingDay = !workingDay || workingDay.isWorking !== false;

    if (!isWorkingDay) {
      throwError(
        `Cannot mark attendance on ${dayNameFromStr} (non-working day).`,
        400,
      );
    }

    // 3. Lock check
    const isLocked = await attendanceRepository.isLocked(
      classId,
      normalizedDate,
    );
    if (isLocked && user.role !== "admin") {
      throwError(
        "Attendance is locked for this date. Contact admin to unlock.",
        403,
      );
    }

    const Student = require("../models/Student.model");
    const students = await Student.find({
      class: classId,
      status: { $nin: STATUSES_BLOCKING_ATTENDANCE },
      isActive: true,
    }).lean();
    const studentIds = new Set(students.map((s) => s._id.toString()));

    const validRecords = records.filter((r) =>
      studentIds.has(r.student.toString()),
    );

    if (validRecords.length === 0) {
      throwError("No valid attendance records to save", 400);
    }

    // 🛑 4. STRICT RULE: Require 100% completion for Class accounts
    if (user.role !== "admin") {
      const markedStudentIds = new Set(
        validRecords.map((r) => r.student.toString()),
      );
      const unmarkedStudents = students.filter(
        (s) => !markedStudentIds.has(s._id.toString()),
      );

      if (unmarkedStudents.length > 0) {
        throwError(
          `Cannot submit attendance. ${unmarkedStudents.length} student(s) are still unmarked. All students must be marked as Present or Absent.`,
          400,
        );
      }
    }

    const bulkRecords = validRecords.map((r) => ({
      student: r.student,
      class: classId,
      session: cls.session,
      date: normalizedDate,
      status: r.status,
      markedBy: user._id,
    }));

    const result = await attendanceRepository.upsertMany(bulkRecords);

    await createAuditLog({
      user,
      action: "MARK_ATTENDANCE",
      module: "Attendance",
      description: `Marked attendance for Class ${cls.name}-${cls.section} on ${normalizedDate.toISOString().slice(0, 10)}`,
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
  async editSingle({ id, status, editReason, user, req }) {
    const Attendance = require("../models/Attendance.model");
    const existing = await Attendance.findById(id).lean();
    if (!existing) throwError("Attendance record not found", 404);

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

  async lock({ classId, date, user, req }) {
    if (user.role !== "admin")
      throwError("Only admin can lock attendance", 403);

    const cls = await classRepository.findById(classId);
    if (!cls) throwError("Class not found", 404);

    const { start: normalizedDate } = this._parseDateRange(date);
    const result = await attendanceRepository.lockByClassAndDate(
      classId,
      normalizedDate,
    );

    if (result.matchedCount === 0) {
      throwError("No attendance records found to lock", 404);
    }

    await createAuditLog({
      user,
      action: "LOCK",
      module: "Attendance",
      description: `Locked attendance for ${cls.name}-${cls.section}`,
      resourceId: classId,
      resourceType: "Class",
      req,
    });

    return { locked: result.modifiedCount };
  }

  async unlock({ classId, date, user, req }) {
    if (user.role !== "admin")
      throwError("Only admin can unlock attendance", 403);

    const cls = await classRepository.findById(classId);
    if (!cls) throwError("Class not found", 404);

    const { start: normalizedDate } = this._parseDateRange(date);
    const result = await attendanceRepository.unlockByClassAndDate(
      classId,
      normalizedDate,
    );

    await createAuditLog({
      user,
      action: "UNLOCK",
      module: "Attendance",
      description: `Unlocked attendance for ${cls.name}-${cls.section}`,
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

  async getPendingToday() {
    const settings = await Settings.getSettings();
    if (!settings?.activeSession) return [];

    const { start: today } = this._parseDateRange();

    const holiday = await holidayRepository.isHoliday(
      today,
      settings.activeSession,
    );
    if (holiday && !holiday.allowAttendance) return [];

    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "UTC",
    }).format(today);

    const workingDay = settings.workingDays?.find((d) => d.day === dayName);
    if (workingDay && !workingDay.isWorking) return [];

    return attendanceRepository.getPendingClasses(
      settings.activeSession,
      today,
    );
  }

  async getTodayStats() {
    const Class = require("../models/Class.model");
    const Student = require("../models/Student.model");
    const Attendance = require("../models/Attendance.model");
    const AcademicSession = require("../models/AcademicSession.model");

    let activeSessionId = null;
    const settings = await Settings.findOne().populate("activeSession").lean();
    if (settings?.activeSession) {
      activeSessionId = settings.activeSession._id || settings.activeSession;
    }
    if (!activeSessionId) {
      const session = await AcademicSession.findOne({ isActive: true }).lean();
      if (session) activeSessionId = session._id;
    }

    if (!activeSessionId) return this._emptyTodayStats();

    const { start: today, end: todayEnd } = this._parseDateRange();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "UTC",
    }).format(today);

    const settingsFull = await Settings.getSettings();
    const workingDay = settingsFull?.workingDays?.find(
      (d) => d.day === dayName,
    );
    const isWorkingDay = !workingDay || workingDay.isWorking;

    const holiday = await holidayRepository.isHoliday(today, activeSessionId);
    const isHoliday = holiday && !holiday.allowAttendance;
    const isNonWorkingDay = !isWorkingDay && !isHoliday;

    if (isHoliday || isNonWorkingDay) {
      const nextWorkingDay = await this._findNextWorkingDayForAttendance(
        activeSessionId,
        today,
      );

      return {
        ...this._emptyTodayStats(),
        isHoliday,
        isNonWorkingDay,
        isWorkingDay,
        holiday: isHoliday ? holiday : null,
        today: { date: today.toISOString(), dayName },
        nextWorkingDay,
      };
    }

    let classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    }).lean();

    if (classes.length === 0) return this._emptyTodayStats();

    const classIds = classes.map((c) => c._id);

    const todayStudents = await Student.find({
      class: { $in: classIds },
      status: "Active",
      isActive: true,
    }).lean();

    const activeStudentIds = new Set(
      todayStudents.map((s) => s._id.toString()),
    );

    const studentCountMap = {};
    todayStudents.forEach((s) => {
      const cid = s.class.toString();
      studentCountMap[cid] = (studentCountMap[cid] || 0) + 1;
    });

    const totalStudents = todayStudents.length;

    const todayAttendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: today, $lt: tomorrow },
    }).lean();

    const classStatsMap = {};
    const countedStudentInClass = new Set();

    todayAttendance.forEach((rec) => {
      const studentId = rec.student.toString();
      const cid = rec.class.toString();
      const uniqueKey = `${cid}-${studentId}`;

      if (!activeStudentIds.has(studentId)) return;
      if (countedStudentInClass.has(uniqueKey)) return;
      countedStudentInClass.add(uniqueKey);

      const actualClassId = todayStudents
        .find((s) => s._id.toString() === studentId)
        ?.class?.toString();
      if (actualClassId && actualClassId !== cid) return;

      if (!classStatsMap[cid]) classStatsMap[cid] = { Present: 0, Absent: 0 };
      classStatsMap[cid][rec.status] =
        (classStatsMap[cid][rec.status] || 0) + 1;
    });

    const classBreakdown = classes.map((cls) => {
      const cid = cls._id.toString();
      const stats = classStatsMap[cid] || { Present: 0, Absent: 0 };
      const totalInClass = studentCountMap[cid] || 0;
      const present = Math.min(stats.Present, totalInClass);
      const absent = Math.min(stats.Absent, totalInClass - present);
      const marked = present + absent;
      const unmarkedInClass = Math.max(0, totalInClass - marked);
      const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        classTeacher: cls.teacherLabel || null,
        totalStudents: totalInClass,
        present,
        absent,
        marked,
        unmarked: unmarkedInClass,
        isMarked: marked > 0,
        percentage,
      };
    });

    const present = classBreakdown.reduce((sum, c) => sum + c.present, 0);
    const absent = classBreakdown.reduce((sum, c) => sum + c.absent, 0);
    const markedClasses = classBreakdown.filter((c) => c.isMarked).length;
    const totalMarked = present + absent;
    const unmarked = Math.max(0, totalStudents - totalMarked);
    const percentage =
      totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 0;

    let yesterdayStats = null;
    try {
      const yesterdayAttendance = await Attendance.find({
        class: { $in: classIds },
        date: { $gte: yesterday, $lt: today },
      }).lean();

      let yPresent = 0;
      let yAbsent = 0;
      yesterdayAttendance.forEach((r) => {
        const sid = r.student.toString();
        if (!activeStudentIds.has(sid)) return;
        if (r.status === "Present") yPresent++;
        else if (r.status === "Absent") yAbsent++;
      });

      const yTotal = yPresent + yAbsent;
      yesterdayStats = {
        present: yPresent,
        absent: yAbsent,
        total: yTotal,
        percentage: yTotal > 0 ? Math.round((yPresent / yTotal) * 100) : 0,
      };
    } catch {}

    const trends = yesterdayStats
      ? {
          percentageDiff: percentage - yesterdayStats.percentage,
          absentDiff: absent - yesterdayStats.absent,
          presentDiff: present - yesterdayStats.present,
        }
      : null;

    const getClassRank = (className) => {
      if (!className) return 999;
      const name = className.toString().trim().toUpperCase();
      if (/^PRE/.test(name) || name === "PLAYGROUP") return 0;
      if (/^NUR/.test(name) || name === "NURSERY") return 1;
      if (/^L\.?K\.?G/.test(name) || name === "LKG") return 2;
      if (/^U\.?K\.?G/.test(name) || name === "UKG") return 3;
      const numMatch = name.match(/^(?:CLASS\s*)?(\d{1,2})(?:ST|ND|RD|TH)?/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num >= 1 && num <= 12) return 10 + num;
      }
      return 999;
    };

    return {
      isHoliday: false,
      isNonWorkingDay: false,
      isWorkingDay: true,
      holiday: null,
      today: { date: today.toISOString(), dayName },
      nextWorkingDay: null,
      totalStudents,
      totalClasses: classes.length,
      markedClasses,
      pendingClasses: classes.length - markedClasses,
      present,
      absent,
      unmarked,
      percentage,
      classBreakdown: classBreakdown.sort((a, b) => {
        const rA = getClassRank(a.name);
        const rB = getClassRank(b.name);
        if (rA !== rB) return rA - rB;
        return (a.section || "").localeCompare(b.section || "");
      }),
      yesterday: yesterdayStats,
      trends,
    };
  }

  /**
   * Next working day after fromDate (IST calendar days only).
   * Never use setHours(0,0,0,0) in server local TZ — it skips/shifts days.
   */
  async _findNextWorkingDayForAttendance(sessionId, fromDate = new Date()) {
    const settings = await Settings.getSettings();
    const workingDaysMap = {};
    (settings?.workingDays || []).forEach((d) => {
      workingDaysMap[d.day] = d.isWorking;
    });

    // Anchor = IST calendar date of fromDate as YYYY-MM-DD
    const anchor = this._parseDateRange(fromDate); // { start, end } IST-as-Z
    let y = anchor.start.getUTCFullYear();
    let m = anchor.start.getUTCMonth();
    let day = anchor.start.getUTCDate();

    for (let i = 1; i <= 14; i++) {
      // Add i calendar days in UTC date parts of the IST-midnight Z stamp
      const candidate = new Date(Date.UTC(y, m, day + i, 0, 0, 0, 0));
      const ymd = candidate.toISOString().slice(0, 10); // YYYY-MM-DD
      const start = new Date(`${ymd}T00:00:00.000Z`);

      // Weekday of that school calendar day (IST-as-Z → use UTC parts)
      const dayName = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "UTC",
      }).format(start);

      const isWorking =
        workingDaysMap[dayName] === undefined
          ? dayName !== "Sunday" // safe default if settings incomplete
          : workingDaysMap[dayName] === true;

      if (!isWorking) continue;

      // Real IST holiday check (your holiday.repository fix)
      const holiday = await holidayRepository.isHoliday(start, sessionId);
      if (holiday && holiday.allowAttendance !== true) continue;

      const label = new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(start);

      return {
        date: start.toISOString(),
        dayName,
        label, // e.g. "Monday, 31 Aug"
      };
    }

    return null;
  }

  _emptyTodayStats() {
    return {
      isHoliday: false,
      isNonWorkingDay: false,
      isWorkingDay: true,
      holiday: null,
      today: null,
      nextWorkingDay: null,
      totalStudents: 0,
      totalClasses: 0,
      markedClasses: 0,
      pendingClasses: 0,
      present: 0,
      absent: 0,
      unmarked: 0,
      percentage: 0,
      classBreakdown: [],
      yesterday: null,
      trends: null,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  DASHBOARD ALERTS (Optimized - No Timeout)
  // ═══════════════════════════════════════════════════════════
  async getDashboardKPIs() {
    const Student = require("../models/Student.model");

    const settings = await Settings.findOne().populate("activeSession").lean();
    const activeSessionId =
      settings?.activeSession?._id || settings?.activeSession;

    const todayStats = await this.getTodayStats();

    let newAdmissions24h = 0;
    let newAdmissions7d = 0;

    if (activeSessionId) {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [count24h, count7d] = await Promise.all([
        Student.countDocuments({
          session: activeSessionId,
          status: "Active",
          isActive: true,
          createdAt: { $gte: last24h },
        }),
        Student.countDocuments({
          session: activeSessionId,
          status: "Active",
          isActive: true,
          createdAt: { $gte: last7d },
        }),
      ]);
      newAdmissions24h = count24h;
      newAdmissions7d = count7d;
    }

    return {
      attendancePercentage: todayStats.percentage,
      attendanceTrend: todayStats.trends?.percentageDiff ?? null,
      totalAbsent: todayStats.absent,
      absentTrend: todayStats.trends?.absentDiff ?? null,
      totalPresent: todayStats.present,
      presentTrend: todayStats.trends?.presentDiff ?? null,
      pendingClasses: todayStats.pendingClasses,
      markedClasses: todayStats.markedClasses,
      totalClasses: todayStats.totalClasses,
      totalStudents: todayStats.totalStudents,
      unmarked: todayStats.unmarked,
      newAdmissions24h,
      newAdmissions7d,
      isHoliday: todayStats.isHoliday,
      holiday: todayStats.holiday,
    };
  }

  async getDashboardAlerts() {
    const Class = require("../models/Class.model");
    const Student = require("../models/Student.model");
    const Attendance = require("../models/Attendance.model");
    const Holiday = require("../models/Holiday.model");

    const settings = await Settings.findOne().populate("activeSession").lean();
    const activeSessionId =
      settings?.activeSession?._id || settings?.activeSession;

    if (!activeSessionId) {
      return { alerts: [], total: 0 };
    }

    const alerts = [];
    const { start: today } = this._parseDateRange();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // 1. Pending Classes
    try {
      const holiday = await holidayRepository.isHoliday(today, activeSessionId);
      const isHoliday = holiday && !holiday.allowAttendance;

      const dayName = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "UTC",
      }).format(today);
      const workingDay = settings?.workingDays?.find((d) => d.day === dayName);
      const isWorkingDay = !workingDay || workingDay.isWorking !== false;

      if (!isHoliday && isWorkingDay) {
        const classes = await Class.find({
          session: activeSessionId,
          isArchived: false,
        }).lean();

        const classIds = classes.map((c) => c._id);
        const markedClassIds = await Attendance.distinct("class", {
          class: { $in: classIds },
          date: { $gte: today, $lt: tomorrow },
        });
        const markedSet = new Set(markedClassIds.map((id) => id.toString()));

        const pending = classes.filter((c) => !markedSet.has(c._id.toString()));

        if (pending.length > 0) {
          const previewNames = pending
            .slice(0, 3)
            .map((c) => `${c.name}-${c.section}`)
            .join(", ");
          alerts.push({
            id: "pending-classes",
            type: "warning",
            priority: "high",
            icon: "warning",
            title: `${pending.length} pending classes`,
            message: previewNames,
            count: pending.length,
            actionLabel: "Mark",
            actionLink: "/attendance/mark",
            metadata: {
              classes: pending.slice(0, 5).map((c) => ({
                id: c._id,
                name: `${c.name}-${c.section}`,
                teacher: c.teacherLabel || "Unassigned",
              })),
            },
          });
        }
      }
    } catch (err) {}

    // 2. Defaulters (Single Aggregation)
    try {
      const monthStart = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1, 0, 0, 0, 0),
      );
      const threshold = settings?.warningPercentage || 75;

      const students = await Student.find({
        session: activeSessionId,
        status: "Active",
        isActive: true,
      })
        .select("_id name")
        .lean();

      const studentIds = students.map((s) => s._id);
      const nameMap = {};
      students.forEach((s) => {
        nameMap[s._id.toString()] = s.name;
      });

      if (studentIds.length > 0) {
        const stats = await Attendance.aggregate([
          {
            $match: {
              student: { $in: studentIds },
              date: { $gte: monthStart, $lte: tomorrow },
            },
          },
          {
            $group: {
              _id: { student: "$student", status: "$status" },
              count: { $sum: 1 },
            },
          },
        ]);

        const byStudent = {};
        stats.forEach((r) => {
          const sid = r._id.student.toString();
          if (!byStudent[sid]) byStudent[sid] = { present: 0, absent: 0 };
          if (r._id.status === "Present") byStudent[sid].present = r.count;
          if (r._id.status === "Absent") byStudent[sid].absent = r.count;
        });

        let defaulterCount = 0;
        const defaulterNames = [];

        Object.entries(byStudent).forEach(([sid, st]) => {
          const total = st.present + st.absent;
          if (total < 5) return;
          const pct = Math.round((st.present / total) * 100);
          if (pct < threshold) {
            defaulterCount++;
            if (defaulterNames.length < 3) {
              defaulterNames.push(nameMap[sid] || "Student");
            }
          }
        });

        if (defaulterCount > 0) {
          alerts.push({
            id: "defaulters",
            type: "error",
            priority: "high",
            icon: "trending-down",
            title: `${defaulterCount} defaulters`,
            message: defaulterNames.join(", "),
            count: defaulterCount,
            actionLabel: "View",
            actionLink: "/reports/defaulters",
            metadata: { threshold },
          });
        }
      }
    } catch (err) {}

    return { alerts, total: alerts.length };
  }

  async getRecentActivity(limit = 10) {
    const ActivityLog = require("../models/ActivityLog.model");
    const safeLimit = Math.min(parseInt(limit, 10) || 10, 50);

    const logs = await ActivityLog.find({
      action: {
        $in: [
          "MARK_ATTENDANCE",
          "CREATE",
          "UPDATE",
          "DELETE",
          "LOCK",
          "UNLOCK",
          "LOGIN",
        ],
      },
    })
      .sort("-createdAt")
      .limit(safeLimit)
      .populate("user", "name role")
      .lean();

    return logs.map((log) => ({
      _id: log._id,
      action: log.action,
      module: log.module,
      description: log.description,
      userName: log.user?.name || log.userName || "System",
      userRole: log.user?.role || "system",
      createdAt: log.createdAt,
      iconType: this._getActivityIconType(log.action, log.module),
    }));
  }

  _getActivityIconType(action, module) {
    if (action === "MARK_ATTENDANCE") return "attendance";
    if (action === "LOGIN") return "login";
    if (action === "LOCK" || action === "UNLOCK") return "lock";
    if (module === "Student") return "student";
    if (module === "Class") return "class";
    return "default";
  }
}

module.exports = new AttendanceService();
