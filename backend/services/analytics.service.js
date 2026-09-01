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
   * Apply class-role filter to class IDs
   * - admin → null (no filter = all classes)
   * - class → [linkedClass] only
   * - class with no link → []
   */
  async _getAccessibleClassIds(user, sessionId) {
    if (!user || user.role !== "class") return null;

    if (!user.linkedClass) return [];
    return [user.linkedClass];
  }

  // Helper to generate strict, timezone-locked date boundary ranges
  _getISTBounds(dateObj) {
    const tzOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(dateObj.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const d = String(istTime.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);
    return { start, end };
  }

  /**
   * QUICK STATS — Today, Week, Month, Year overview (Timezone Locked)
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

    // Timezone-locked bounds calculations
    const tzOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istTime = new Date(now.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const d = String(istTime.getUTCDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(`${y}-${m}-01T00:00:00.000Z`);
    const yearStart = new Date(`${y}-01-01T00:00:00.000Z`);

    const [todayStats, weekStats, monthStats, yearStats] = await Promise.all([
      this._calcStats(baseMatch, todayStart, tomorrowStart),
      this._calcStats(baseMatch, weekStart, tomorrowStart),
      this._calcStats(baseMatch, monthStart, tomorrowStart),
      this._calcStats(baseMatch, yearStart, tomorrowStart),
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
   * ATTENDANCE TREND — Last N days line chart data (Timezone Locked)
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

    const tzOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istTime = new Date(now.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const d = String(istTime.getUTCDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    const endDate = new Date(`${todayStr}T23:59:59.999Z`);
    const startDate = new Date(
      new Date(`${todayStr}T00:00:00.000Z`).getTime() -
        days * 24 * 60 * 60 * 1000,
    );

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

    const dailyMap = {};
    trend.forEach((t) => {
      const date = t._id.date;
      if (!dailyMap[date]) dailyMap[date] = { Present: 0, Absent: 0 };
      dailyMap[date][t._id.status] = t.count;
    });

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
   * CLASS COMPARISON — All classes with their attendance % (Timezone Locked)
   */
  async getClassComparison(user) {
    const sessionId = await this._getActiveSessionId();
    if (!sessionId) return [];

    const classFilter = await this._getAccessibleClassIds(user, sessionId);

    const classQuery = { session: sessionId, isArchived: false };
    if (classFilter !== null) {
      if (classFilter.length === 0) return [];
      classQuery._id = { $in: classFilter };
    }

    // ✅ NO populate — teacherLabel is a plain string
    const classes = await Class.find(classQuery).lean();
    if (classes.length === 0) return [];

    const classIds = classes.map((c) => c._id);

    const tzOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istTime = new Date(now.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const d = String(istTime.getUTCDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    const monthStart = new Date(`${y}-${m}-01T00:00:00.000Z`);
    const monthEnd = new Date(`${todayStr}T23:59:59.999Z`);

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
        teacherLabel: c.teacherLabel || null,
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
   * DISTRIBUTION — Pie chart data (Timezone Locked)
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

    const tzOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istTime = new Date(now.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const d = String(istTime.getUTCDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    const monthStart = new Date(`${y}-${m}-01T00:00:00.000Z`);
    const monthEnd = new Date(`${todayStr}T23:59:59.999Z`);

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
   * TOP DEFAULTERS — Lowest attendance (Timezone Locked)
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

    const tzOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istTime = new Date(now.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const d = String(istTime.getUTCDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    const monthStart = new Date(`${y}-${m}-01T00:00:00.000Z`);
    const monthEnd = new Date(`${todayStr}T23:59:59.999Z`);

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
      if (total === 0) continue;

      const percentage = Math.round((present / total) * 100);

      defaulters.push({
        _id: s._id,
        name: s.name,
        scholarNumber: s.scholarNumber,
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

    const tzOffset = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istTime = new Date(now.getTime() + tzOffset);
    const y = istTime.getUTCFullYear();
    const m = istTime.getUTCMonth();

    const lastMonthStart = new Date(
      Date.UTC(y, m - 1, 1, 0, 0, 0, 0) - tzOffset,
    );
    const lastMonthEnd = new Date(
      Date.UTC(y, m, 0, 23, 59, 59, 999) - tzOffset,
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
