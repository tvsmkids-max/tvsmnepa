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
  // ═══════════════════════════════════════════════════════════════
  //  HELPER: Restrict class filter for "class" role users
  //  Returns null if user has no linkedClass (empty results)
  //  Returns updated filter otherwise
  // ═══════════════════════════════════════════════════════════════
  _applyClassRoleFilter(classFilter, user, classId) {
    if (user?.role !== "class") return classFilter;

    const linked = user.linkedClass?.toString();
    if (!linked) return null; // no access

    // If a specific classId was requested, it must match the linked class
    if (classId && classId.toString() !== linked) return null;

    classFilter._id = new mongoose.Types.ObjectId(linked);
    return classFilter;
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER: Smart class sort rank (Nursery → 12th)
  // ═══════════════════════════════════════════════════════════════
  _getClassRank(className) {
    if (!className) return 999;
    const name = className.toString().trim().toUpperCase();
    if (/^NUR/.test(name) || name === "NURSERY") return 1;
    if (/^L\.?K\.?G/.test(name) || name === "LKG" || name === "LOWER KG")
      return 2;
    if (/^U\.?K\.?G/.test(name) || name === "UKG" || name === "UPPER KG")
      return 3;
    if (/^PRE/.test(name) || name === "PLAYGROUP") return 0;
    const numMatch = name.match(/^(?:CLASS\s*)?(\d{1,2})(?:ST|ND|RD|TH)?/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num >= 1 && num <= 12) return 10 + num;
    }
    return 999;
  }

  // ═══════════════════════════════════════════════════════════════
  //  DAILY REPORT
  // ═══════════════════════════════════════════════════════════════
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

    // Check non-working day
    const dayName = day.toLocaleDateString("en-US", { weekday: "long" });
    const workingDay = settings?.workingDays?.find((d) => d.day === dayName);
    const isWorkingDay = !workingDay || workingDay.isWorking;
    const isHoliday = holiday && !holiday.allowAttendance;
    const isNonWorkingDay = !isWorkingDay && !isHoliday;

    // Build class filter
    let classFilter = { session: sessionId, isArchived: false };
    if (classId) classFilter._id = classId;

    // Apply role-based filter
    classFilter = this._applyClassRoleFilter(classFilter, user, classId);
    if (!classFilter) {
      return {
        date: day,
        classes: [],
        summary: this._emptySummary(),
        holiday,
        isHoliday,
        isNonWorkingDay,
        isWorkingDay,
        today: { date: day.toISOString(), dayName },
      };
    }

    // ✅ NO populate — teacherLabel is a plain string on Class
    const classes = await Class.find(classFilter).lean();
    const classIds = classes.map((c) => c._id);

    // Get students
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

    // Get attendance with markedBy / editedBy (User names)
    const records = await Attendance.find({
      class: { $in: classIds },
      date: { $gte: day, $lt: tomorrow },
    })
      .populate("markedBy", "name")
      .populate("editedBy", "name")
      .lean();

    const recordMap = {};
    records.forEach((r) => {
      if (!recordMap[r.class.toString()]) recordMap[r.class.toString()] = {};
      recordMap[r.class.toString()][r.student.toString()] = r;
    });

    // Build per-class reports
    const classReports = classes.map((cls) => {
      const classStudents = studentMap[cls._id.toString()] || [];
      const classRecords = recordMap[cls._id.toString()] || {};

      let present = 0;
      let absent = 0;
      let markedByName = null;
      let editedByName = null;
      let markedAt = null;
      let editedAt = null;
      let hasEdits = false;

      const studentDetails = classStudents
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map((s) => {
          const rec = classRecords[s._id.toString()];
          if (rec?.status === "Present") present++;
          else if (rec?.status === "Absent") absent++;

          if (rec?.markedBy?.name && !markedByName) {
            markedByName = rec.markedBy.name;
            markedAt = rec.markedAt || rec.createdAt;
          }

          if (rec?.editedBy?.name) {
            editedByName = rec.editedBy.name;
            editedAt = rec.editedAt;
            hasEdits = true;
          }

          return {
            _id: s._id,
            name: s.name,
            scholarNumber: s.scholarNumber,
            fatherName: s.fatherName,
            motherName: s.motherName,
            gender: s.gender,
            mobile: s.mobile,
            status: rec?.status || "Unmarked",
          };
        });

      const total = classStudents.length;
      const marked = present + absent;
      const unmarked = total - marked;
      const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

      let status = "pending";
      if (total === 0) status = "empty";
      else if (marked === total) status = "completed";
      else if (marked > 0) status = "partial";

      const isLowAttendance = marked > 0 && percentage < 80;

      return {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        total,
        present,
        absent,
        unmarked,
        percentage,
        isMarked: marked > 0,
        isEmpty: total === 0,
        status,
        isLowAttendance,
        // ✅ NEW: teacherLabel replaces classTeacher.name
        classTeacher: cls.teacherLabel || null,
        classTeacherEmpId: null,
        markedBy: markedByName,
        markedAt,
        editedBy: hasEdits ? editedByName : null,
        editedAt: hasEdits ? editedAt : null,
        hasEdits,
        sortRank: this._getClassRank(cls.name),
        students: studentDetails,
      };
    });

    // Sort classes
    classReports.sort((a, b) => {
      if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
      return (a.section || "").localeCompare(b.section || "");
    });

    const summary = {
      totalClasses: classes.length,
      markedClasses: classReports.filter((c) => c.status === "completed")
        .length,
      partialClasses: classReports.filter((c) => c.status === "partial").length,
      pendingClasses: classReports.filter((c) => c.status === "pending").length,
      emptyClasses: classReports.filter((c) => c.status === "empty").length,
      totalStudents: classReports.reduce((s, c) => s + c.total, 0),
      totalPresent: classReports.reduce((s, c) => s + c.present, 0),
      totalAbsent: classReports.reduce((s, c) => s + c.absent, 0),
      totalUnmarked: classReports.reduce((s, c) => s + c.unmarked, 0),
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
      date: day,
      isHoliday,
      isNonWorkingDay,
      isWorkingDay,
      holiday: isHoliday ? holiday : null,
      today: { date: day.toISOString(), dayName },
      classes: classReports,
      summary,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  MONTHLY REPORT
  // ═══════════════════════════════════════════════════════════════
  async getMonthlyReport({ year, month, classId, user }) {
    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId) throwError("No active session", 400);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const prevStartDate = new Date(year, month - 2, 1);
    const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);

    let classFilter = { session: sessionId, isArchived: false };
    if (classId) classFilter._id = classId;

    classFilter = this._applyClassRoleFilter(classFilter, user, classId);
    if (!classFilter) {
      return { year, month, classes: [], summary: this._emptySummary() };
    }

    // ✅ NO populate
    const classes = await Class.find(classFilter).lean();
    const classIds = classes.map((c) => c._id);

    // Current month aggregation
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

    // Previous month aggregation
    const prevAttendanceAgg = await Attendance.aggregate([
      {
        $match: {
          class: { $in: classIds },
          date: { $gte: prevStartDate, $lte: prevEndDate },
        },
      },
      {
        $group: {
          _id: { class: "$class", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    const prevClassStatsMap = {};
    prevAttendanceAgg.forEach((a) => {
      const cid = a._id.class.toString();
      if (!prevClassStatsMap[cid])
        prevClassStatsMap[cid] = { Present: 0, Absent: 0 };
      prevClassStatsMap[cid][a._id.status] = a.count;
    });

    // Student counts
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

    // Holidays
    const holidays = await Holiday.find({
      session: sessionId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    const workingDays = this._calculateWorkingDays(
      startDate,
      endDate,
      holidays,
      settings,
    );

    // Last modified info
    const lastRecords = await Attendance.aggregate([
      {
        $match: {
          class: { $in: classIds },
          date: { $gte: startDate, $lte: endDate },
        },
      },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: "$class",
          lastMarkedBy: { $first: "$markedBy" },
          lastMarkedAt: { $first: "$markedAt" },
          lastEditedBy: { $first: "$editedBy" },
          lastEditedAt: { $first: "$editedAt" },
          lastUpdatedAt: { $first: "$updatedAt" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "lastMarkedBy",
          foreignField: "_id",
          as: "markedByUser",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "lastEditedBy",
          foreignField: "_id",
          as: "editedByUser",
        },
      },
    ]);

    const lastRecordMap = {};
    lastRecords.forEach((r) => {
      lastRecordMap[r._id.toString()] = {
        markedBy: r.markedByUser?.[0]?.name || null,
        markedAt: r.lastMarkedAt,
        editedBy: r.editedByUser?.[0]?.name || null,
        editedAt: r.lastEditedAt,
        lastUpdatedAt: r.lastUpdatedAt,
      };
    });

    // Build class reports
    const classReports = classes.map((cls) => {
      const cid = cls._id.toString();
      const stats = classStatsMap[cid] || { Present: 0, Absent: 0 };
      const prevStats = prevClassStatsMap[cid] || { Present: 0, Absent: 0 };
      const totalStudents = studentCountMap[cid] || 0;
      const totalMarks = stats.Present + stats.Absent;
      const expectedMarks = totalStudents * workingDays;
      const percentage =
        totalMarks > 0 ? Math.round((stats.Present / totalMarks) * 100) : 0;

      const prevTotalMarks = prevStats.Present + prevStats.Absent;
      const prevPercentage =
        prevTotalMarks > 0
          ? Math.round((prevStats.Present / prevTotalMarks) * 100)
          : 0;

      const trendDiff = percentage - prevPercentage;
      let trend = "stable";
      if (trendDiff > 2) trend = "up";
      else if (trendDiff < -2) trend = "down";

      const avgPresentDays =
        totalStudents > 0
          ? Math.round((stats.Present / totalStudents) * 10) / 10
          : 0;
      const avgAbsentDays =
        totalStudents > 0
          ? Math.round((stats.Absent / totalStudents) * 10) / 10
          : 0;

      const lastRecord = lastRecordMap[cid] || {};

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
        isEmpty: totalStudents === 0,
        isLowAttendance: totalMarks > 0 && percentage < 80,
        // ✅ NEW: teacherLabel
        classTeacher: cls.teacherLabel || null,
        prevPercentage,
        trendDiff,
        trend,
        avgPresentDays,
        avgAbsentDays,
        markedBy: lastRecord.markedBy,
        editedBy: lastRecord.editedBy,
        lastUpdatedAt: lastRecord.lastUpdatedAt,
        sortRank: this._getClassRank(cls.name),
      };
    });

    classReports.sort((a, b) => {
      if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
      return (a.section || "").localeCompare(b.section || "");
    });

    const ranked = [...classReports]
      .filter((c) => !c.isEmpty && c.totalMarks > 0)
      .sort((a, b) => b.percentage - a.percentage);

    ranked.forEach((cls, idx) => {
      const original = classReports.find(
        (c) => c._id.toString() === cls._id.toString(),
      );
      if (original) original.rank = idx + 1;
    });

    if (ranked.length > 0) {
      const highest = classReports.find(
        (c) => c._id.toString() === ranked[0]._id.toString(),
      );
      if (highest) highest.isHighest = true;

      const lowest = classReports.find(
        (c) => c._id.toString() === ranked[ranked.length - 1]._id.toString(),
      );
      if (lowest && ranked.length > 1) lowest.isLowest = true;
    }

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
      holidays: holidays.map((h) => ({
        _id: h._id,
        name: h.name,
        date: h.date,
        type: h.type,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  MONTHLY CLASS DETAIL (Calendar view)
  // ═══════════════════════════════════════════════════════════════
  async getMonthlyClassDetail({ classId, year, month, user }) {
    if (!classId) throwError("Class ID is required", 400);

    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId) throwError("No active session", 400);

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Class role RBAC
    if (user?.role === "class") {
      const linked = user.linkedClass?.toString();
      if (!linked || linked !== classId.toString()) {
        throwError("You can only access your own class", 403);
      }
    }

    // ✅ NO populate
    const cls = await Class.findById(classId).lean();
    if (!cls) throwError("Class not found", 404);

    const students = await Student.find({
      class: classId,
      session: sessionId,
      status: "Active",
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();

    const holidays = await Holiday.find({
      session: sessionId,
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
        // ✅ NEW: teacherLabel
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
  //  STUDENT REPORT
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  //  DEFAULTER REPORT
  // ═══════════════════════════════════════════════════════════════
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

    // Class role RBAC
    if (user?.role === "class") {
      const linked = user.linkedClass?.toString();
      if (!linked) return { defaulters: [], threshold, total: 0 };
      if (classId && classId.toString() !== linked) {
        return { defaulters: [], threshold, total: 0 };
      }
      studentFilter.class = new mongoose.Types.ObjectId(linked);
    }

    const students = await Student.find(studentFilter)
      .populate("class", "name section")
      .lean();

    if (students.length === 0) {
      return { defaulters: [], threshold, total: 0 };
    }

    const studentIds = students.map((s) => s._id);

    const attendanceMatch = { student: { $in: studentIds } };
    if (dateFrom || dateTo) {
      attendanceMatch.date = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        attendanceMatch.date.$gte = from;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        attendanceMatch.date.$lte = to;
      }
    }

    const allStats = await Attendance.aggregate([
      { $match: attendanceMatch },
      {
        $group: {
          _id: { student: "$student", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = {};
    allStats.forEach((r) => {
      const sid = r._id.student.toString();
      if (!statsMap[sid]) statsMap[sid] = { present: 0, absent: 0 };
      if (r._id.status === "Present") statsMap[sid].present = r.count;
      else if (r._id.status === "Absent") statsMap[sid].absent = r.count;
    });

    const defaulters = [];
    students.forEach((s) => {
      const stats = statsMap[s._id.toString()] || { present: 0, absent: 0 };
      const total = stats.present + stats.absent;
      if (total === 0) return;

      const percentage = Math.round((stats.present / total) * 100);
      if (percentage < threshold) {
        defaulters.push({
          _id: s._id,
          name: s.name,
          scholarNumber: s.scholarNumber,
          class: s.class,
          mobile: s.mobile,
          fatherName: s.fatherName,
          present: stats.present,
          absent: stats.absent,
          total,
          percentage,
        });
      }
    });

    defaulters.sort((a, b) => a.percentage - b.percentage);

    return {
      defaulters,
      threshold,
      total: defaulters.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  CLASS TREND
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  //  ANALYTICS OVERVIEW
  // ═══════════════════════════════════════════════════════════════
  async getAnalyticsOverview() {
    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId) return this._emptyAnalytics();

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    const totalClasses = await Class.countDocuments({
      session: sessionId,
      isArchived: false,
    });

    const totalStudents = await Student.countDocuments({
      session: sessionId,
      status: "Active",
      isActive: true,
    });

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
      totals: { students: totalStudents, classes: totalClasses },
      trend: trendData,
      classComparison: classData,
      distribution,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  ATTENDANCE REGISTER
  // ═══════════════════════════════════════════════════════════════
  async getAttendanceRegister({ classId, dateFrom, dateTo, user }) {
    if (!classId) throwError("Class ID is required", 400);
    if (!dateFrom || !dateTo) {
      throwError("Date range (from/to) is required", 400);
    }

    const settings = await Settings.getSettings();
    const sessionId = settings?.activeSession?._id || settings?.activeSession;
    if (!sessionId) throwError("No active session", 400);

    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      throwError("Start date must be before end date", 400);
    }

    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      throwError("Date range cannot exceed 1 year (365 days)", 400);
    }

    // Class role RBAC
    if (user?.role === "class") {
      const linked = user.linkedClass?.toString();
      if (!linked || linked !== classId.toString()) {
        throwError("You can only access your own class", 403);
      }
    }

    // ✅ NO populate
    const cls = await Class.findById(classId).lean();
    if (!cls) throwError("Class not found", 404);

    const students = await Student.find({
      class: classId,
      session: sessionId,
      status: "Active",
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();

    const records = await Attendance.find({
      class: classId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    const holidays = await Holiday.find({
      session: sessionId,
      $or: [
        { date: { $gte: startDate, $lte: endDate }, endDate: null },
        { date: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    }).lean();

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
        isBlocked: !!holiday || !isWorkingDay,
      });

      cur.setDate(cur.getDate() + 1);
    }

    const attendanceMap = {};
    records.forEach((r) => {
      const studentId = r.student.toString();
      const dateKey = this._dateKey(r.date);
      if (!attendanceMap[studentId]) attendanceMap[studentId] = {};
      attendanceMap[studentId][dateKey] = r.status;
    });

    const studentRows = students.map((s) => {
      const sid = s._id.toString();
      const attendance = {};
      let presentCount = 0;
      let absentCount = 0;
      let workingDaysCount = 0;

      dateArray.forEach((d) => {
        if (d.isBlocked) {
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
            attendance[d.dateKey] = "";
          }
        }
      });

      const markedCount = presentCount + absentCount;
      const percentage =
        markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0;

      return {
        _id: s._id,
        scholarNumber: s.scholarNumber,
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
        // ✅ NEW: teacherLabel
        classTeacher: cls.teacherLabel || null,
      },
      students: studentRows,
      dates: dateArray,
      monthGroups,
      summary,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════
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

  _dateKey(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
}

module.exports = new ReportService();
