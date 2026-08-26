"use strict";

const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const Teacher = require("../models/Teacher.model");
const Attendance = require("../models/Attendance.model");
const Holiday = require("../models/Holiday.model");
const holidayRepository = require("../repositories/holiday.repository"); // ✅ FIXED IMPORT
const Settings = require("../models/Settings.model");
const AcademicSession = require("../models/AcademicSession.model");
const { STATUSES_BLOCKING_ATTENDANCE } = require("../constants/studentStatus");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class DashboardService {
  async _getActiveSessionId() {
    const settings = await Settings.findOne().populate("activeSession").lean();
    if (settings?.activeSession) {
      return settings.activeSession._id || settings.activeSession;
    }
    const session = await AcademicSession.findOne({ isActive: true }).lean();
    return session?._id || null;
  }

  async _getTeacherClassIds(userId) {
    const teacher = await Teacher.findOne({ user: userId }).lean();
    if (
      !teacher ||
      !teacher.assignedClasses ||
      teacher.assignedClasses.length === 0
    ) {
      return [];
    }
    return teacher.assignedClasses.map((id) => id.toString());
  }

  // ═══════════════════════════════════════════════════════════════
  //  TIMEZONE-LOCKED DATE RANGE GENERATOR (Forced to Asia/Kolkata)
  // ═══════════════════════════════════════════════════════════════
  _getDateRange(period) {
    const tzOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
    const now = new Date();
    const istTime = new Date(now.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const d = String(istTime.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    if (period === "today") {
      const start = new Date(`${dateStr}T00:00:00.000Z`);
      const end = new Date(`${dateStr}T23:59:59.999Z`);
      return { start, end, label: "Today" };
    }

    if (period === "week") {
      const day = istTime.getUTCDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;

      const mondayIST = new Date(
        istTime.getTime() + diffToMonday * 24 * 60 * 60 * 1000,
      );
      const my = mondayIST.getUTCFullYear();
      const mm = String(mondayIST.getUTCMonth() + 1).padStart(2, "0");
      const md = String(mondayIST.getUTCDate()).padStart(2, "0");
      const mondayStr = `${my}-${mm}-${md}`;

      const start = new Date(`${mondayStr}T00:00:00.000Z`);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return { start, end, label: "This Week" };
    }

    if (period === "month") {
      const start = new Date(`${y}-${m}-01T00:00:00.000Z`);
      const lastDay = new Date(y, parseInt(m), 0).getDate();
      const lastDayStr = String(lastDay).padStart(2, "0");
      const end = new Date(`${y}-${m}-${lastDayStr}T23:59:59.999Z`);
      return { start, end, label: "This Month" };
    }

    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);
    return { start, end, label: "Today" };
  }

  // ═══════════════════════════════════════════════════════════════
  //  TIMEZONE-LOCKED TODAY STATUS
  // ═══════════════════════════════════════════════════════════════
  async _getTodayStatus(sessionId) {
    const tzOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istTime = new Date(now.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const d = String(istTime.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const today = new Date(`${dateStr}T00:00:00.000Z`);

    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    });
    const dayName = formatter.format(now);

    const settings = await Settings.getSettings();

    const workingDay = settings?.workingDays?.find((d) => d.day === dayName);
    const isWorkingDay = !workingDay || workingDay.isWorking;

    // ✅ FIXED: Using holidayRepository instead of Holiday model!
    const holiday = await holidayRepository.isHoliday(today, sessionId);
    const isHoliday = holiday && !holiday.allowAttendance;

    const nextWorkingDay = await this._findNextWorkingDay(sessionId, today);

    return {
      isHoliday,
      isWorkingDay,
      isNonWorkingDay: !isWorkingDay && !isHoliday,
      holiday: isHoliday ? holiday : null,
      today: {
        date: today.toISOString(),
        dayName,
      },
      nextWorkingDay,
    };
  }

  async _findNextWorkingDay(sessionId, fromDate = new Date()) {
    const settings = await Settings.getSettings();
    const workingDaysMap = {};
    (settings?.workingDays || []).forEach((d) => {
      workingDaysMap[d.day] = d.isWorking;
    });

    const start = new Date(fromDate);
    const end = new Date(fromDate);
    end.setDate(end.getDate() + 30);

    const holidays = await Holiday.find({
      session: sessionId,
      date: { $lte: end },
      allowAttendance: { $ne: true },
      $or: [
        { endDate: null, date: { $gte: start } },
        { endDate: { $gte: start } },
      ],
    })
      .select("date endDate")
      .lean();

    const isDateHoliday = (candidateDate) => {
      return holidays.some((h) => {
        const hStart = new Date(h.date);
        hStart.setHours(0, 0, 0, 0);
        const hEnd = h.endDate ? new Date(h.endDate) : hStart;
        hEnd.setHours(23, 59, 59, 999);
        return candidateDate >= hStart && candidateDate <= hEnd;
      });
    };

    for (let i = 1; i <= 14; i++) {
      const candidate = new Date(fromDate);
      candidate.setDate(candidate.getDate() + i);
      candidate.setHours(0, 0, 0, 0);

      const formatter = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "Asia/Kolkata",
      });
      const candidateDayName = formatter.format(candidate);

      const isWorking =
        workingDaysMap[candidateDayName] === undefined
          ? true
          : workingDaysMap[candidateDayName];

      if (!isWorking) continue;
      if (isDateHoliday(candidate)) continue;

      const labelFormatter = new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata",
      });

      return {
        date: candidate.toISOString(),
        dayName: candidateDayName,
        label: labelFormatter.format(candidate),
      };
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  //  TEACHER SUMMARY
  // ═══════════════════════════════════════════════════════════════
  async getTeacherSummary({ user, period = "today" }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) {
      return this._emptySummary();
    }

    const classIds = await this._getTeacherClassIds(user._id);
    if (classIds.length === 0) {
      return this._emptySummary();
    }

    const classes = await Class.find({
      _id: { $in: classIds },
      isArchived: false,
    }).lean();

    if (classes.length === 0) {
      return this._emptySummary();
    }

    const todayStatus = await this._getTodayStatus(activeSessionId);

    if (todayStatus.isHoliday || todayStatus.isNonWorkingDay) {
      return {
        period,
        periodLabel: this._getDateRange(period).label,
        isHoliday: todayStatus.isHoliday,
        isWorkingDay: todayStatus.isWorkingDay,
        isNonWorkingDay: todayStatus.isNonWorkingDay,
        holiday: todayStatus.holiday,
        today: todayStatus.today,
        nextWorkingDay: todayStatus.nextWorkingDay,
        attendanceStatus: todayStatus.isHoliday ? "holiday" : "non_working",
        totalClasses: classes.length,
        totalStudents: 0,
        present: 0,
        absent: 0,
        marked: 0,
        percentage: 0,
        markedClassesToday: 0,
        pendingClassesToday: 0,
        classBreakdown: [],
      };
    }

    const classObjIds = classes.map((c) => c._id);

    const tzOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istTime = new Date(now.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const d = String(istTime.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const today = new Date(`${dateStr}T00:00:00.000Z`);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const students = await Student.find({
      class: { $in: classObjIds },
      status: { $nin: STATUSES_BLOCKING_ATTENDANCE },
      isActive: true,
    })
      .select("_id class")
      .lean();

    const activeStudentIds = new Set(students.map((s) => s._id.toString()));
    const totalStudents = students.length;

    const studentCountMap = {};
    students.forEach((s) => {
      const cid = s.class.toString();
      studentCountMap[cid] = (studentCountMap[cid] || 0) + 1;
    });

    const { start, end, label } = this._getDateRange(period);

    const attendance = await Attendance.find({
      class: { $in: classObjIds },
      date: { $gte: start, $lte: end },
    })
      .select("student class status date")
      .lean();

    let periodPresent = 0;
    let periodAbsent = 0;
    const seen = new Set();

    attendance.forEach((r) => {
      const sid = r.student.toString();
      if (!activeStudentIds.has(sid)) return;
      const key = `${sid}-${r.class.toString()}-${new Date(r.date).toDateString()}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (r.status === "Present") periodPresent++;
      else if (r.status === "Absent") periodAbsent++;
    });

    const periodMarked = periodPresent + periodAbsent;
    const periodPercentage =
      periodMarked > 0 ? Math.round((periodPresent / periodMarked) * 100) : 0;

    const todayAttendance = await Attendance.find({
      class: { $in: classObjIds },
      date: { $gte: today, $lt: tomorrow },
    })
      .select("student class status")
      .lean();

    const todayClassStats = {};
    const seenToday = new Set();

    todayAttendance.forEach((r) => {
      const sid = r.student.toString();
      if (!activeStudentIds.has(sid)) return;
      const key = `${sid}-${r.class.toString()}`;
      if (seenToday.has(key)) return;
      seenToday.add(key);
      const cid = r.class.toString();
      if (!todayClassStats[cid])
        todayClassStats[cid] = { present: 0, absent: 0 };
      todayClassStats[cid][r.status.toLowerCase()]++;
    });

    const classBreakdown = classes.map((cls) => {
      const cid = cls._id.toString();
      const stats = todayClassStats[cid] || { present: 0, absent: 0 };
      const totalInClass = studentCountMap[cid] || 0;
      const present = Math.min(stats.present, totalInClass);
      const absent = Math.min(stats.absent, totalInClass - present);
      const marked = present + absent;
      const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        studentCount: totalInClass,
        present,
        absent,
        marked,
        pending: Math.max(0, totalInClass - marked),
        percentage,
        isMarkedToday: marked > 0,
      };
    });

    const markedClassesToday = classBreakdown.filter(
      (c) => c.isMarkedToday,
    ).length;
    const pendingClassesToday = classes.length - markedClassesToday;

    let attendanceStatus = "pending";
    if (pendingClassesToday === 0) attendanceStatus = "marked";
    else if (markedClassesToday > 0) attendanceStatus = "partial";

    return {
      period,
      periodLabel: label,
      isHoliday: false,
      isWorkingDay: true,
      isNonWorkingDay: false,
      holiday: null,
      today: todayStatus.today,
      nextWorkingDay: null,
      attendanceStatus,
      totalClasses: classes.length,
      totalStudents,
      present: periodPresent,
      absent: periodAbsent,
      marked: periodMarked,
      percentage: periodPercentage,
      markedClassesToday,
      pendingClassesToday,
      classBreakdown: classBreakdown.sort((a, b) =>
        `${a.name}${a.section}`.localeCompare(`${b.name}${b.section}`),
      ),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  TEACHER DEFAULTERS (Removed Roll References)
  // ═══════════════════════════════════════════════════════════════
  async getTeacherDefaulters({ user, limit = 5, threshold = 75 }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) return [];

    const classIds = await this._getTeacherClassIds(user._id);
    if (classIds.length === 0) return [];

    const tzOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istTime = new Date(now.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = istTime.getUTCMonth();

    const monthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - tzOffset);
    const monthEnd = new Date(
      Date.UTC(y, m + 1, 0, 23, 59, 59, 999) - tzOffset,
    );

    const students = await Student.find({
      class: { $in: classIds },
      status: "Active",
      isActive: true,
    })
      .select("_id name class fatherName scholarNumber")
      .populate("class", "name section")
      .lean();

    if (students.length === 0) return [];

    const studentIds = students.map((s) => s._id);

    const stats = await Attendance.aggregate([
      {
        $match: {
          student: { $in: studentIds },
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $group: {
          _id: { student: "$student", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    const studentStats = {};
    stats.forEach((s) => {
      const sid = s._id.student.toString();
      if (!studentStats[sid]) studentStats[sid] = { present: 0, absent: 0 };
      if (s._id.status === "Present") studentStats[sid].present = s.count;
      else if (s._id.status === "Absent") studentStats[sid].absent = s.count;
    });

    const defaulters = students
      .map((s) => {
        const st = studentStats[s._id.toString()] || { present: 0, absent: 0 };
        const total = st.present + st.absent;
        const percentage =
          total > 0 ? Math.round((st.present / total) * 100) : 0;
        return {
          _id: s._id,
          name: s.name,
          scholarNumber: s.scholarNumber,
          fatherName: s.fatherName,
          className: s.class?.name,
          section: s.class?.section,
          present: st.present,
          absent: st.absent,
          total,
          percentage,
        };
      })
      .filter((s) => s.total >= 5 && s.percentage < threshold)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, limit);

    return defaulters;
  }

  // ═══════════════════════════════════════════════════════════════
  //  UPCOMING HOLIDAYS
  // ═══════════════════════════════════════════════════════════════
  async getUpcomingHolidays({ limit = 3, days = 60 }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) return [];

    const tzOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istTime = new Date(now.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = istTime.getUTCMonth();
    const d = istTime.getUTCDate();

    const today = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - tzOffset);
    const rangeEnd = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const holidays = await Holiday.find({
      session: activeSessionId,
      date: { $gte: today, $lte: rangeEnd },
    })
      .sort("date")
      .limit(limit)
      .lean();

    return holidays.map((h) => {
      const holidayDate = new Date(h.date);
      holidayDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil(
        (holidayDate - today) / (1000 * 60 * 60 * 24),
      );
      return {
        _id: h._id,
        name: h.name,
        date: h.date,
        type: h.type,
        daysUntil,
        dayName: holidayDate.toLocaleDateString("en-US", { weekday: "short" }),
      };
    });
  }

  _emptySummary() {
    return {
      period: "today",
      periodLabel: "Today",
      isHoliday: false,
      isWorkingDay: true,
      isNonWorkingDay: false,
      holiday: null,
      today: null,
      nextWorkingDay: null,
      attendanceStatus: "no_data",
      totalClasses: 0,
      totalStudents: 0,
      present: 0,
      absent: 0,
      marked: 0,
      percentage: 0,
      markedClassesToday: 0,
      pendingClassesToday: 0,
      classBreakdown: [],
    };
  }
}

module.exports = new DashboardService();
