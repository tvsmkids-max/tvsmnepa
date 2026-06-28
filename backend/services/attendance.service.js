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
   */
  async getSheet({ classId, date, user }) {
    const cls = await classRepository.findById(classId);
    if (!cls) throwError("Class not found", 404);

    const settings = await Settings.getSettings();
    const sessionId = cls.session;

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

    const Student = require("../models/Student.model");
    const students = await Student.find({
      class: classId,
      status: { $nin: STATUSES_BLOCKING_ATTENDANCE },
      isActive: true,
    })
      .sort("rollNumber")
      .lean();

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

    const holiday = await holidayRepository.isHoliday(date, cls.session);
    if (holiday && !holiday.allowAttendance) {
      throwError(
        `Cannot mark attendance on holiday: ${holiday.name}. Admin must enable override.`,
        400,
      );
    }

    const isLocked = await attendanceRepository.isLocked(classId, date);
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

    const holiday = await holidayRepository.isHoliday(
      today,
      settings.activeSession,
    );
    if (holiday && !holiday.allowAttendance) return [];

    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
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

    // ─── Get active session ───
    let activeSessionId = null;
    const settings = await Settings.findOne().populate("activeSession").lean();
    if (settings?.activeSession) {
      activeSessionId = settings.activeSession._id || settings.activeSession;
    }
    if (!activeSessionId) {
      const session = await AcademicSession.findOne({ isActive: true }).lean();
      if (session) activeSessionId = session._id;
    }

    if (!activeSessionId) {
      return this._emptyTodayStats();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // ─── Check holiday ───
    const holiday = await holidayRepository.isHoliday(today, activeSessionId);
    if (holiday && !holiday.allowAttendance) {
      return {
        ...this._emptyTodayStats(),
        isHoliday: true,
        holiday,
      };
    }

    // ─── Get classes ───
    let classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    })
      .populate("classTeacher", "name")
      .lean();

    if (classes.length === 0) {
      classes = await Class.find({ isArchived: false })
        .populate("classTeacher", "name")
        .lean();
    }

    if (classes.length === 0) {
      return this._emptyTodayStats();
    }

    const classIds = classes.map((c) => c._id);

    // ─── Get TODAY's ACTIVE students only ───
    const todayStudents = await Student.find({
      class: { $in: classIds },
      status: "Active",
      isActive: true,
    }).lean();

    // Build active student set & class count
    const activeStudentIds = new Set(
      todayStudents.map((s) => s._id.toString()),
    );

    const studentCountMap = {};
    todayStudents.forEach((s) => {
      const cid = s.class.toString();
      studentCountMap[cid] = (studentCountMap[cid] || 0) + 1;
    });

    const totalStudents = todayStudents.length;

    // ─── Get today's attendance ───
    const todayAttendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: today, $lt: tomorrow },
    }).lean();

    // ─── KEY FIX: Only count attendance for ACTIVE students ───
    // ─── KEY FIX: Only count attendance for ACTIVE students + Dedupe ───
    const classStatsMap = {};
    const countedStudentInClass = new Set(); // Prevent duplicates

    todayAttendance.forEach((rec) => {
      const studentId = rec.student.toString();
      const cid = rec.class.toString();
      const uniqueKey = `${cid}-${studentId}`;

      // Skip if student is no longer active
      if (!activeStudentIds.has(studentId)) return;

      // Skip if we've already counted this student in this class
      // (handles duplicate records bug)
      if (countedStudentInClass.has(uniqueKey)) return;
      countedStudentInClass.add(uniqueKey);

      // Verify student actually belongs to THIS class (not another class)
      // This prevents counting students from one class in another
      const actualClassId = todayStudents
        .find((s) => s._id.toString() === studentId)
        ?.class?.toString();
      if (actualClassId && actualClassId !== cid) return;

      if (!classStatsMap[cid]) classStatsMap[cid] = { Present: 0, Absent: 0 };
      classStatsMap[cid][rec.status] =
        (classStatsMap[cid][rec.status] || 0) + 1;
    });

    // ─── Build class breakdown ───
    const classBreakdown = classes.map((cls) => {
      const cid = cls._id.toString();
      const stats = classStatsMap[cid] || { Present: 0, Absent: 0 };
      const totalInClass = studentCountMap[cid] || 0;

      // ✅ CRITICAL: Cap counts to total students (prevents inflation)
      const present = Math.min(stats.Present, totalInClass);
      const absent = Math.min(stats.Absent, totalInClass - present);

      const marked = present + absent;
      const unmarkedInClass = Math.max(0, totalInClass - marked);
      const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        classTeacher: cls.classTeacher?.name || null,
        classTeacherId: cls.classTeacher?._id || null,
        totalStudents: totalInClass,
        present, // ← use capped value
        absent, // ← use capped value
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
    const unmarked = Math.max(0, totalStudents - totalMarked); // ✅ FIX

    const percentage =
      totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 0;

    // ─── YESTERDAY COMPARISON ───
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
        if (!activeStudentIds.has(sid)) return; // Filter inactive students
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
    } catch {
      // Silent fail
    }

    const trends = yesterdayStats
      ? {
          percentageDiff: percentage - yesterdayStats.percentage,
          absentDiff: absent - yesterdayStats.absent,
          presentDiff: present - yesterdayStats.present,
        }
      : null;

    return {
      isHoliday: false,
      holiday: null,
      totalStudents,
      totalClasses: classes.length,
      markedClasses,
      pendingClasses: classes.length - markedClasses,
      present,
      absent,
      unmarked,
      percentage,
      classBreakdown: classBreakdown.sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      yesterday: yesterdayStats,
      trends,
    };
  }

  /**
   * Empty stats object (for fallback)
   */
  _emptyTodayStats() {
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
      yesterday: null,
      trends: null,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  NEW DASHBOARD METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Dashboard KPIs — today's actionable metrics with trends
   */
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

  /**
   * Dashboard Alerts — actionable items needing attention
   */
  async getDashboardAlerts() {
    const Class = require("../models/Class.model");
    const Student = require("../models/Student.model");
    const Attendance = require("../models/Attendance.model");
    const Holiday = require("../models/Holiday.model");

    const settings = await Settings.findOne().populate("activeSession").lean();
    const activeSessionId =
      settings?.activeSession?._id || settings?.activeSession;

    if (!activeSessionId) {
      return {
        alerts: [
          {
            id: "no-active-session",
            type: "error",
            priority: "critical",
            icon: "error",
            title: "No active session set",
            message: "Set an active session to enable attendance tracking",
            actionLabel: "Settings",
            actionLink: "/settings",
          },
        ],
        total: 1,
      };
    }

    const alerts = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ─── ALERT 1: Pending Classes ───
    try {
      const holiday = await Holiday.isHoliday(today, activeSessionId);
      const isHoliday = holiday && !holiday.allowAttendance;

      const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
      const workingDay = settings?.workingDays?.find((d) => d.day === dayName);
      const isWorkingDay = !workingDay || workingDay.isWorking;

      if (!isHoliday && isWorkingDay) {
        const classes = await Class.find({
          session: activeSessionId,
          isArchived: false,
        })
          .populate("classTeacher", "name")
          .lean();

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
          const moreText =
            pending.length > 3 ? ` and ${pending.length - 3} more` : "";

          alerts.push({
            id: "pending-classes",
            type: "warning",
            priority: "high",
            icon: "warning",
            title: `${pending.length} class${pending.length !== 1 ? "es" : ""} pending`,
            message: previewNames + moreText,
            count: pending.length,
            actionLabel: "Mark Now",
            actionLink: "/attendance/mark",
            metadata: {
              classes: pending.slice(0, 5).map((c) => ({
                id: c._id,
                name: `${c.name}-${c.section}`,
                teacher: c.classTeacher?.name || "Unassigned",
              })),
            },
          });
        }
      }
    } catch (err) {
      // Silent fail
    }

    // ─── ALERT 2: Defaulters (below threshold this month) ───
    try {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const threshold = settings?.warningPercentage || 75;

      const students = await Student.find({
        session: activeSessionId,
        status: "Active",
        isActive: true,
      })
        .limit(500)
        .lean();

      let defaulterCount = 0;
      const defaulterNames = [];

      for (const s of students) {
        const stats = await Attendance.aggregate([
          {
            $match: {
              student: s._id,
              date: { $gte: monthStart, $lte: today },
            },
          },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        let present = 0;
        let absent = 0;
        stats.forEach((r) => {
          if (r._id === "Present") present = r.count;
          if (r._id === "Absent") absent = r.count;
        });

        const total = present + absent;
        if (total >= 5) {
          const pct = Math.round((present / total) * 100);
          if (pct < threshold) {
            defaulterCount++;
            if (defaulterNames.length < 3) defaulterNames.push(s.name);
          }
        }
      }

      if (defaulterCount > 0) {
        const moreText =
          defaulterCount > defaulterNames.length
            ? ` and ${defaulterCount - defaulterNames.length} more`
            : "";

        alerts.push({
          id: "defaulters",
          type: "error",
          priority: "high",
          icon: "trending-down",
          title: `${defaulterCount} defaulter${defaulterCount !== 1 ? "s" : ""} this month`,
          message: defaulterNames.join(", ") + moreText,
          count: defaulterCount,
          actionLabel: "View List",
          actionLink: "/reports",
          metadata: { threshold },
        });
      }
    } catch (err) {
      // Silent fail
    }

    // ─── ALERT 3: Upcoming Holidays (next 7 days) ───
    try {
      const next7Days = new Date(today);
      next7Days.setDate(next7Days.getDate() + 7);

      const upcomingHolidays = await Holiday.find({
        session: activeSessionId,
        date: { $gte: today, $lte: next7Days },
      })
        .sort("date")
        .lean();

      if (upcomingHolidays.length > 0) {
        const next = upcomingHolidays[0];
        const nextDate = new Date(next.date);
        nextDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

        let title;
        if (daysUntil === 0) title = `Today: ${next.name}`;
        else if (daysUntil === 1) title = `Tomorrow: ${next.name}`;
        else title = `In ${daysUntil} days: ${next.name}`;

        alerts.push({
          id: "upcoming-holiday",
          type: "info",
          priority: "medium",
          icon: "beach-access",
          title,
          message:
            upcomingHolidays.length > 1
              ? `${upcomingHolidays.length} holidays in next 7 days`
              : `${next.type} holiday`,
          count: upcomingHolidays.length,
          actionLabel: "View All",
          actionLink: "/holidays",
          metadata: {
            holidays: upcomingHolidays.map((h) => ({
              name: h.name,
              date: h.date,
              type: h.type,
            })),
          },
        });
      }
    } catch (err) {
      // Silent fail
    }

    // ─── ALERT 4: System Configuration Issues ───
    try {
      if (!settings?.attendanceOpenTime || !settings?.attendanceLockTime) {
        alerts.push({
          id: "no-attendance-hours",
          type: "warning",
          priority: "medium",
          icon: "schedule",
          title: "Attendance hours not configured",
          message: "Configure open/close times for attendance",
          actionLabel: "Configure",
          actionLink: "/settings",
        });
      }

      // Check last backup
      const lastBackup = settings?.lastBackupAt;
      if (!lastBackup) {
        alerts.push({
          id: "no-backup",
          type: "warning",
          priority: "medium",
          icon: "backup",
          title: "No backup created yet",
          message: "Create a backup to protect your data",
          actionLabel: "Backup Now",
          actionLink: "/backup",
        });
      } else {
        const daysSince = Math.floor(
          (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSince >= 14) {
          alerts.push({
            id: "stale-backup",
            type: "warning",
            priority: "low",
            icon: "backup",
            title: `Backup is ${daysSince} days old`,
            message: "Create a fresh backup",
            actionLabel: "Backup Now",
            actionLink: "/backup",
          });
        }
      }
    } catch (err) {
      // Silent fail
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort(
      (a, b) =>
        (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4),
    );

    return {
      alerts,
      total: alerts.length,
    };
  }

  /**
   * Recent Activity Feed for Dashboard
   */
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
          "PROMOTE",
          "LOCK",
          "UNLOCK",
          "LOGIN",
          "BACKUP",
          "RESTORE",
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

  /**
   * Helper: Determine icon type for activity feed
   */
  _getActivityIconType(action, module) {
    if (action === "MARK_ATTENDANCE") return "attendance";
    if (action === "LOGIN") return "login";
    if (action === "BACKUP" || action === "RESTORE") return "backup";
    if (action === "LOCK" || action === "UNLOCK") return "lock";
    if (action === "PROMOTE") return "promote";
    if (module === "Student") return "student";
    if (module === "Class") return "class";
    if (module === "Teacher") return "teacher";
    if (module === "Holiday") return "holiday";
    if (module === "Notification") return "notification";
    if (module === "Settings") return "settings";
    return "default";
  }
}

module.exports = new AttendanceService();
