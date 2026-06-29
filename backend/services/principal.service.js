"use strict";

const Class = require("../models/Class.model");
const Student = require("../models/Student.model");
const Attendance = require("../models/Attendance.model");
const Holiday = require("../models/Holiday.model");
const Settings = require("../models/Settings.model");
const logger = require("../utils/logger");

class PrincipalService {
  /**
   * Get principal dashboard data
   * - School overview stats
   * - Class-wise attendance table
   * - Upcoming holidays
   */
  async getDashboard() {
    const settings = await Settings.findOne().populate("activeSession").lean();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;

    if (!sessionId) {
      return {
        stats: this._emptyStats(),
        classWise: [],
        holidays: [],
        session: null,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ─── Check holiday ───
    const holidayToday = await Holiday.findOne({
      session: sessionId,
      $or: [
        { date: { $gte: today, $lte: tomorrow }, endDate: null },
        { date: { $lte: tomorrow }, endDate: { $gte: today } },
      ],
    }).lean();

    // ─── Get all classes ───
    const classes = await Class.find({
      session: sessionId,
      isArchived: false,
    })
      .populate("classTeacher", "name")
      .sort({ name: 1, section: 1 })
      .lean();

    if (classes.length === 0) {
      return {
        stats: this._emptyStats(),
        classWise: [],
        holidays: await this._getUpcomingHolidays(sessionId),
        session: settings.activeSession,
        isHoliday: !!holidayToday,
        holiday: holidayToday,
      };
    }

    const classIds = classes.map((c) => c._id);

    // ─── Get all active students ───
    const students = await Student.find({
      class: { $in: classIds },
      status: "Active",
      isActive: true,
    }).lean();

    const studentCountMap = {};
    students.forEach((s) => {
      const cid = s.class.toString();
      studentCountMap[cid] = (studentCountMap[cid] || 0) + 1;
    });

    const totalStudents = students.length;
    const activeStudentIds = new Set(students.map((s) => s._id.toString()));

    // ─── Get today's attendance ───
    const todayAttendance = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: today, $lt: tomorrow },
    }).lean();

    // Only count active students
    const classStatsMap = {};
    todayAttendance.forEach((rec) => {
      const studentId = rec.student.toString();
      if (!activeStudentIds.has(studentId)) return;

      const cid = rec.class.toString();
      if (!classStatsMap[cid]) classStatsMap[cid] = { Present: 0, Absent: 0 };
      classStatsMap[cid][rec.status] =
        (classStatsMap[cid][rec.status] || 0) + 1;
    });

    // ─── Build class-wise table ───
    const classWise = classes.map((cls) => {
      const cid = cls._id.toString();
      const stats = classStatsMap[cid] || { Present: 0, Absent: 0 };
      const totalInClass = studentCountMap[cid] || 0;
      const present = Math.min(stats.Present, totalInClass);
      const absent = Math.min(stats.Absent, totalInClass - present);
      const marked = present + absent;
      const unmarked = Math.max(0, totalInClass - marked);
      const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        label: `${cls.name}-${cls.section}`,
        classTeacher: cls.classTeacher?.name || "Not assigned",
        totalStudents: totalInClass,
        present,
        absent,
        unmarked,
        marked,
        isMarked: marked > 0,
        percentage,
      };
    });

    // ─── Overall stats ───
    const totalPresent = classWise.reduce((sum, c) => sum + c.present, 0);
    const totalAbsent = classWise.reduce((sum, c) => sum + c.absent, 0);
    const totalMarked = totalPresent + totalAbsent;
    const totalUnmarked = Math.max(0, totalStudents - totalMarked);
    const markedClasses = classWise.filter((c) => c.isMarked).length;
    const pendingClasses = classWise.length - markedClasses;
    const overallPercentage =
      totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

    return {
      stats: {
        totalStudents,
        totalClasses: classes.length,
        totalPresent,
        totalAbsent,
        totalUnmarked,
        markedClasses,
        pendingClasses,
        overallPercentage,
      },
      classWise,
      holidays: await this._getUpcomingHolidays(sessionId),
      session: settings.activeSession,
      isHoliday: !!holidayToday,
      holiday: holidayToday,
    };
  }

  /**
   * Get upcoming holidays (next 30 days)
   */
  async _getUpcomingHolidays(sessionId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next30Days = new Date(today);
    next30Days.setDate(next30Days.getDate() + 30);

    try {
      const holidays = await Holiday.find({
        session: sessionId,
        date: { $gte: today, $lte: next30Days },
      })
        .sort("date")
        .limit(10)
        .lean();

      return holidays.map((h) => ({
        _id: h._id,
        name: h.name,
        date: h.date,
        endDate: h.endDate,
        type: h.type,
      }));
    } catch {
      return [];
    }
  }

  _emptyStats() {
    return {
      totalStudents: 0,
      totalClasses: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalUnmarked: 0,
      markedClasses: 0,
      pendingClasses: 0,
      overallPercentage: 0,
    };
  }
}

module.exports = new PrincipalService();
