"use strict";

const mongoose = require("mongoose");
const Attendance = require("../models/Attendance.model");
const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const Holiday = require("../models/Holiday.model");
const Settings = require("../models/Settings.model");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class AnalyticsService {
  /**
   * Get active session ID — helper
   */
  async _getActiveSessionId() {
    const settings = await Settings.getSettings();
    return settings?.activeSession?._id || settings?.activeSession;
  }

  /**
   * Apply teacher filter to class IDs
   */
  async _getAccessibleClassIds(user, sessionId) {
    if (user?.role !== "teacher") return null; // null = all classes

    const Teacher = require("../models/Teacher.model");
    const teacher = await Teacher.findOne({ user: user._id }).lean();
    if (!teacher?.assignedClasses?.length) return [];
    return teacher.assignedClasses;
  }

  /**
   * QUICK STATS — Today, Week, Month, Year overview
   */
  async getQuickStats(user) {
    const sessionId = await this._getActiveSessionId();
    if (!sessionId) return this._emptyQuickStats();

    const classFilter = await this._getAccessibleClassIds(user, sessionId);
    const baseMatch = { session: new mongoose.Types.ObjectId(sessionId) };

    if (classFilter !== null) {
      if (classFilter.length === 0) return this._emptyQuickStats();
      baseMatch.class = { $in: classFilter };
    }

    // Date ranges
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run all 4 aggregations in parallel
    const [todayStats, weekStats, monthStats, yearStats] = await Promise.all([
      this._calcStats(baseMatch, today, tomorrow),
      this._calcStats(baseMatch, weekStart, tomorrow),
      this._calcStats(baseMatch, monthStart, tomorrow),
      this._calcStats(baseMatch, yearStart, tomorrow),
    ]);

    return {
      today: todayStats,
      week: weekStats,
      month: monthStats,
      year: yearStats,
    };
  }

  async _calcStats(baseMatch, from, to) {
    const result = await Attendance.aggregate([
      {
        $match: {
          ...baseMatch,
          date: { $gte: from, $lt: to },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    let present = 0;
    let absent = 0;
    result.forEach((r) => {
      if (r._id === "Present") present = r.count;
      if (r._id === "Absent") absent = r.count;
    });

    const total = present + absent;
    return {
      present,
      absent,
      total,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }

  /**
   * ATTENDANCE TREND — Last N days line chart data
   */
  async getTrend(user, days = 30) {
    const sessionId = await this._getActiveSessionId();
    if (!sessionId) return [];

    const classFilter = await this._getAccessibleClassIds(user, sessionId);
    const baseMatch = { session: new mongoose.Types.ObjectId(sessionId) };

    if (classFilter !== null) {
      if (classFilter.length === 0) return [];
      baseMatch.class = { $in: classFilter };
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const trend = await Attendance.aggregate([
      {
        $match: {
          ...baseMatch,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" },
            },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Build daily map
    const dailyMap = {};
    trend.forEach((t) => {
      const date = t._id.date;
      if (!dailyMap[date]) dailyMap[date] = { Present: 0, Absent: 0 };
      dailyMap[date][t._id.status] = t.count;
    });

    // Build complete array (fill missing dates)
    const data = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateKey = cur.toISOString().slice(0, 10);
      const stats = dailyMap[dateKey] || { Present: 0, Absent: 0 };
      const total = stats.Present + stats.Absent;

      data.push({
        date: dateKey,
        displayDate: cur.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        present: stats.Present,
        absent: stats.Absent,
        total,
        percentage: total > 0 ? Math.round((stats.Present / total) * 100) : 0,
      });
      cur.setDate(cur.getDate() + 1);
    }

    return data;
  }

  /**
   * CLASS COMPARISON — All classes with their attendance %
   */
  async getClassComparison(user) {
    const sessionId = await this._getActiveSessionId();
    if (!sessionId) return [];

    const classFilter = await this._getAccessibleClassIds(user, sessionId);

    // Get classes
    const classQuery = { session: sessionId, isArchived: false };
    if (classFilter !== null) {
      if (classFilter.length === 0) return [];
      classQuery._id = { $in: classFilter };
    }

    const classes = await Class.find(classQuery).lean();
    if (classes.length === 0) return [];

    const classIds = classes.map((c) => c._id);

    // Current month aggregation
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date();
    monthEnd.setHours(23, 59, 59, 999);

    const stats = await Attendance.aggregate([
      {
        $match: {
          class: { $in: classIds },
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      {
        $group: {
          _id: { class: "$class", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get student count per class
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

    const studentMap = {};
    studentCounts.forEach((s) => {
      studentMap[s._id.toString()] = s.count;
    });

    // Build per-class data
    const classStats = {};
    stats.forEach((s) => {
      const cid = s._id.class.toString();
      if (!classStats[cid]) classStats[cid] = { Present: 0, Absent: 0 };
      classStats[cid][s._id.status] = s.count;
    });

    const result = classes.map((c) => {
      const cid = c._id.toString();
      const cs = classStats[cid] || { Present: 0, Absent: 0 };
      const total = cs.Present + cs.Absent;

      return {
        _id: c._id,
        name: `${c.name}-${c.section}`,
        className: c.name,
        section: c.section,
        students: studentMap[cid] || 0,
        present: cs.Present,
        absent: cs.Absent,
        total,
        percentage: total > 0 ? Math.round((cs.Present / total) * 100) : 0,
      };
    });

    return result.sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * DISTRIBUTION — Pie chart data (Present vs Absent)
   */
  async getDistribution(user) {
    const sessionId = await this._getActiveSessionId();
    if (!sessionId) {
      return { present: 0, absent: 0, total: 0 };
    }

    const classFilter = await this._getAccessibleClassIds(user, sessionId);
    const baseMatch = { session: new mongoose.Types.ObjectId(sessionId) };

    if (classFilter !== null) {
      if (classFilter.length === 0) {
        return { present: 0, absent: 0, total: 0 };
      }
      baseMatch.class = { $in: classFilter };
    }

    // Current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date();
    monthEnd.setHours(23, 59, 59, 999);

    const stats = await Attendance.aggregate([
      {
        $match: {
          ...baseMatch,
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    let present = 0;
    let absent = 0;
    stats.forEach((s) => {
      if (s._id === "Present") present = s.count;
      if (s._id === "Absent") absent = s.count;
    });

    return { present, absent, total: present + absent };
  }

  /**
   * TOP DEFAULTERS — Top N students with lowest attendance
   */
  async getTopDefaulters(user, limit = 10) {
    const sessionId = await this._getActiveSessionId();
    if (!sessionId) return [];

    const classFilter = await this._getAccessibleClassIds(user, sessionId);

    const studentFilter = {
      session: sessionId,
      status: "Active",
      isActive: true,
    };

    if (classFilter !== null) {
      if (classFilter.length === 0) return [];
      studentFilter.class = { $in: classFilter };
    }

    const students = await Student.find(studentFilter)
      .populate("class", "name section")
      .lean();

    // Current month attendance for each
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date();
    monthEnd.setHours(23, 59, 59, 999);

    const defaulters = [];

    for (const s of students) {
      const stats = await Attendance.aggregate([
        {
          $match: {
            student: s._id,
            date: { $gte: monthStart, $lte: monthEnd },
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
      if (total === 0) continue; // Skip if no attendance marked

      const percentage = Math.round((present / total) * 100);

      defaulters.push({
        _id: s._id,
        name: s.name,
        scholarNumber: s.scholarNumber,
        rollNumber: s.rollNumber,
        class: s.class,
        mobile: s.mobile,
        present,
        absent,
        total,
        percentage,
      });
    }

    return defaulters
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, limit);
  }

  /**
   * INSIGHTS — Best/worst class, comparisons
   */
  async getInsights(user) {
    const comparison = await this.getClassComparison(user);

    if (comparison.length === 0) {
      return {
        bestClass: null,
        worstClass: null,
        averagePercentage: 0,
        totalClasses: 0,
        comparedToLastMonth: null,
      };
    }

    const withData = comparison.filter((c) => c.total > 0);

    const bestClass = withData.length > 0 ? withData[0] : null;
    const worstClass =
      withData.length > 0 ? withData[withData.length - 1] : null;

    const avgPercentage =
      withData.length > 0
        ? Math.round(
            withData.reduce((sum, c) => sum + c.percentage, 0) /
              withData.length,
          )
        : 0;

    // Compare to last month
    const lastMonthAvg = await this._getLastMonthAverage(user);
    const currentMonthAvg = avgPercentage;
    const trend = currentMonthAvg - lastMonthAvg;

    return {
      bestClass,
      worstClass,
      averagePercentage: avgPercentage,
      totalClasses: comparison.length,
      classesWithData: withData.length,
      comparedToLastMonth: {
        lastMonth: lastMonthAvg,
        currentMonth: currentMonthAvg,
        difference: trend,
        direction: trend > 0 ? "up" : trend < 0 ? "down" : "same",
      },
    };
  }

  async _getLastMonthAverage(user) {
    const sessionId = await this._getActiveSessionId();
    if (!sessionId) return 0;

    const classFilter = await this._getAccessibleClassIds(user, sessionId);
    const baseMatch = { session: new mongoose.Types.ObjectId(sessionId) };

    if (classFilter !== null) {
      if (classFilter.length === 0) return 0;
      baseMatch.class = { $in: classFilter };
    }

    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const stats = await Attendance.aggregate([
      {
        $match: {
          ...baseMatch,
          date: { $gte: lastMonthStart, $lte: lastMonthEnd },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    let present = 0;
    let absent = 0;
    stats.forEach((s) => {
      if (s._id === "Present") present = s.count;
      if (s._id === "Absent") absent = s.count;
    });

    const total = present + absent;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }

  _emptyQuickStats() {
    const empty = { present: 0, absent: 0, total: 0, percentage: 0 };
    return { today: empty, week: empty, month: empty, year: empty };
  }
}

module.exports = new AnalyticsService();
