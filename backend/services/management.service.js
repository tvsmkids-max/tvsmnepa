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
