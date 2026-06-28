"use strict";

const Attendance = require("../models/Attendance.model");
const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const Holiday = require("../models/Holiday.model");
const Settings = require("../models/Settings.model");
const mongoose = require("mongoose");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class ReportService {
  /**
   * Get daily report — attendance for a specific date
   */
  async getDailyReport({ date, classId, user }) {
    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId) throwError("No active session", 400);

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const tomorrow = new Date(day);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check holiday
    const holiday = await Holiday.isHoliday(day, sessionId);

    // Get classes
    const classFilter = { session: sessionId, isArchived: false };
    if (classId) classFilter._id = classId;

    // Filter teacher's classes only
    if (user?.role === "teacher") {
      const Teacher = require("../models/Teacher.model");
      const teacher = await Teacher.findOne({ user: user._id }).lean();
      if (!teacher?.assignedClasses?.length) {
        return {
          date: day,
          classes: [],
          summary: this._emptySummary(),
          holiday,
        };
      }
      classFilter._id = { $in: teacher.assignedClasses };
    }

    const classes = await Class.find(classFilter).lean();
    const classIds = classes.map((c) => c._id);

    // Get all students in these classes
    const students = await Student.find({
      class: { $in: classIds },
      status: "Active",
      isActive: true,
    }).lean();

    const studentMap = {};
    students.forEach((s) => {
      if (!studentMap[s.class.toString()]) studentMap[s.class.toString()] = [];
      studentMap[s.class.toString()].push(s);
    });

    // Get attendance records for the date
    const records = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: day, $lt: tomorrow },
    }).lean();

    const recordMap = {};
    records.forEach((r) => {
      if (!recordMap[r.class.toString()]) recordMap[r.class.toString()] = {};
      recordMap[r.class.toString()][r.student.toString()] = r;
    });

    // Build report per class
    const classReports = classes.map((cls) => {
      const classStudents = studentMap[cls._id.toString()] || [];
      const classRecords = recordMap[cls._id.toString()] || {};

      let present = 0;
      let absent = 0;
      const studentDetails = classStudents.map((s) => {
        const rec = classRecords[s._id.toString()];
        if (rec?.status === "Present") present++;
        else if (rec?.status === "Absent") absent++;
        return {
          _id: s._id,
          name: s.name,
          rollNumber: s.rollNumber,
          scholarNumber: s.scholarNumber,
          status: rec?.status || "Unmarked",
        };
      });

      const total = classStudents.length;
      const marked = present + absent;
      const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        total,
        present,
        absent,
        unmarked: total - marked,
        percentage,
        isMarked: marked > 0,
        students: studentDetails,
      };
    });

    // Overall summary
    const summary = {
      totalClasses: classes.length,
      markedClasses: classReports.filter((c) => c.isMarked).length,
      totalStudents: classReports.reduce((s, c) => s + c.total, 0),
      totalPresent: classReports.reduce((s, c) => s + c.present, 0),
      totalAbsent: classReports.reduce((s, c) => s + c.absent, 0),
      totalUnmarked: classReports.reduce((s, c) => s + c.unmarked, 0),
      overallPercentage: 0,
    };
    const totalMarked = summary.totalPresent + summary.totalAbsent;
    if (totalMarked > 0) {
      summary.overallPercentage = Math.round(
        (summary.totalPresent / totalMarked) * 100,
      );
    }

    return {
      date: day,
      classes: classReports,
      summary,
      holiday,
    };
  }

  /**
   * Get monthly report — class-wise summary for a month
   */
  async getMonthlyReport({ year, month, classId, user }) {
    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId) throwError("No active session", 400);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const classFilter = { session: sessionId, isArchived: false };
    if (classId) classFilter._id = classId;

    if (user?.role === "teacher") {
      const Teacher = require("../models/Teacher.model");
      const teacher = await Teacher.findOne({ user: user._id }).lean();
      if (!teacher?.assignedClasses?.length) {
        return { year, month, classes: [], summary: this._emptySummary() };
      }
      classFilter._id = { $in: teacher.assignedClasses };
    }

    const classes = await Class.find(classFilter).lean();
    const classIds = classes.map((c) => c._id);

    // Aggregate attendance by class
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

    // Build class-wise stats
    const classStatsMap = {};
    attendanceAgg.forEach((a) => {
      const cid = a._id.class.toString();
      if (!classStatsMap[cid]) classStatsMap[cid] = { Present: 0, Absent: 0 };
      classStatsMap[cid][a._id.status] = a.count;
    });

    // Get student counts per class
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

    // Get holidays in the month
    const holidays = await Holiday.find({
      session: sessionId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Calculate working days
    const totalDays = endDate.getDate();
    const workingDays = this._calculateWorkingDays(
      startDate,
      endDate,
      holidays,
      settings,
    );

    const classReports = classes.map((cls) => {
      const cid = cls._id.toString();
      const stats = classStatsMap[cid] || { Present: 0, Absent: 0 };
      const totalStudents = studentCountMap[cid] || 0;
      const totalMarks = stats.Present + stats.Absent;
      const expectedMarks = totalStudents * workingDays;
      const percentage =
        totalMarks > 0 ? Math.round((stats.Present / totalMarks) * 100) : 0;

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        totalStudents,
        workingDays,
        totalMarks,
        expectedMarks,
        present: stats.Present,
        absent: stats.Absent,
        percentage,
      };
    });

    const summary = {
      totalClasses: classes.length,
      totalStudents: classReports.reduce((s, c) => s + c.totalStudents, 0),
      totalPresent: classReports.reduce((s, c) => s + c.present, 0),
      totalAbsent: classReports.reduce((s, c) => s + c.absent, 0),
      workingDays,
      holidays: holidays.length,
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
      holidays: holidays.map((h) => ({
        _id: h._id,
        name: h.name,
        date: h.date,
        type: h.type,
      })),
    };
  }

  /**
   * Get student-wise attendance report
   */
  async getStudentReport({ studentId, dateFrom, dateTo }) {
    const student = await Student.findById(studentId)
      .populate("class", "name section")
      .lean();
    if (!student) throwError("Student not found", 404);

    const filter = { student: studentId };
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        filter.date.$gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }

    const records = await Attendance.find(filter)
      .sort("date")
      .populate("markedBy", "name")
      .lean();

    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const total = records.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      student,
      records,
      stats: { total, present, absent, percentage },
    };
  }

  /**
   * Get defaulter report — students below threshold %
   */
  async getDefaulterReport({
    classId,
    threshold = 75,
    dateFrom,
    dateTo,
    user,
  }) {
    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId) throwError("No active session", 400);

    const studentFilter = {
      session: sessionId,
      status: "Active",
      isActive: true,
    };
    if (classId) studentFilter.class = classId;

    if (user?.role === "teacher") {
      const Teacher = require("../models/Teacher.model");
      const teacher = await Teacher.findOne({ user: user._id }).lean();
      if (!teacher?.assignedClasses?.length)
        return { defaulters: [], threshold };
      studentFilter.class = { $in: teacher.assignedClasses };
    }

    const students = await Student.find(studentFilter)
      .populate("class", "name section")
      .lean();

    const dateFilter = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      dateFilter.$gte = from;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      dateFilter.$lte = to;
    }

    const defaulters = [];

    for (const s of students) {
      const matchFilter = { student: s._id };
      if (Object.keys(dateFilter).length > 0) matchFilter.date = dateFilter;

      const stats = await Attendance.aggregate([
        { $match: matchFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      let present = 0,
        absent = 0;
      stats.forEach((r) => {
        if (r._id === "Present") present = r.count;
        if (r._id === "Absent") absent = r.count;
      });

      const total = present + absent;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      if (total > 0 && percentage < threshold) {
        defaulters.push({
          _id: s._id,
          name: s.name,
          scholarNumber: s.scholarNumber,
          rollNumber: s.rollNumber,
          class: s.class,
          mobile: s.mobile,
          fatherName: s.fatherName,
          present,
          absent,
          total,
          percentage,
        });
      }
    }

    defaulters.sort((a, b) => a.percentage - b.percentage);

    return {
      defaulters,
      threshold,
      total: defaulters.length,
    };
  }

  /**
   * Get class-wise attendance trend (for charts)
   */
  async getClassTrend({ classId, days = 30 }) {
    if (!classId) throwError("Class ID required", 400);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const trend = await Attendance.aggregate([
      {
        $match: {
          class: new mongoose.Types.ObjectId(classId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
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

    const data = Object.keys(dailyMap)
      .sort()
      .map((date) => {
        const stats = dailyMap[date];
        const total = stats.Present + stats.Absent;
        return {
          date,
          present: stats.Present,
          absent: stats.Absent,
          percentage: total > 0 ? Math.round((stats.Present / total) * 100) : 0,
        };
      });

    return { classId, days, data };
  }

  /**
   * Get analytics overview — for admin dashboard
   */
  async getAnalyticsOverview() {
    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId) return this._emptyAnalytics();

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    // Class count
    const totalClasses = await Class.countDocuments({
      session: sessionId,
      isArchived: false,
    });

    // Student count
    const totalStudents = await Student.countDocuments({
      session: sessionId,
      status: "Active",
      isActive: true,
    });

    // Attendance trend (last 30 days)
    const trend = await Attendance.aggregate([
      {
        $match: {
          session: new mongoose.Types.ObjectId(sessionId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
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

    const trendData = Object.keys(dailyMap)
      .sort()
      .slice(-30)
      .map((date) => {
        const stats = dailyMap[date];
        const total = stats.Present + stats.Absent;
        return {
          date,
          present: stats.Present,
          absent: stats.Absent,
          percentage: total > 0 ? Math.round((stats.Present / total) * 100) : 0,
        };
      });

    // Class-wise comparison (current month)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const classComparison = await Attendance.aggregate([
      {
        $match: {
          session: new mongoose.Types.ObjectId(sessionId),
          date: { $gte: monthStart, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { class: "$class", status: "$status" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "classes",
          localField: "_id.class",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: "$classInfo" },
    ]);

    const classStatsMap = {};
    classComparison.forEach((c) => {
      const cid = c._id.class.toString();
      if (!classStatsMap[cid]) {
        classStatsMap[cid] = {
          name: `${c.classInfo.name}-${c.classInfo.section}`,
          Present: 0,
          Absent: 0,
        };
      }
      classStatsMap[cid][c._id.status] = c.count;
    });

    const classData = Object.values(classStatsMap)
      .map((c) => {
        const total = c.Present + c.Absent;
        return {
          name: c.name,
          present: c.Present,
          absent: c.Absent,
          percentage: total > 0 ? Math.round((c.Present / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    // Status distribution (pie chart data)
    const overallStats = await Attendance.aggregate([
      {
        $match: {
          session: new mongoose.Types.ObjectId(sessionId),
          date: { $gte: monthStart, $lte: endDate },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const distribution = { Present: 0, Absent: 0 };
    overallStats.forEach((s) => {
      distribution[s._id] = s.count;
    });

    return {
      totals: {
        students: totalStudents,
        classes: totalClasses,
      },
      trend: trendData,
      classComparison: classData,
      distribution,
    };
  }

  _emptySummary() {
    return {
      totalClasses: 0,
      markedClasses: 0,
      totalStudents: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalUnmarked: 0,
      overallPercentage: 0,
    };
  }

  _emptyAnalytics() {
    return {
      totals: { students: 0, classes: 0 },
      trend: [],
      classComparison: [],
      distribution: { Present: 0, Absent: 0 },
    };
  }

  _calculateWorkingDays(start, end, holidays, settings) {
    let workingDays = 0;
    const holidayDates = new Set(
      holidays.map((h) => {
        const d = new Date(h.date);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
    );

    const workingDayNames = settings?.workingDays
      ?.filter((d) => d.isWorking)
      .map((d) => d.day) || [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const cur = new Date(start);
    while (cur <= end) {
      const dayName = cur.toLocaleDateString("en-US", { weekday: "long" });
      const dateKey = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;

      if (workingDayNames.includes(dayName) && !holidayDates.has(dateKey)) {
        workingDays++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return workingDays;
  }
  /**
   * Get attendance register — Excel-style date-wise view
   * Returns students × dates matrix with P/A/H status
   */
  async getAttendanceRegister({ classId, dateFrom, dateTo, user }) {
    if (!classId) throwError("Class ID is required", 400);
    if (!dateFrom || !dateTo) {
      throwError("Date range (from/to) is required", 400);
    }

    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId) throwError("No active session", 400);

    // ─── Parse dates ───
    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      throwError("Start date must be before end date", 400);
    }

    // ─── Limit: max 90 days range ───
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      throwError("Date range cannot exceed 90 days", 400);
    }

    // ─── Teacher RBAC ───
    if (user?.role === "teacher") {
      const Teacher = require("../models/Teacher.model");
      const teacher = await Teacher.findOne({ user: user._id }).lean();
      if (
        !teacher?.assignedClasses?.length ||
        !teacher.assignedClasses.some(
          (c) => c.toString() === classId.toString(),
        )
      ) {
        throwError("You are not assigned to this class", 403);
      }
    }

    // ─── Get class info ───
    const cls = await Class.findById(classId)
      .populate("classTeacher", "name")
      .lean();
    if (!cls) throwError("Class not found", 404);

    // ─── Get students of this class (active only, sorted by roll number) ───
    const students = await Student.find({
      class: classId,
      session: sessionId,
      status: "Active",
      isActive: true,
    })
      .sort({ rollNumber: 1, name: 1 })
      .lean();

    // ─── Get all attendance records for this class in the date range ───
    const records = await Attendance.find({
      class: classId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // ─── Get all holidays in the date range ───
    const holidays = await Holiday.find({
      session: sessionId,
      $or: [
        { date: { $gte: startDate, $lte: endDate }, endDate: null },
        { date: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    }).lean();

    // ─── Build holiday date map ───
    const holidayMap = {};
    holidays.forEach((h) => {
      const start = new Date(h.date);
      start.setHours(0, 0, 0, 0);
      const end = h.endDate ? new Date(h.endDate) : new Date(h.date);
      end.setHours(23, 59, 59, 999);

      const cur = new Date(start);
      while (cur <= end) {
        const key = this._dateKey(cur);
        holidayMap[key] = {
          name: h.name,
          type: h.type,
          allowAttendance: h.allowAttendance,
        };
        cur.setDate(cur.getDate() + 1);
      }
    });

    // ─── Working days config ───
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
      const monthShort = cur.toLocaleDateString("en-US", { month: "short" });
      const dayNumber = cur.getDate();
      const isWorkingDay = workingDayNames.has(dayName);
      const holiday = holidayMap[key];

      dateArray.push({
        date: new Date(cur),
        dateKey: key,
        day: dayNumber,
        dayName,
        dayShort,
        monthShort,
        year: cur.getFullYear(),
        isSunday: dayName === "Sunday",
        isHoliday: !!holiday,
        holidayName: holiday?.name || null,
        isWorkingDay,
        // Cell is "blocked" if it's a holiday or non-working day
        isBlocked: !!holiday || !isWorkingDay,
      });

      cur.setDate(cur.getDate() + 1);
    }

    // ─── Build attendance map: { studentId: { dateKey: status } } ───
    const attendanceMap = {};
    records.forEach((r) => {
      const studentId = r.student.toString();
      const dateKey = this._dateKey(r.date);
      if (!attendanceMap[studentId]) attendanceMap[studentId] = {};
      attendanceMap[studentId][dateKey] = r.status;
    });

    // ─── Build student rows with attendance per date ───
    const studentRows = students.map((s) => {
      const sid = s._id.toString();
      const attendance = {};
      let presentCount = 0;
      let absentCount = 0;
      let workingDaysCount = 0;

      dateArray.forEach((d) => {
        if (d.isBlocked) {
          // Holiday or non-working day
          attendance[d.dateKey] = d.isHoliday ? "H" : "-";
        } else {
          workingDaysCount++;
          const status = attendanceMap[sid]?.[d.dateKey];
          if (status === "Present") {
            attendance[d.dateKey] = "P";
            presentCount++;
          } else if (status === "Absent") {
            attendance[d.dateKey] = "A";
            absentCount++;
          } else {
            attendance[d.dateKey] = ""; // Unmarked
          }
        }
      });

      const markedCount = presentCount + absentCount;
      const percentage =
        markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0;

      return {
        _id: s._id,
        scholarNumber: s.scholarNumber,
        rollNumber: s.rollNumber,
        name: s.name,
        fatherName: s.fatherName,
        motherName: s.motherName,
        gender: s.gender,
        mobile: s.mobile,
        attendance,
        totals: {
          present: presentCount,
          absent: absentCount,
          workingDays: workingDaysCount,
          marked: markedCount,
          percentage,
        },
      };
    });

    // ─── Build month grouping for headers ───
    const monthGroups = [];
    let currentGroup = null;
    dateArray.forEach((d) => {
      const monthKey = `${d.monthShort} ${d.year}`;
      if (!currentGroup || currentGroup.label !== monthKey) {
        if (currentGroup) monthGroups.push(currentGroup);
        currentGroup = { label: monthKey, count: 1, year: d.year };
      } else {
        currentGroup.count++;
      }
    });
    if (currentGroup) monthGroups.push(currentGroup);

    // ─── Summary stats ───
    const summary = {
      totalStudents: students.length,
      totalDays: dateArray.length,
      workingDays: dateArray.filter((d) => !d.isBlocked).length,
      holidays: dateArray.filter((d) => d.isHoliday).length,
      sundays: dateArray.filter((d) => d.isSunday).length,
      dateFrom: startDate,
      dateTo: endDate,
    };

    return {
      class: {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        classTeacher: cls.classTeacher?.name || null,
      },
      students: studentRows,
      dates: dateArray,
      monthGroups,
      summary,
    };
  }

  /**
   * Helper: Format date as YYYY-MM-DD key
   */
  _dateKey(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
}

module.exports = new ReportService();
