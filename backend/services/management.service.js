"use strict";

const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const Teacher = require("../models/Teacher.model");
const Attendance = require("../models/Attendance.model");
const Holiday = require("../models/Holiday.model");
const Settings = require("../models/Settings.model");
const AcademicSession = require("../models/AcademicSession.model");
const ManagementAccess = require("../models/ManagementAccess.model");
const { STATUSES_BLOCKING_ATTENDANCE } = require("../constants/studentStatus");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class ManagementService {
  // ═══════════════════════════════════════════════════════════════
  //  HELPER: Get active session
  // ═══════════════════════════════════════════════════════════════
  async _getActiveSessionId() {
    const settings = await Settings.findOne().populate("activeSession").lean();
    if (settings?.activeSession) {
      return settings.activeSession._id || settings.activeSession;
    }
    const session = await AcademicSession.findOne({ isActive: true }).lean();
    return session?._id || null;
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER: Format date range
  // ═══════════════════════════════════════════════════════════════
  _getMonthRange(year, month) {
    const start = new Date(year, month, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER: Get class sort rank (Nursery → LKG → UKG → 1st → 12th)
  // ═══════════════════════════════════════════════════════════════
  _getClassSortRank(className) {
    if (!className) return 999;
    const name = className.toString().trim().toUpperCase();

    if (/^NUR/.test(name) || name === "NURSERY") return 1;
    if (/^L\.?K\.?G/.test(name) || name === "LKG" || name === "LOWER KG")
      return 2;
    if (/^U\.?K\.?G/.test(name) || name === "UKG" || name === "UPPER KG")
      return 3;
    if (/^PRE/.test(name) || name === "PLAYGROUP" || name === "PLAY") return 0;

    const numericMatch = name.match(/^(?:CLASS\s*)?(\d{1,2})(?:ST|ND|RD|TH)?/);
    if (numericMatch) {
      const num = parseInt(numericMatch[1], 10);
      if (num >= 1 && num <= 12) return 10 + num;
    }

    const romanMap = {
      I: 1,
      II: 2,
      III: 3,
      IV: 4,
      V: 5,
      VI: 6,
      VII: 7,
      VIII: 8,
      IX: 9,
      X: 10,
      XI: 11,
      XII: 12,
    };
    const romanMatch = name.match(
      /^(X{0,2}I{0,3}|V?I{0,3}|IX|IV|VIII|VII|VI|III|II|I)$/,
    );
    if (romanMatch && romanMap[romanMatch[1]]) {
      return 10 + romanMap[romanMatch[1]];
    }

    return 999;
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER: Sort array of classes with section as secondary
  // ═══════════════════════════════════════════════════════════════
  _sortClasses(classes) {
    return [...classes].sort((a, b) => {
      const rankA = this._getClassSortRank(a.name);
      const rankB = this._getClassSortRank(b.name);
      if (rankA !== rankB) return rankA - rankB;
      return (a.section || "").localeCompare(b.section || "");
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  NEW: HELPER — Find next working day (skips holidays + Sundays)
  // ═══════════════════════════════════════════════════════════════
  async _findNextWorkingDay(sessionId, fromDate = new Date()) {
    const settings = await Settings.getSettings();
    const workingDaysMap = {};
    (settings?.workingDays || []).forEach((d) => {
      workingDaysMap[d.day] = d.isWorking;
    });

    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
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

    const isDateHoliday = (checkDate) => {
      return holidays.some((h) => {
        const hStart = new Date(h.date);
        hStart.setHours(0, 0, 0, 0);
        const hEnd = h.endDate ? new Date(h.endDate) : hStart;
        hEnd.setHours(23, 59, 59, 999);
        return checkDate >= hStart && checkDate <= hEnd;
      });
    };

    for (let i = 1; i <= 14; i++) {
      const candidate = new Date(fromDate);
      candidate.setDate(candidate.getDate() + i);
      candidate.setHours(0, 0, 0, 0);

      const candidateDayName = candidate.toLocaleDateString("en-US", {
        weekday: "long",
      });

      const isWorking =
        workingDaysMap[candidateDayName] === undefined
          ? true
          : workingDaysMap[candidateDayName];

      if (!isWorking) continue;
      if (isDateHoliday(candidate)) continue;

      return {
        date: candidate.toISOString(),
        dayName: candidateDayName,
        label: candidate.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "short",
        }),
      };
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PAGE 1: TODAY OVERVIEW
  //  ✅ NEW: Handles holidays AND non-working days properly
  // ═══════════════════════════════════════════════════════════════
  async getTodayOverview() {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) return this._emptyTodayData();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ═══════════════════════════════════════════════════════════════
    //  CHECK: Holiday AND Non-working day
    // ═══════════════════════════════════════════════════════════════
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const settings = await Settings.getSettings();
    const workingDay = settings?.workingDays?.find((d) => d.day === dayName);
    const isWorkingDay = !workingDay || workingDay.isWorking;

    const holidayToday = await Holiday.findOne({
      session: activeSessionId,
      $or: [
        { date: { $gte: today, $lte: tomorrow }, endDate: null },
        { date: { $lte: tomorrow }, endDate: { $gte: today } },
      ],
    }).lean();

    const isHoliday = holidayToday && !holidayToday.allowAttendance;
    const isNonWorkingDay = !isWorkingDay && !isHoliday;

    // ✅ If holiday OR non-working day → return early with rich info
    if (isHoliday || isNonWorkingDay) {
      const nextWorkingDay = await this._findNextWorkingDay(
        activeSessionId,
        today,
      );

      return {
        ...this._emptyTodayData(),
        isHoliday,
        isNonWorkingDay,
        isWorkingDay,
        holiday: isHoliday ? holidayToday : null,
        today: {
          date: today.toISOString(),
          dayName,
        },
        nextWorkingDay,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    //  NORMAL WORKING DAY — Full data processing
    // ═══════════════════════════════════════════════════════════════

    // Get all classes
    const classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    })
      .populate("classTeacher", "name")
      .sort({ name: 1, section: 1 })
      .lean();

    if (classes.length === 0) return this._emptyTodayData();

    const classIds = classes.map((c) => c._id);

    // Active students
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

    // Today's attendance
    const todayAttendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: today, $lt: tomorrow },
    }).lean();

    // Aggregate per-class (dedupe)
    const classStatsMap = {};
    const seenToday = new Set();

    todayAttendance.forEach((rec) => {
      const sid = rec.student.toString();
      if (!activeStudentIds.has(sid)) return;

      const key = `${sid}-${rec.class.toString()}`;
      if (seenToday.has(key)) return;
      seenToday.add(key);

      const cid = rec.class.toString();
      if (!classStatsMap[cid]) classStatsMap[cid] = { present: 0, absent: 0 };
      classStatsMap[cid][rec.status.toLowerCase()]++;
    });

    // Build class-wise table
    const classWise = classes.map((cls) => {
      const cid = cls._id.toString();
      const stats = classStatsMap[cid] || { present: 0, absent: 0 };
      const totalInClass = studentCountMap[cid] || 0;
      const present = Math.min(stats.present, totalInClass);
      const absent = Math.min(stats.absent, totalInClass - present);
      const marked = present + absent;
      const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

      // Traffic light
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
        classTeacher: cls.classTeacher?.name || null,
        totalStudents: totalInClass,
        present,
        absent,
        marked,
        percentage,
        isMarked: marked > 0,
        status,
      };
    });

    // Aggregate totals
    const totalStudents = students.length;
    const totalPresent = classWise.reduce((sum, c) => sum + c.present, 0);
    const totalAbsent = classWise.reduce((sum, c) => sum + c.absent, 0);
    const totalMarked = totalPresent + totalAbsent;
    const overallPercentage =
      totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

    const markedClasses = classWise.filter((c) => c.isMarked).length;
    const pendingClasses = classes.length - markedClasses;
    const excellentClasses = classWise.filter(
      (c) => c.status === "excellent",
    ).length;
    const goodClasses = classWise.filter((c) => c.status === "good").length;
    const lowClasses = classWise.filter((c) => c.status === "low").length;

    // Health indicator
    let health = "unknown";
    let healthLabel = "No Data";
    if (totalMarked > 0) {
      if (overallPercentage >= 95) {
        health = "excellent";
        healthLabel = "Excellent";
      } else if (overallPercentage >= 90) {
        health = "veryGood";
        healthLabel = "Very Good";
      } else if (overallPercentage >= 80) {
        health = "good";
        healthLabel = "Good";
      } else if (overallPercentage >= 70) {
        health = "fair";
        healthLabel = "Fair";
      } else {
        health = "poor";
        healthLabel = "Needs Attention";
      }
    }

    return {
      date: today.toISOString(),
      isHoliday: false,
      isNonWorkingDay: false,
      isWorkingDay: true,
      holiday: null,
      today: {
        date: today.toISOString(),
        dayName,
      },
      nextWorkingDay: null,
      stats: {
        totalStudents,
        totalClasses: classes.length,
        totalPresent,
        totalAbsent,
        totalMarked,
        overallPercentage,
        markedClasses,
        pendingClasses,
        excellentClasses,
        goodClasses,
        lowClasses,
      },
      health: {
        level: health,
        label: healthLabel,
        percentage: overallPercentage,
        target: 90,
      },
      distribution: {
        present: totalPresent,
        absent: totalAbsent,
        pending: Math.max(0, totalStudents - totalMarked),
      },
      classWise: this._sortClasses(classWise),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  PAGE 2: MONTHLY TRENDS
  // ═══════════════════════════════════════════════════════════════
  async getMonthlyTrends() {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) return this._emptyMonthlyData();

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

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    })
      .select("_id")
      .lean();

    const classIds = classes.map((c) => c._id);
    if (classIds.length === 0) return this._emptyMonthlyData();

    const activeStudents = await Student.find({
      class: { $in: classIds },
      status: "Active",
      isActive: true,
    })
      .select("_id")
      .lean();

    const activeStudentIds = new Set(
      activeStudents.map((s) => s._id.toString()),
    );

    const attendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: monthStart, $lte: monthEnd },
    })
      .select("student status date")
      .lean();

    const prevAttendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: prevMonthStart, $lte: prevMonthEnd },
    })
      .select("student status")
      .lean();

    const dayStats = {};
    const seenPerDay = new Set();

    attendance.forEach((rec) => {
      const sid = rec.student.toString();
      if (!activeStudentIds.has(sid)) return;

      const dateStr = new Date(rec.date).toDateString();
      const key = `${sid}-${dateStr}`;
      if (seenPerDay.has(key)) return;
      seenPerDay.add(key);

      if (!dayStats[dateStr]) {
        dayStats[dateStr] = {
          present: 0,
          absent: 0,
          date: new Date(rec.date),
        };
      }
      if (rec.status === "Present") dayStats[dateStr].present++;
      else if (rec.status === "Absent") dayStats[dateStr].absent++;
    });

    const trend = Object.values(dayStats)
      .sort((a, b) => a.date - b.date)
      .map((d) => {
        const total = d.present + d.absent;
        return {
          date: d.date.toISOString().split("T")[0],
          label: d.date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),
          present: d.present,
          absent: d.absent,
          percentage: total > 0 ? Math.round((d.present / total) * 100) : 0,
        };
      });

    const workingDays = trend.length;
    const monthTotal = trend.reduce(
      (acc, d) => {
        acc.present += d.present;
        acc.absent += d.absent;
        return acc;
      },
      { present: 0, absent: 0 },
    );
    const monthMarked = monthTotal.present + monthTotal.absent;
    const monthAvg =
      monthMarked > 0
        ? Math.round((monthTotal.present / monthMarked) * 100)
        : 0;

    const prevSeenPerDay = new Set();
    const prevStats = { present: 0, absent: 0 };
    prevAttendance.forEach((rec) => {
      const sid = rec.student.toString();
      if (!activeStudentIds.has(sid)) return;
      const key = `${sid}-${new Date().toDateString()}`;
      if (prevSeenPerDay.has(key)) return;
      prevSeenPerDay.add(key);
      if (rec.status === "Present") prevStats.present++;
      else if (rec.status === "Absent") prevStats.absent++;
    });
    const prevMarked = prevStats.present + prevStats.absent;
    const prevAvg =
      prevMarked > 0 ? Math.round((prevStats.present / prevMarked) * 100) : 0;
    const vsLastMonth = monthAvg - prevAvg;

    const bestDay = trend.reduce(
      (best, d) => (d.percentage > (best?.percentage || 0) ? d : best),
      null,
    );
    const worstDay = trend.reduce(
      (worst, d) =>
        d.percentage < (worst?.percentage ?? 101) && d.percentage > 0
          ? d
          : worst,
      null,
    );

    const dowStats = {
      Mon: { total: 0, present: 0 },
      Tue: { total: 0, present: 0 },
      Wed: { total: 0, present: 0 },
      Thu: { total: 0, present: 0 },
      Fri: { total: 0, present: 0 },
      Sat: { total: 0, present: 0 },
      Sun: { total: 0, present: 0 },
    };
    const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    trend.forEach((d) => {
      const dow = dowNames[new Date(d.date).getDay()];
      dowStats[dow].total += d.present + d.absent;
      dowStats[dow].present += d.present;
    });

    const dayOfWeek = Object.entries(dowStats).map(([day, s]) => ({
      day,
      percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
      hasData: s.total > 0,
    }));

    const weekStats = { W1: [], W2: [], W3: [], W4: [], W5: [] };
    trend.forEach((d) => {
      const week = Math.min(5, Math.ceil(new Date(d.date).getDate() / 7));
      weekStats[`W${week}`].push(d.percentage);
    });
    const weeks = Object.entries(weekStats)
      .filter(([, arr]) => arr.length > 0)
      .map(([label, arr]) => ({
        label: `Week ${label.slice(1)}`,
        percentage: Math.round(arr.reduce((sum, p) => sum + p, 0) / arr.length),
      }));

    const percentages = trend.map((d) => d.percentage);
    const mean = percentages.length
      ? percentages.reduce((s, p) => s + p, 0) / percentages.length
      : 0;
    const variance = percentages.length
      ? percentages.reduce((s, p) => s + Math.pow(p - mean, 2), 0) /
        percentages.length
      : 0;
    const stdDev = Math.round(Math.sqrt(variance));

    return {
      month: now.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
      stats: {
        workingDays,
        monthAvg,
        vsLastMonth,
        bestDayPct: bestDay?.percentage || 0,
        prevAvg,
      },
      trend,
      weeks,
      dayOfWeek,
      insights: {
        bestDay: bestDay
          ? {
              date: bestDay.date,
              label: bestDay.label,
              percentage: bestDay.percentage,
            }
          : null,
        worstDay: worstDay
          ? {
              date: worstDay.date,
              label: worstDay.label,
              percentage: worstDay.percentage,
            }
          : null,
        bestDow:
          dayOfWeek
            .filter((d) => d.hasData)
            .sort((a, b) => b.percentage - a.percentage)[0] || null,
        worstDow:
          dayOfWeek
            .filter((d) => d.hasData)
            .sort((a, b) => a.percentage - b.percentage)[0] || null,
        variance: stdDev,
        consistency: stdDev < 5 ? "High" : stdDev < 10 ? "Medium" : "Low",
        trending: vsLastMonth > 1 ? "up" : vsLastMonth < -1 ? "down" : "stable",
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  PAGE 3: YEARLY PERFORMANCE
  // ═══════════════════════════════════════════════════════════════
  async getYearlyPerformance() {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) return this._emptyYearlyData();

    const session = await AcademicSession.findById(activeSessionId).lean();
    if (!session) return this._emptyYearlyData();

    const now = new Date();
    const sessionStart = new Date(session.startDate);
    const sessionEnd = new Date(session.endDate || now);

    const classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    })
      .select("_id")
      .lean();

    const classIds = classes.map((c) => c._id);
    if (classIds.length === 0) return this._emptyYearlyData();

    const activeStudents = await Student.find({
      class: { $in: classIds },
      status: "Active",
      isActive: true,
    })
      .select("_id")
      .lean();

    const activeStudentIds = new Set(
      activeStudents.map((s) => s._id.toString()),
    );

    const attendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: sessionStart, $lte: sessionEnd },
    })
      .select("student status date")
      .lean();

    const monthlyStats = {};
    const seenPerDay = new Set();

    attendance.forEach((rec) => {
      const sid = rec.student.toString();
      if (!activeStudentIds.has(sid)) return;

      const d = new Date(rec.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const dedupeKey = `${sid}-${d.toDateString()}`;

      if (seenPerDay.has(dedupeKey)) return;
      seenPerDay.add(dedupeKey);

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          present: 0,
          absent: 0,
          days: new Set(),
          date: new Date(d.getFullYear(), d.getMonth(), 1),
        };
      }
      monthlyStats[monthKey].days.add(d.toDateString());
      if (rec.status === "Present") monthlyStats[monthKey].present++;
      else if (rec.status === "Absent") monthlyStats[monthKey].absent++;
    });

    const months = Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, s]) => {
        const total = s.present + s.absent;
        return {
          key,
          label: s.date.toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric",
          }),
          shortLabel: s.date.toLocaleDateString("en-IN", { month: "short" }),
          workingDays: s.days.size,
          present: s.present,
          absent: s.absent,
          percentage: total > 0 ? Math.round((s.present / total) * 100) : 0,
        };
      });

    const totalPresent = months.reduce((s, m) => s + m.present, 0);
    const totalAbsent = months.reduce((s, m) => s + m.absent, 0);
    const totalMarked = totalPresent + totalAbsent;
    const yearAvg =
      totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;
    const totalWorkingDays = months.reduce((s, m) => s + m.workingDays, 0);

    const bestMonth = months.reduce(
      (best, m) => (m.percentage > (best?.percentage || 0) ? m : best),
      null,
    );
    const worstMonth = months.reduce(
      (worst, m) =>
        m.percentage < (worst?.percentage ?? 101) && m.percentage > 0
          ? m
          : worst,
      null,
    );

    const quarters = {
      Q1: { label: "Q1 (Apr-Jun)", present: 0, absent: 0, months: [] },
      Q2: { label: "Q2 (Jul-Sep)", present: 0, absent: 0, months: [] },
      Q3: { label: "Q3 (Oct-Dec)", present: 0, absent: 0, months: [] },
      Q4: { label: "Q4 (Jan-Mar)", present: 0, absent: 0, months: [] },
    };

    months.forEach((m) => {
      const monthNum = parseInt(m.key.split("-")[1], 10);
      let q;
      if ([4, 5, 6].includes(monthNum)) q = "Q1";
      else if ([7, 8, 9].includes(monthNum)) q = "Q2";
      else if ([10, 11, 12].includes(monthNum)) q = "Q3";
      else q = "Q4";
      quarters[q].present += m.present;
      quarters[q].absent += m.absent;
      quarters[q].months.push(m.shortLabel);
    });

    const quarterly = Object.values(quarters).map((q) => {
      const total = q.present + q.absent;
      return {
        label: q.label,
        months: q.months.join(", "),
        percentage: total > 0 ? Math.round((q.present / total) * 100) : 0,
        hasData: total > 0,
      };
    });

    return {
      session: session.name,
      stats: {
        totalWorkingDays,
        yearAvg,
        totalMonths: months.length,
        vsLastYear: 0,
      },
      months,
      quarterly,
      insights: {
        bestMonth,
        worstMonth,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  PAGE 4: ALERTS
  // ═══════════════════════════════════════════════════════════════
  async getAlerts() {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) return this._emptyAlertsData();

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    })
      .sort({ name: 1, section: 1 })
      .lean();

    if (classes.length === 0) return this._emptyAlertsData();

    const classIds = classes.map((c) => c._id);

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

    const monthAttendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: monthStart, $lte: now },
    })
      .select("student class status date")
      .lean();

    const classMonthStats = {};
    const seenClassStudentDay = new Set();

    monthAttendance.forEach((rec) => {
      const sid = rec.student.toString();
      if (!activeStudentIds.has(sid)) return;

      const cid = rec.class.toString();
      const dateStr = new Date(rec.date).toDateString();
      const key = `${cid}-${sid}-${dateStr}`;
      if (seenClassStudentDay.has(key)) return;
      seenClassStudentDay.add(key);

      if (!classMonthStats[cid])
        classMonthStats[cid] = { present: 0, absent: 0 };
      if (rec.status === "Present") classMonthStats[cid].present++;
      else if (rec.status === "Absent") classMonthStats[cid].absent++;
    });

    const criticalClasses = [];
    const lowClasses = [];

    classes.forEach((cls) => {
      const cid = cls._id.toString();
      const stats = classMonthStats[cid] || { present: 0, absent: 0 };
      const total = stats.present + stats.absent;
      if (total === 0) return;

      const percentage = Math.round((stats.present / total) * 100);
      const classInfo = {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        label: `${cls.name}-${cls.section}`,
        totalStudents: studentCountMap[cid] || 0,
        percentage,
      };

      if (percentage < 60) criticalClasses.push(classInfo);
      else if (percentage < 75) lowClasses.push(classInfo);
    });

    criticalClasses.sort((a, b) => a.percentage - b.percentage);
    lowClasses.sort((a, b) => a.percentage - b.percentage);

    const studentAttendance = {};
    monthAttendance.forEach((rec) => {
      const sid = rec.student.toString();
      if (!activeStudentIds.has(sid)) return;

      const dateStr = new Date(rec.date).toDateString();
      if (!studentAttendance[sid]) {
        studentAttendance[sid] = {
          present: 0,
          absent: 0,
          class: rec.class.toString(),
          seen: new Set(),
        };
      }
      if (studentAttendance[sid].seen.has(dateStr)) return;
      studentAttendance[sid].seen.add(dateStr);

      if (rec.status === "Present") studentAttendance[sid].present++;
      else if (rec.status === "Absent") studentAttendance[sid].absent++;
    });

    const chronicPerClass = {};
    let totalChronic = 0;
    Object.entries(studentAttendance).forEach(([sid, stats]) => {
      const total = stats.present + stats.absent;
      if (total < 5) return;
      const pct = Math.round((stats.present / total) * 100);
      if (pct < 75) {
        const cid = stats.class;
        chronicPerClass[cid] = (chronicPerClass[cid] || 0) + 1;
        totalChronic++;
      }
    });

    const chronicClasses = classes
      .map((cls) => {
        const cid = cls._id.toString();
        const chronicCount = chronicPerClass[cid] || 0;
        const totalInClass = studentCountMap[cid] || 0;
        const pct =
          totalInClass > 0
            ? Math.round((chronicCount / totalInClass) * 100)
            : 0;
        return {
          _id: cls._id,
          name: cls.name,
          section: cls.section,
          label: `${cls.name}-${cls.section}`,
          chronicCount,
          totalStudents: totalInClass,
          percentage: pct,
        };
      })
      .filter((c) => c.percentage >= 20 && c.chronicCount > 0)
      .sort((a, b) => b.percentage - a.percentage);

    const todayAttendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: today, $lt: tomorrow },
    }).distinct("class");

    const markedClassIds = new Set(todayAttendance.map((id) => id.toString()));
    const pendingClasses = this._sortClasses(
      classes
        .filter((c) => !markedClassIds.has(c._id.toString()))
        .map((c) => ({
          _id: c._id,
          name: c.name,
          section: c.section,
          label: `${c.name}-${c.section}`,
        })),
    );

    return {
      counts: {
        criticalClasses: criticalClasses.length,
        lowClasses: lowClasses.length,
        chronicStudents: totalChronic,
        pendingClasses: pendingClasses.length,
      },
      criticalClasses,
      lowClasses,
      chronicClasses,
      pendingClasses,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  PAGE 5: RANKINGS
  // ═══════════════════════════════════════════════════════════════
  async getRankings({ period = "month" } = {}) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) return { period, rankings: [] };

    const now = new Date();
    let start, end;

    if (period === "today") {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else if (period === "year") {
      const session = await AcademicSession.findById(activeSessionId).lean();
      start = new Date(session?.startDate || now);
      end = new Date(session?.endDate || now);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    })
      .sort({ name: 1, section: 1 })
      .lean();

    if (classes.length === 0) return { period, rankings: [] };

    const classIds = classes.map((c) => c._id);

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

    const attendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: start, $lte: end },
    })
      .select("student class status date")
      .lean();

    const classDailyData = {};
    const seenPerDay = new Set();

    attendance.forEach((rec) => {
      const sid = rec.student.toString();
      if (!activeStudentIds.has(sid)) return;

      const cid = rec.class.toString();
      const dateStr = new Date(rec.date).toDateString();
      const key = `${cid}-${sid}-${dateStr}`;
      if (seenPerDay.has(key)) return;
      seenPerDay.add(key);

      if (!classDailyData[cid]) classDailyData[cid] = {};
      if (!classDailyData[cid][dateStr])
        classDailyData[cid][dateStr] = { present: 0, absent: 0 };

      if (rec.status === "Present") classDailyData[cid][dateStr].present++;
      else if (rec.status === "Absent") classDailyData[cid][dateStr].absent++;
    });

    const rankings = classes.map((cls) => {
      const cid = cls._id.toString();
      const daily = classDailyData[cid] || {};
      const totalInClass = studentCountMap[cid] || 0;

      let totalPresent = 0;
      let totalAbsent = 0;
      const dailyPercentages = [];

      Object.values(daily).forEach((d) => {
        totalPresent += d.present;
        totalAbsent += d.absent;
        const total = d.present + d.absent;
        if (total > 0) {
          dailyPercentages.push(Math.round((d.present / total) * 100));
        }
      });

      const totalMarked = totalPresent + totalAbsent;
      const percentage =
        totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

      let consistency = 0;
      if (dailyPercentages.length > 1) {
        const mean =
          dailyPercentages.reduce((s, p) => s + p, 0) / dailyPercentages.length;
        const variance =
          dailyPercentages.reduce((s, p) => s + Math.pow(p - mean, 2), 0) /
          dailyPercentages.length;
        consistency = Math.round(Math.sqrt(variance));
      }

      let trend = "stable";
      if (dailyPercentages.length >= 4) {
        const mid = Math.floor(dailyPercentages.length / 2);
        const firstHalf = dailyPercentages.slice(0, mid);
        const secondHalf = dailyPercentages.slice(mid);
        const firstAvg =
          firstHalf.reduce((s, p) => s + p, 0) / firstHalf.length;
        const secondAvg =
          secondHalf.reduce((s, p) => s + p, 0) / secondHalf.length;
        const diff = secondAvg - firstAvg;
        if (diff > 2) trend = "up";
        else if (diff < -2) trend = "down";
      }

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        label: `${cls.name}-${cls.section}`,
        totalStudents: totalInClass,
        percentage,
        consistency,
        consistencyLabel:
          consistency < 5 ? "High" : consistency < 10 ? "Medium" : "Low",
        trend,
        hasData: totalMarked > 0,
      };
    });

    const sortedByPercentage = [...rankings]
      .filter((r) => r.hasData)
      .sort((a, b) => b.percentage - a.percentage);

    const sortedByConsistency = [...rankings]
      .filter((r) => r.hasData && r.consistency > 0)
      .sort((a, b) => a.consistency - b.consistency)
      .slice(0, 5);

    return {
      period,
      periodLabel:
        period === "today"
          ? "Today"
          : period === "year"
            ? "This Year"
            : "This Month",
      byPercentage: sortedByPercentage.map((r, i) => ({ ...r, rank: i + 1 })),
      byConsistency: sortedByConsistency,
    };
  }
  // ═══════════════════════════════════════════════════════════════
  //  CLASS DETAIL — For management dialog (no mobile numbers)
  // ═══════════════════════════════════════════════════════════════
  async getClassDetail({ classId, date }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) throwError("No active session", 400);

    const cls = await Class.findById(classId)
      .populate("classTeacher", "name")
      .lean();
    if (!cls) throwError("Class not found", 404);

    // Parse date
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get active students (NO mobile field selected)
    const students = await Student.find({
      class: classId,
      status: "Active",
      isActive: true,
    })
      .select("_id name rollNumber scholarNumber fatherName")
      .sort({ name: 1 })
      .lean();

    // Get attendance records for this date
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

    // Build student list with status
    let present = 0;
    let absent = 0;
    const studentsWithStatus = students.map((s) => {
      const status = recordMap[s._id.toString()] || "Unmarked";
      if (status === "Present") present++;
      else if (status === "Absent") absent++;
      return {
        _id: s._id,
        name: s.name,
        rollNumber: s.rollNumber,
        scholarNumber: s.scholarNumber,
        fatherName: s.fatherName,
        status,
      };
    });

    const total = students.length;
    const marked = present + absent;
    const unmarked = total - marked;
    const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

    return {
      _id: cls._id,
      name: cls.name,
      section: cls.section,
      classTeacher: cls.classTeacher?.name || null,
      total,
      present,
      absent,
      unmarked,
      percentage,
      date: targetDate.toISOString(),
      students: studentsWithStatus,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  MONTHLY REPORT — Class-wise monthly summary
  // ═══════════════════════════════════════════════════════════════
  async getMonthlyReport({ year, month }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) throwError("No active session", 400);

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all classes
    const classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    })
      .populate("classTeacher", "name")
      .lean();

    if (classes.length === 0) return this._emptyMonthlyReport(year, month);

    const classIds = classes.map((c) => c._id);

    // Aggregate attendance per class
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

    // Get active student counts per class
    const studentCounts = await Student.aggregate([
      {
        $match: {
          class: { $in: classIds },
          status: "Active",
          isActive: true,
        },
      },
      { $group: { _id: "$class", count: { $sum: 1 } } },
    ]);

    const studentCountMap = {};
    studentCounts.forEach((s) => {
      studentCountMap[s._id.toString()] = s.count;
    });

    // Get holidays
    const holidays = await Holiday.find({
      session: activeSessionId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Calculate working days
    const workingDays = this._calculateWorkingDays(
      startDate,
      endDate,
      holidays,
    );

    // Sort helper
    const getClassRank = (name) => this._getClassSortRank(name);

    // Build class reports
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
        classTeacher: cls.classTeacher?.name || null,
        sortRank: getClassRank(cls.name),
      };
    });

    // Sort by class rank
    classReports.sort((a, b) => {
      if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
      return (a.section || "").localeCompare(b.section || "");
    });

    // Summary
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
    if (totalMarked > 0) {
      summary.overallPercentage = Math.round(
        (summary.totalPresent / totalMarked) * 100,
      );
    }

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
  //  MONTHLY CLASS DETAIL — Calendar view for one class
  // ═══════════════════════════════════════════════════════════════
  async getMonthlyClassDetail({ classId, year, month }) {
    if (!classId) throwError("Class ID is required", 400);

    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) throwError("No active session", 400);

    const settings = await Settings.getSettings();

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const cls = await Class.findById(classId)
      .populate("classTeacher", "name")
      .lean();
    if (!cls) throwError("Class not found", 404);

    // Get active students (no mobile field — privacy)
    const students = await Student.find({
      class: classId,
      session: activeSessionId,
      status: "Active",
      isActive: true,
    })
      .select("_id name rollNumber scholarNumber fatherName gender")
      .sort({ rollNumber: 1, name: 1 })
      .lean();

    // Get holidays
    const holidays = await Holiday.find({
      session: activeSessionId,
      $or: [
        { date: { $gte: startDate, $lte: endDate }, endDate: null },
        { date: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    }).lean();

    // Holiday map
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

    // Working days config
    const workingDayNames = new Set(
      (settings?.workingDays || [])
        .filter((d) => d.isWorking)
        .map((d) => d.day),
    );

    // Build date array
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

    // Attendance records
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

    // Build student rows
    const studentDetails = students.map((s) => {
      const sid = s._id.toString();
      const dailyAttendance = {};
      let present = 0;
      let absent = 0;

      dateArray.forEach((d) => {
        if (d.isHoliday) {
          dailyAttendance[d.dateKey] = "H";
        } else if (d.isBlocked) {
          dailyAttendance[d.dateKey] = "-";
        } else {
          const status = attendanceMap[sid]?.[d.dateKey];
          if (status === "P") {
            dailyAttendance[d.dateKey] = "P";
            present++;
          } else if (status === "A") {
            dailyAttendance[d.dateKey] = "A";
            absent++;
          } else {
            dailyAttendance[d.dateKey] = "";
          }
        }
      });

      const total = present + absent;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        _id: s._id,
        name: s.name,
        rollNumber: s.rollNumber,
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
        classTeacher: cls.classTeacher?.name || null,
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
  //  HELPER: Empty monthly report
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  //  MONTHLY MATRIX — Class × Date grid (Present/Absent per day)
  //  For management monthly page tabular view
  // ═══════════════════════════════════════════════════════════════
  async getMonthlyMatrix({ year, month }) {
    const activeSessionId = await this._getActiveSessionId();
    if (!activeSessionId) return this._emptyMonthlyMatrix(year, month);

    const settings = await Settings.getSettings();

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // ─── Get all classes ───
    const classes = await Class.find({
      session: activeSessionId,
      isArchived: false,
    })
      .select("_id name section")
      .lean();

    if (classes.length === 0) return this._emptyMonthlyMatrix(year, month);

    const classIds = classes.map((c) => c._id);

    // ─── Get holidays ───
    const holidays = await Holiday.find({
      session: activeSessionId,
      $or: [
        { date: { $gte: startDate, $lte: endDate }, endDate: null },
        { date: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    }).lean();

    // Holiday map (date → holiday info)
    const holidayMap = {};
    holidays.forEach((h) => {
      const hStart = new Date(h.date);
      hStart.setHours(0, 0, 0, 0);
      const hEnd = h.endDate ? new Date(h.endDate) : new Date(h.date);
      hEnd.setHours(23, 59, 59, 999);
      const cur = new Date(hStart);
      while (cur <= hEnd) {
        const key = this._dateKey(cur);
        holidayMap[key] = {
          name: h.name,
          allowAttendance: h.allowAttendance,
        };
        cur.setDate(cur.getDate() + 1);
      }
    });

    // Working days config
    const workingDayNames = new Set(
      (settings?.workingDays || [])
        .filter((d) => d.isWorking)
        .map((d) => d.day),
    );

    // ─── Build date array with metadata ───
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

    // ─── Get active students per class ───
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

    // ─── Get all attendance records for month ───
    const records = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: startDate, $lte: endDate },
    })
      .select("class student status date")
      .lean();

    // Build matrix: { classId: { dateKey: { present, absent } } }
    const matrix = {};
    const seenPerDay = new Set();

    records.forEach((r) => {
      const sid = r.student.toString();
      if (!activeStudentIds.has(sid)) return;

      const cid = r.class.toString();
      const dateKey = this._dateKey(r.date);

      // Dedupe: one student can only count once per day per class
      const key = `${cid}-${sid}-${dateKey}`;
      if (seenPerDay.has(key)) return;
      seenPerDay.add(key);

      if (!matrix[cid]) matrix[cid] = {};
      if (!matrix[cid][dateKey]) {
        matrix[cid][dateKey] = { present: 0, absent: 0 };
      }

      if (r.status === "Present") matrix[cid][dateKey].present++;
      else if (r.status === "Absent") matrix[cid][dateKey].absent++;
    });

    // ─── Build class rows (sorted) ───
    const classRows = classes.map((cls) => {
      const cid = cls._id.toString();
      const daily = matrix[cid] || {};
      const hasStudents = classHasStudents.has(cid);

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        label: `${cls.name}-${cls.section}`,
        sortRank: this._getClassSortRank(cls.name),
        hasStudents,
        daily, // { dateKey: { present, absent } }
      };
    });

    // Sort classes: Nursery → LKG → UKG → 1st → ... → 12th
    classRows.sort((a, b) => {
      if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
      return (a.section || "").localeCompare(b.section || "");
    });

    // ─── Grand totals per date ───
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

    // ─── Overall percentage ───
    let totalPresent = 0;
    let totalAbsent = 0;
    Object.values(grandTotals).forEach((g) => {
      totalPresent += g.present;
      totalAbsent += g.absent;
    });
    const totalMarked = totalPresent + totalAbsent;
    const overallPercentage =
      totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

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
        overallPercentage,
        totalClasses: classes.length,
        workingDays: dateArray.filter((d) => !d.isBlocked).length,
        holidays: holidays.length,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER: Empty monthly matrix
  // ═══════════════════════════════════════════════════════════════
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
  //  HELPER: Format date as YYYY-MM-DD
  // ═══════════════════════════════════════════════════════════════
  _dateKey(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER: Calculate working days
  // ═══════════════════════════════════════════════════════════════
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
  //  EMPTY DATA HELPERS
  // ═══════════════════════════════════════════════════════════════
  _emptyTodayData() {
    return {
      date: new Date().toISOString(),
      isHoliday: false,
      isNonWorkingDay: false,
      isWorkingDay: true,
      holiday: null,
      today: null,
      nextWorkingDay: null,
      stats: {
        totalStudents: 0,
        totalClasses: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalMarked: 0,
        overallPercentage: 0,
        markedClasses: 0,
        pendingClasses: 0,
        excellentClasses: 0,
        goodClasses: 0,
        lowClasses: 0,
      },
      health: {
        level: "unknown",
        label: "No Data",
        percentage: 0,
        target: 90,
      },
      distribution: { present: 0, absent: 0, pending: 0 },
      classWise: [],
    };
  }

  _emptyMonthlyData() {
    return {
      month: "",
      stats: {
        workingDays: 0,
        monthAvg: 0,
        vsLastMonth: 0,
        bestDayPct: 0,
        prevAvg: 0,
      },
      trend: [],
      weeks: [],
      dayOfWeek: [],
      insights: {},
    };
  }

  _emptyYearlyData() {
    return {
      session: "",
      stats: {
        totalWorkingDays: 0,
        yearAvg: 0,
        totalMonths: 0,
        vsLastYear: 0,
      },
      months: [],
      quarterly: [],
      insights: {},
    };
  }

  _emptyAlertsData() {
    return {
      counts: {
        criticalClasses: 0,
        lowClasses: 0,
        chronicStudents: 0,
        pendingClasses: 0,
      },
      criticalClasses: [],
      lowClasses: [],
      chronicClasses: [],
      pendingClasses: [],
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  ADMIN: Manage access URLs
  // ═══════════════════════════════════════════════════════════════
  async createAccessUrl({ label, expiresAt, createdBy }) {
    const secretKey = ManagementAccess.generateSecretKey();
    const access = await ManagementAccess.create({
      secretKey,
      label: label || "Management Dashboard",
      expiresAt: expiresAt || null,
      createdBy,
    });
    return access;
  }

  async listAccessUrls() {
    return ManagementAccess.find()
      .sort("-createdAt")
      .populate("createdBy", "name email")
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
