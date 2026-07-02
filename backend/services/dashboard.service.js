"use strict";

const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const Teacher = require("../models/Teacher.model");
const Attendance = require("../models/Attendance.model");
const Holiday = require("../models/Holiday.model");
const Settings = require("../models/Settings.model");
const AcademicSession = require("../models/AcademicSession.model");
const { STATUSES_BLOCKING_ATTENDANCE } = require("../constants/studentStatus");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class DashboardService {
  /**
   * HELPER: Get active session ID
   */
  async _getActiveSessionId() {
    const settings = await Settings.findOne().populate("activeSession").lean();
    if (settings?.activeSession) {
      return settings.activeSession._id || settings.activeSession;
    }
    const session = await AcademicSession.findOne({ isActive: true }).lean();
    return session?._id || null;
  }

  /**
   * HELPER: Get teacher's assigned class IDs
   */
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

  /**
   * HELPER: Get date range based on period
   * period: "today" | "week" | "month"
   */
  _getDateRange(period) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (period === "today") {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start: now, end, label: "Today" };
    }

    if (period === "week") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(now);
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return { start, end, label: "This Week" };
    }

    if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return { start, end, label: "This Month" };
    }

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start: now, end, label: "Today" };
  }

  /**
   * TEACHER SUMMARY — Main dashboard stats
   */
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

    const classObjIds = classes.map((c) => c._id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const holiday = await Holiday.isHoliday(today, activeSessionId);
    const isHoliday = holiday && !holiday.allowAttendance;

    const settings = await Settings.getSettings();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const workingDay = settings?.workingDays?.find((d) => d.day === dayName);
    const isWorkingDay = !workingDay || workingDay.isWorking;

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
    if (isHoliday) attendanceStatus = "holiday";
    else if (!isWorkingDay) attendanceStatus = "non_working";
    else if (pendingClassesToday === 0) attendanceStatus = "marked";
    else if (markedClassesToday > 0) attendanceStatus = "partial";

    return {
      period,
      periodLabel: label,
      isHoliday,
      isWorkingDay,
      holiday: isHoliday ? holiday : null,
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

  /**
   * TEACHER DEFAULTERS — Students below threshold this month
   */
  async getTeacherDefaulters({ user, limit = 5, threshold = 75 }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) return [];

    const classIds = await this._getTeacherClassIds(user._id);
    if (classIds.length === 0) return [];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const students = await Student.find({
      class: { $in: classIds },
      status: "Active",
      isActive: true,
    })
      .select("_id name rollNumber class fatherName")
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
          rollNumber: s.rollNumber,
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

  /**
   * UPCOMING HOLIDAYS
   */
  async getUpcomingHolidays({ limit = 3, days = 60 }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + days);

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

  /**
   * Empty summary fallback
   */
  _emptySummary() {
    return {
      period: "today",
      periodLabel: "Today",
      isHoliday: false,
      isWorkingDay: true,
      holiday: null,
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
