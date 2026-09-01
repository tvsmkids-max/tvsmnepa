"use strict";

const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const Attendance = require("../models/Attendance.model");
const Holiday = require("../models/Holiday.model");
const Settings = require("../models/Settings.model");
const AcademicSession = require("../models/AcademicSession.model");
const ManagementAccess = require("../models/ManagementAccess.model");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class ManagementService {
  // ═══════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════
  async _getActiveSessionId() {
    const settings = await Settings.findOne().populate("activeSession").lean();
    if (settings?.activeSession) {
      return settings.activeSession._id || settings.activeSession;
    }
    const session = await AcademicSession.findOne({ isActive: true }).lean();
    return session?._id || null;
  }

  _parseDateToIST(dateStr, isEndOfDay = false) {
    const d = new Date(dateStr);
    const tzOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(d.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const day = String(istTime.getUTCDate()).padStart(2, "0");
    const time = isEndOfDay ? "23:59:59.999Z" : "00:00:00.000Z";
    return new Date(`${y}-${m}-${day}T${time}`);
  }

  _dateKey(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  _getClassGroup(className) {
    if (!className) return "OTHER";
    const n = className.toString().trim().toUpperCase();
    if (/NUR|LKG|UKG|PRE|PLAY/.test(n)) return "PRE PRIMARY";
    const m = n.match(/^(?:CLASS\s*)?(\d{1,2})/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num >= 1 && num <= 5) return "PRIMARY";
      if (num >= 6 && num <= 8) return "MIDDLE";
      if (num >= 9 && num <= 12) return "SENIOR";
    }
    return "OTHER";
  }

  _getClassSortRank(className) {
    if (!className) return 999;
    const name = className.toString().trim().toUpperCase();
    if (/^PRE/.test(name) || name === "PLAYGROUP") return 0;
    if (/^NUR/.test(name) || name === "NURSERY") return 1;
    if (/^L\.?K\.?G/.test(name) || name === "LKG") return 2;
    if (/^U\.?K\.?G/.test(name) || name === "UKG") return 3;
    const numericMatch = name.match(/^(?:CLASS\s*)?(\d{1,2})/);
    if (numericMatch) {
      const num = parseInt(numericMatch[1], 10);
      if (num >= 1 && num <= 12) return 10 + num;
    }
    return 999;
  }

  _sortClasses(classes) {
    return [...classes].sort((a, b) => {
      const rankA = this._getClassSortRank(a.name);
      const rankB = this._getClassSortRank(b.name);
      if (rankA !== rankB) return rankA - rankB;
      return (a.section || "").localeCompare(b.section || "");
    });
  }

  _calculateWorkingDays(start, end, holidays) {
    const holidayDates = new Set(
      holidays.map((h) => {
        const d = new Date(h.date);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
    );
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dayName = cur.toLocaleDateString("en-US", { weekday: "long" });
      const dateKey = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;
      if (dayName !== "Sunday" && !holidayDates.has(dateKey)) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  // ═══════════════════════════════════════════════════════════════
  //  RANGE OVERVIEW (Main Data Source for Today Page)
  // ═══════════════════════════════════════════════════════════════
  async getRangeOverview({ from, to, group = "ALL" }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) throwError("No active session found", 400);

    const fromDate = this._parseDateToIST(from, false);
    const toDate = this._parseDateToIST(to, true);
    const todayStart = this._parseDateToIST(
      new Date().toISOString().split("T")[0],
      false,
    );
    const todayEnd = this._parseDateToIST(
      new Date().toISOString().split("T")[0],
      true,
    );

    const daysDiff = Math.max(1, Math.round((toDate - fromDate) / 86400000));
    const prevToDate = new Date(fromDate.getTime() - 1);
    const prevFromDate = new Date(
      prevToDate.getTime() - daysDiff * 86400000 + 1,
    );

    // 1. Get & Filter Classes
    let classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    }).lean();
    if (group !== "ALL") {
      classes = classes.filter((c) => this._getClassGroup(c.name) === group);
    }
    const classIds = classes.map((c) => c._id);
    if (classIds.length === 0) return this._emptyRangeData(from, to, group);

    // 2. Get Students
    const students = await Student.find({
      class: { $in: classIds },
      status: "Active",
      isActive: true,
    })
      .select("_id class")
      .lean();
    const activeStudentIds = new Set(students.map((s) => s._id.toString()));

    const studentCountMap = {};
    students.forEach((s) => {
      const cid = s.class.toString();
      studentCountMap[cid] = (studentCountMap[cid] || 0) + 1;
    });

    // 3. Get Attendance (Current, Previous, Today)
    const [currentAtt, prevAtt, todayAtt] = await Promise.all([
      Attendance.find({
        class: { $in: classIds },
        date: { $gte: fromDate, $lte: toDate },
      })
        .select("student class status date")
        .lean(),
      Attendance.find({
        class: { $in: classIds },
        date: { $gte: prevFromDate, $lte: prevToDate },
      })
        .select("student status")
        .lean(),
      Attendance.find({
        class: { $in: classIds },
        date: { $gte: todayStart, $lte: todayEnd },
      })
        .select("student class status")
        .lean(),
    ]);

    // 4. Process Current Range
    let currentP = 0,
      currentA = 0;
    const dailyStats = {};
    const uniqueStudentsMarked = new Set();

    currentAtt.forEach((r) => {
      const sid = r.student.toString();
      if (!activeStudentIds.has(sid)) return;
      const dStr = new Date(r.date).toISOString().split("T")[0];

      if (r.status === "Present") currentP++;
      else if (r.status === "Absent") currentA++;
      uniqueStudentsMarked.add(sid);

      if (!dailyStats[dStr])
        dailyStats[dStr] = { P: 0, A: 0, date: new Date(r.date) };
      dailyStats[dStr][r.status === "Present" ? "P" : "A"]++;
    });

    // 5. Process Previous Range (for KPI deltas)
    let prevP = 0,
      prevA = 0;
    const prevUniqueMarked = new Set();
    prevAtt.forEach((r) => {
      const sid = r.student.toString();
      if (!activeStudentIds.has(sid)) return;
      if (r.status === "Present") prevP++;
      else if (r.status === "Absent") prevA++;
      prevUniqueMarked.add(sid);
    });

    // 6. Process TODAY's Attendance (Separate for the "Today Table")
    const todayClassStats = {};
    const seenToday = new Set();
    todayAtt.forEach((rec) => {
      const sid = rec.student.toString();
      const cid = rec.class.toString();
      const key = `${sid}-${cid}`;
      if (!activeStudentIds.has(sid) || seenToday.has(key)) return;
      seenToday.add(key);
      if (!todayClassStats[cid])
        todayClassStats[cid] = { present: 0, absent: 0 };
      todayClassStats[cid][rec.status.toLowerCase()]++;
    });

    // 7. Calculate KPIs
    const currTotal = currentP + currentA;
    const prevTotal = prevP + prevA;
    const calcRate = (p, t) => (t > 0 ? (p / t) * 100 : 0);

    const currRate = calcRate(currentP, currTotal);
    const prevRate = calcRate(prevP, prevTotal);
    const currAbsentRate = calcRate(currentA, currTotal);
    const prevAbsentRate = calcRate(prevA, prevTotal);
    const currCoverage =
      students.length > 0
        ? (uniqueStudentsMarked.size / students.length) * 100
        : 0;
    const prevCoverage =
      students.length > 0 ? (prevUniqueMarked.size / students.length) * 100 : 0;

    // 8. Build Trend Chart
    const trend = Object.values(dailyStats)
      .sort((a, b) => a.date - b.date)
      .map((d) => {
        const t = d.P + d.A;
        return {
          date: d.date.toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          }),
          percentage: t > 0 ? Math.round((d.P / t) * 100) : 0,
        };
      });

    // Build Sparkline data (last 7 days regardless of range for KPI cards)
    const sparklineDays = Object.values(dailyStats)
      .sort((a, b) => a.date - b.date)
      .slice(-7);
    const sparkTrend = sparklineDays.map((d) => ({
      value: d.P + d.A > 0 ? Math.round((d.P / (d.P + d.A)) * 100) : 0,
    }));
    const sparkAbsent = sparklineDays.map((d) => ({
      value: d.P + d.A > 0 ? Math.round((d.A / (d.P + d.A)) * 100) : 0,
    }));

    // 9. Build TODAY Class-Wise Table (sorted Nursery → 12th)
    const todayClassWise = classes.map((cls) => {
      const cid = cls._id.toString();
      const stats = todayClassStats[cid] || { present: 0, absent: 0 };
      const totalStudents = studentCountMap[cid] || 0;
      const marked = stats.present + stats.absent;
      const percentage =
        marked > 0 ? Math.round((stats.present / marked) * 100) : 0;

      let status = "notMarked";
      if (marked > 0) {
        if (percentage >= 90) status = "excellent";
        else if (percentage >= 75) status = "good";
        else status = "low";
      }

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        label: `${cls.name}-${cls.section}`,
        teacherLabel: cls.teacherLabel || null,
        totalStudents,
        present: stats.present,
        absent: stats.absent,
        percentage,
        isMarked: marked > 0,
        status,
      };
    });

    const sortedTodayClassWise = this._sortClasses(todayClassWise);

    const attentionPending = sortedTodayClassWise.filter(
      (c) => !c.isMarked,
    ).length;
    const attentionLow = sortedTodayClassWise.filter(
      (c) => c.isMarked && c.percentage < 75,
    ).length;

    return {
      meta: { from, to, group, days: daysDiff },
      kpis: {
        attendanceRate: {
          value: currRate.toFixed(1),
          delta: (currRate - prevRate).toFixed(1),
          sparkline: sparkTrend,
        },
        coverage: {
          value: currCoverage.toFixed(1),
          delta: (currCoverage - prevCoverage).toFixed(1),
          sparkline: sparkTrend,
        },
        absentRate: {
          value: currAbsentRate.toFixed(1),
          delta: (currAbsentRate - prevAbsentRate).toFixed(1),
          sparkline: sparkAbsent,
        },
      },
      attention: {
        pending: attentionPending,
        low: attentionLow,
      },
      trend,
      todayClassWise: sortedTodayClassWise,
    };
  }

  _emptyRangeData(from, to, group) {
    const zeroKpi = { value: "0.0", delta: "0.0", sparkline: [] };
    return {
      meta: { from, to, group, days: 0 },
      kpis: { attendanceRate: zeroKpi, coverage: zeroKpi, absentRate: zeroKpi },
      attention: { pending: 0, low: 0 },
      trend: [],
      todayClassWise: [],
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  CLASS DETAIL (For Dialog)
  // ═══════════════════════════════════════════════════════════════
  async getClassDetail({ classId, date }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) throwError("No active session", 400);

    const cls = await Class.findById(classId).lean();
    if (!cls) throwError("Class not found", 404);

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const students = await Student.find({
      class: classId,
      status: "Active",
      isActive: true,
    })
      .select("_id name scholarNumber fatherName")
      .sort({ name: 1 })
      .lean();

    const records = await Attendance.find({
      class: classId,
      date: { $gte: targetDate, $lt: nextDay },
    })
      .select("student status")
      .lean();

    const recordMap = {};
    records.forEach((r) => {
      recordMap[r.student.toString()] = r.status;
    });

    let present = 0,
      absent = 0;
    const studentsWithStatus = students.map((s) => {
      const status = recordMap[s._id.toString()] || "Unmarked";
      if (status === "Present") present++;
      else if (status === "Absent") absent++;
      return {
        _id: s._id,
        name: s.name,
        scholarNumber: s.scholarNumber,
        fatherName: s.fatherName,
        status,
      };
    });

    const total = students.length;
    const marked = present + absent;
    const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

    return {
      _id: cls._id,
      name: cls.name,
      section: cls.section,
      classTeacher: cls.teacherLabel || null,
      total,
      present,
      absent,
      unmarked: total - marked,
      percentage,
      date: targetDate.toISOString(),
      students: studentsWithStatus,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  MONTHLY REPORT (Restored)
  // ═══════════════════════════════════════════════════════════════
  async getMonthlyReport({ year, month }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) throwError("No active session", 400);

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    }).lean();
    if (classes.length === 0) return this._emptyMonthlyReport(year, month);

    const classIds = classes.map((c) => c._id);

    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          class: { $in: classIds },
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { class: "$class", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    const classStatsMap = {};
    attendanceAgg.forEach((a) => {
      const cid = a._id.class.toString();
      if (!classStatsMap[cid]) classStatsMap[cid] = { Present: 0, Absent: 0 };
      classStatsMap[cid][a._id.status] = a.count;
    });

    const studentCounts = await Student.aggregate([
      {
        $match: { class: { $in: classIds }, status: "Active", isActive: true },
      },
      { $group: { _id: "$class", count: { $sum: 1 } } },
    ]);
    const studentCountMap = {};
    studentCounts.forEach((s) => {
      studentCountMap[s._id.toString()] = s.count;
    });

    const holidays = await Holiday.find({
      session: activeSessionId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();
    const workingDays = this._calculateWorkingDays(
      startDate,
      endDate,
      holidays,
    );

    const classReports = classes.map((cls) => {
      const cid = cls._id.toString();
      const stats = classStatsMap[cid] || { Present: 0, Absent: 0 };
      const totalStudents = studentCountMap[cid] || 0;
      const totalMarks = stats.Present + stats.Absent;
      const percentage =
        totalMarks > 0 ? Math.round((stats.Present / totalMarks) * 100) : 0;

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        totalStudents,
        workingDays,
        totalMarks,
        present: stats.Present,
        absent: stats.Absent,
        percentage,
        isEmpty: totalStudents === 0,
        isLowAttendance: totalMarks > 0 && percentage < 80,
        classTeacher: cls.teacherLabel || null,
        sortRank: this._getClassSortRank(cls.name),
      };
    });

    classReports.sort((a, b) => {
      if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
      return (a.section || "").localeCompare(b.section || "");
    });

    const summary = {
      totalClasses: classes.length,
      totalStudents: classReports.reduce((s, c) => s + c.totalStudents, 0),
      totalPresent: classReports.reduce((s, c) => s + c.present, 0),
      totalAbsent: classReports.reduce((s, c) => s + c.absent, 0),
      workingDays,
      holidays: holidays.length,
      emptyClasses: classReports.filter((c) => c.isEmpty).length,
      lowAttendanceClasses: classReports.filter((c) => c.isLowAttendance)
        .length,
      overallPercentage: 0,
    };
    const totalMarked = summary.totalPresent + summary.totalAbsent;
    if (totalMarked > 0)
      summary.overallPercentage = Math.round(
        (summary.totalPresent / totalMarked) * 100,
      );

    return {
      year,
      month,
      monthName: new Date(year, month - 1).toLocaleString("en-IN", {
        month: "long",
      }),
      classes: classReports,
      summary,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  MONTHLY CLASS DETAIL (Restored)
  // ═══════════════════════════════════════════════════════════════
  async getMonthlyClassDetail({ classId, year, month }) {
    if (!classId) throwError("Class ID is required", 400);
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) throwError("No active session", 400);

    const settings = await Settings.getSettings();
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const cls = await Class.findById(classId).lean();
    if (!cls) throwError("Class not found", 404);

    const students = await Student.find({
      class: classId,
      session: activeSessionId,
      status: "Active",
      isActive: true,
    })
      .select("_id name scholarNumber fatherName gender")
      .sort({ name: 1 })
      .lean();

    const holidays = await Holiday.find({
      session: activeSessionId,
      $or: [
        { date: { $gte: startDate, $lte: endDate }, endDate: null },
        { date: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    }).lean();

    const holidayMap = {};
    holidays.forEach((h) => {
      const hStart = new Date(h.date);
      hStart.setHours(0, 0, 0, 0);
      const hEnd = h.endDate ? new Date(h.endDate) : new Date(h.date);
      hEnd.setHours(23, 59, 59, 999);
      const cur = new Date(hStart);
      while (cur <= hEnd) {
        const key = this._dateKey(cur);
        holidayMap[key] = { name: h.name, allowAttendance: h.allowAttendance };
        cur.setDate(cur.getDate() + 1);
      }
    });

    const workingDayNames = new Set(
      (settings?.workingDays || [])
        .filter((d) => d.isWorking)
        .map((d) => d.day),
    );

    const dateArray = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const key = this._dateKey(cur);
      const dayName = cur.toLocaleDateString("en-US", { weekday: "long" });
      const dayShort = cur.toLocaleDateString("en-US", { weekday: "short" });
      const isSunday = dayName === "Sunday";
      const isWorkingDay = workingDayNames.has(dayName);
      const holiday = holidayMap[key];
      const isHoliday = !!holiday && !holiday.allowAttendance;
      const isBlocked = isHoliday || !isWorkingDay;

      dateArray.push({
        day: cur.getDate(),
        dateKey: key,
        dayName,
        dayShort,
        isSunday,
        isHoliday,
        isWorkingDay,
        isBlocked,
        holidayName: holiday?.name || null,
      });
      cur.setDate(cur.getDate() + 1);
    }

    const workingDays = dateArray.filter((d) => !d.isBlocked).length;

    const records = await Attendance.find({
      class: classId,
      date: { $gte: startDate, $lte: endDate },
    })
      .select("student status date")
      .lean();

    const attendanceMap = {};
    records.forEach((r) => {
      const sid = r.student.toString();
      const dateKey = this._dateKey(r.date);
      if (!attendanceMap[sid]) attendanceMap[sid] = {};
      attendanceMap[sid][dateKey] =
        r.status === "Present" ? "P" : r.status === "Absent" ? "A" : "";
    });

    const studentDetails = students.map((s) => {
      const sid = s._id.toString();
      const dailyAttendance = {};
      let present = 0,
        absent = 0;
      dateArray.forEach((d) => {
        if (d.isHoliday) dailyAttendance[d.dateKey] = "H";
        else if (d.isBlocked) dailyAttendance[d.dateKey] = "-";
        else {
          const status = attendanceMap[sid]?.[d.dateKey];
          if (status === "P") {
            dailyAttendance[d.dateKey] = "P";
            present++;
          } else if (status === "A") {
            dailyAttendance[d.dateKey] = "A";
            absent++;
          } else dailyAttendance[d.dateKey] = "";
        }
      });
      const total = present + absent;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        _id: s._id,
        name: s.name,
        scholarNumber: s.scholarNumber,
        fatherName: s.fatherName,
        gender: s.gender,
        present,
        absent,
        total,
        workingDays,
        percentage,
        isLowAttendance: total > 0 && percentage < 75,
        isPerfect: total > 0 && percentage === 100,
        dailyAttendance,
      };
    });

    const totalPresent = studentDetails.reduce((s, st) => s + st.present, 0);
    const totalAbsent = studentDetails.reduce((s, st) => s + st.absent, 0);
    const totalMarked = totalPresent + totalAbsent;

    return {
      class: {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        classTeacher: cls.teacherLabel || null,
      },
      year,
      month,
      monthName: new Date(year, month - 1).toLocaleString("en-IN", {
        month: "long",
      }),
      workingDays,
      dates: dateArray,
      holidays: holidays.length,
      students: studentDetails,
      summary: {
        totalStudents: students.length,
        totalPresent,
        totalAbsent,
        totalMarked,
        workingDays,
        overallPercentage:
          totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0,
        lowAttendanceStudents: studentDetails.filter((s) => s.isLowAttendance)
          .length,
        perfectAttendanceStudents: studentDetails.filter((s) => s.isPerfect)
          .length,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  MONTHLY MATRIX (Restored)
  // ═══════════════════════════════════════════════════════════════
  async getMonthlyMatrix({ year, month }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) return this._emptyMonthlyMatrix(year, month);

    const settings = await Settings.getSettings();
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    })
      .select("_id name section")
      .lean();
    if (classes.length === 0) return this._emptyMonthlyMatrix(year, month);

    const classIds = classes.map((c) => c._id);

    const holidays = await Holiday.find({
      session: activeSessionId,
      $or: [
        { date: { $gte: startDate, $lte: endDate }, endDate: null },
        { date: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    }).lean();

    const holidayMap = {};
    holidays.forEach((h) => {
      const hStart = new Date(h.date);
      hStart.setHours(0, 0, 0, 0);
      const hEnd = h.endDate ? new Date(h.endDate) : new Date(h.date);
      hEnd.setHours(23, 59, 59, 999);
      const cur = new Date(hStart);
      while (cur <= hEnd) {
        const key = this._dateKey(cur);
        holidayMap[key] = { name: h.name, allowAttendance: h.allowAttendance };
        cur.setDate(cur.getDate() + 1);
      }
    });

    const workingDayNames = new Set(
      (settings?.workingDays || [])
        .filter((d) => d.isWorking)
        .map((d) => d.day),
    );

    const dateArray = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const key = this._dateKey(cur);
      const dayName = cur.toLocaleDateString("en-US", { weekday: "long" });
      const dayShort = cur.toLocaleDateString("en-US", { weekday: "short" });
      const isSunday = dayName === "Sunday";
      const isWorkingDay = workingDayNames.has(dayName);
      const holiday = holidayMap[key];
      const isHoliday = !!holiday && !holiday.allowAttendance;
      const isBlocked = isHoliday || !isWorkingDay;

      dateArray.push({
        day: cur.getDate(),
        dateKey: key,
        dayShort,
        isSunday,
        isHoliday,
        isBlocked,
        holidayName: holiday?.name || null,
      });
      cur.setDate(cur.getDate() + 1);
    }

    const activeStudents = await Student.find({
      class: { $in: classIds },
      status: "Active",
      isActive: true,
    })
      .select("_id class")
      .lean();
    const activeStudentIds = new Set(
      activeStudents.map((s) => s._id.toString()),
    );
    const classHasStudents = new Set();
    activeStudents.forEach((s) => {
      classHasStudents.add(s.class.toString());
    });

    const records = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: startDate, $lte: endDate },
    })
      .select("class student status date")
      .lean();

    const matrix = {};
    const seenPerDay = new Set();
    records.forEach((r) => {
      const sid = r.student.toString();
      if (!activeStudentIds.has(sid)) return;
      const cid = r.class.toString();
      const dateKey = this._dateKey(r.date);
      const key = `${cid}-${sid}-${dateKey}`;
      if (seenPerDay.has(key)) return;
      seenPerDay.add(key);
      if (!matrix[cid]) matrix[cid] = {};
      if (!matrix[cid][dateKey])
        matrix[cid][dateKey] = { present: 0, absent: 0 };
      if (r.status === "Present") matrix[cid][dateKey].present++;
      else if (r.status === "Absent") matrix[cid][dateKey].absent++;
    });

    const classRows = classes.map((cls) => {
      const cid = cls._id.toString();
      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        label: `${cls.name}-${cls.section}`,
        sortRank: this._getClassSortRank(cls.name),
        hasStudents: classHasStudents.has(cid),
        daily: matrix[cid] || {},
      };
    });

    classRows.sort((a, b) => {
      if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
      return (a.section || "").localeCompare(b.section || "");
    });

    const grandTotals = {};
    dateArray.forEach((d) => {
      grandTotals[d.dateKey] = { present: 0, absent: 0 };
    });
    classRows.forEach((cls) => {
      dateArray.forEach((d) => {
        const cell = cls.daily[d.dateKey];
        if (cell) {
          grandTotals[d.dateKey].present += cell.present || 0;
          grandTotals[d.dateKey].absent += cell.absent || 0;
        }
      });
    });

    let totalPresent = 0,
      totalAbsent = 0;
    Object.values(grandTotals).forEach((g) => {
      totalPresent += g.present;
      totalAbsent += g.absent;
    });
    const totalMarked = totalPresent + totalAbsent;

    return {
      year,
      month,
      monthName: new Date(year, month - 1).toLocaleString("en-IN", {
        month: "long",
      }),
      dates: dateArray,
      classes: classRows,
      grandTotals,
      summary: {
        totalPresent,
        totalAbsent,
        totalMarked,
        overallPercentage:
          totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0,
        totalClasses: classes.length,
        workingDays: dateArray.filter((d) => !d.isBlocked).length,
        holidays: holidays.length,
      },
    };
  }

  _emptyMonthlyReport(year, month) {
    return {
      year,
      month,
      monthName: new Date(year, month - 1).toLocaleString("en-IN", {
        month: "long",
      }),
      classes: [],
      summary: {
        totalClasses: 0,
        totalStudents: 0,
        totalPresent: 0,
        totalAbsent: 0,
        workingDays: 0,
        holidays: 0,
        emptyClasses: 0,
        lowAttendanceClasses: 0,
        overallPercentage: 0,
      },
    };
  }

  _emptyMonthlyMatrix(year, month) {
    return {
      year,
      month,
      monthName: new Date(year, month - 1).toLocaleString("en-IN", {
        month: "long",
      }),
      dates: [],
      classes: [],
      grandTotals: {},
      summary: {
        totalPresent: 0,
        totalAbsent: 0,
        totalMarked: 0,
        overallPercentage: 0,
        totalClasses: 0,
        workingDays: 0,
        holidays: 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  ADMIN ACCESS URLs
  // ═══════════════════════════════════════════════════════════════
  async createAccessUrl({ label, expiresAt, createdBy }) {
    const secretKey = ManagementAccess.generateSecretKey();
    return await ManagementAccess.create({
      secretKey,
      label: label || "Dashboard",
      expiresAt: expiresAt || null,
      createdBy,
    });
  }

  async listAccessUrls() {
    return ManagementAccess.find()
      .sort("-createdAt")
      .populate("createdBy", "name")
      .lean();
  }

  async revokeAccessUrl(id) {
    return ManagementAccess.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    );
  }

  async deleteAccessUrl(id) {
    return ManagementAccess.findByIdAndDelete(id);
  }
}

module.exports = new ManagementService();
