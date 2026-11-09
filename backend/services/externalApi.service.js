"use strict";

const mongoose = require("mongoose");
const Attendance = require("../models/Attendance.model");
const Student = require("../models/Student.model");
const Class = require("../models/Class.model");
const AcademicSession = require("../models/AcademicSession.model");
const Settings = require("../models/Settings.model");
const Holiday = require("../models/Holiday.model");
const ExternalApiKey = require("../models/ExternalApiKey.model");

const throwError = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

class ExternalApiService {
  // ═══════════════════════════════════════════════════════════════
  //  DATE & SESSION HELPERS (Aligned with AttendanceService IST-UTC)
  // ═══════════════════════════════════════════════════════════════
  _toIstDateString(dateInput) {
    if (
      typeof dateInput === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())
    ) {
      const parsed = new Date(`${dateInput.trim()}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) {
        throwError("Invalid date format. Expected YYYY-MM-DD.", 400);
      }
      return dateInput.trim();
    }

    const dObj = dateInput ? new Date(dateInput) : new Date();
    if (Number.isNaN(dObj.getTime())) {
      throwError("Invalid date value.", 400);
    }

    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(dObj.getTime() + istOffsetMs);
    const y = istTime.getUTCFullYear();
    const m = String(istTime.getUTCMonth() + 1).padStart(2, "0");
    const d = String(istTime.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  _getDayBounds(dateInput) {
    const dateStr = this._toIstDateString(dateInput);
    return {
      dateStr,
      start: new Date(`${dateStr}T00:00:00.000Z`),
      end: new Date(`${dateStr}T23:59:59.999Z`),
    };
  }

  async _resolveSession(sessionId) {
    if (sessionId) {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        throwError("Invalid sessionId.", 400);
      }
      const session = await AcademicSession.findById(sessionId)
        .select("_id name startDate endDate isActive")
        .lean();
      if (!session) throwError("Academic session not found.", 404);
      return session;
    }

    const settings = await Settings.findOne().populate("activeSession").lean();
    if (settings?.activeSession?._id) {
      const s = settings.activeSession;
      return {
        _id: s._id,
        name: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
        isActive: s.isActive,
      };
    }

    const active = await AcademicSession.findOne({ isActive: true })
      .select("_id name startDate endDate isActive")
      .lean();
    if (!active) throwError("No active academic session configured.", 400);
    return active;
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

  // ═══════════════════════════════════════════════════════════════
  //  ADMIN: EXTERNAL API KEY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  async listKeys() {
    return ExternalApiKey.find({})
      .select("-keyHash")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();
  }

  async createKey({ label, expiresAt = null, allowedOrigins = [], createdBy }) {
    const { rawKey, keyPrefix, keyHash } = ExternalApiKey.generateKeyPair();

    const normalizedOrigins = Array.isArray(allowedOrigins)
      ? allowedOrigins.map((o) => String(o).trim()).filter(Boolean)
      : typeof allowedOrigins === "string" && allowedOrigins.trim()
        ? allowedOrigins
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : [];

    const created = await ExternalApiKey.create({
      label: label?.trim() || "External MERN Website",
      keyPrefix,
      keyHash,
      allowedOrigins: normalizedOrigins,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy,
    });

    const safeDoc = created.toObject();
    delete safeDoc.keyHash;

    return {
      key: safeDoc,
      apiKey: rawKey, // Returned ONCE at creation time
    };
  }

  async revokeKey(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throwError("Invalid key ID.", 400);
    }
    return ExternalApiKey.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    )
      .select("-keyHash")
      .lean();
  }

  async deleteKey(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throwError("Invalid key ID.", 400);
    }
    return ExternalApiKey.findByIdAndDelete(id).select("-keyHash").lean();
  }

  // ═══════════════════════════════════════════════════════════════
  //  READ-ONLY ENDPOINT 1: SCHOOL STATUS & METADATA
  // ═══════════════════════════════════════════════════════════════
  async getSchoolStatus() {
    const settings = await Settings.findOne()
      .populate("activeSession", "_id name startDate endDate isActive")
      .lean();

    const activeSession =
      settings?.activeSession ||
      (await AcademicSession.findOne({ isActive: true })
        .select("_id name startDate endDate isActive")
        .lean());

    let totalClasses = 0;
    let totalActiveStudents = 0;

    if (activeSession?._id) {
      [totalClasses, totalActiveStudents] = await Promise.all([
        Class.countDocuments({
          session: activeSession._id,
          isArchived: false,
        }),
        Student.countDocuments({
          session: activeSession._id,
          status: "Active",
          isActive: true,
        }),
      ]);
    }

    return {
      schoolName: settings?.schoolName || "School Attendance System",
      timezone: settings?.timezone || "Asia/Kolkata",
      activeSession: activeSession || null,
      totalClasses,
      totalActiveStudents,
      readOnly: true,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  READ-ONLY ENDPOINT 2: LIST ACADEMIC SESSIONS
  // ═══════════════════════════════════════════════════════════════
  async getSessions() {
    return AcademicSession.find({})
      .select("_id name startDate endDate isActive description")
      .sort({ startDate: -1 })
      .lean();
  }

  // ═══════════════════════════════════════════════════════════════
  //  READ-ONLY ENDPOINT 3: LIST CLASSES WITH STUDENT COUNTS
  // ═══════════════════════════════════════════════════════════════
  async getClasses({ sessionId, group }) {
    const session = await this._resolveSession(sessionId);

    let classes = await Class.find({
      session: session._id,
      isArchived: false,
    })
      .select("_id name section teacherLabel displayOrder description")
      .lean();

    if (group && group.toUpperCase() !== "ALL") {
      const targetGroup = group.toUpperCase();
      classes = classes.filter(
        (c) => this._getClassGroup(c.name) === targetGroup,
      );
    }

    classes = this._sortClasses(classes);
    const classIds = classes.map((c) => c._id);

    const counts = await Student.aggregate([
      {
        $match: {
          class: { $in: classIds },
          status: "Active",
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$class",
          totalStudents: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(
      counts.map((c) => [c._id.toString(), c.totalStudents]),
    );

    return {
      session,
      classes: classes.map((c) => ({
        _id: c._id,
        name: c.name,
        section: c.section,
        fullName: `${c.name} - ${c.section}`,
        group: this._getClassGroup(c.name),
        classTeacher: c.teacherLabel || null,
        totalStudents: countMap.get(c._id.toString()) || 0,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  READ-ONLY ENDPOINT 4: DAILY SCHOOL OVERVIEW & CLASS BREAKDOWN
  // ═══════════════════════════════════════════════════════════════
  async getDailyOverview({ date, sessionId, group }) {
    const session = await this._resolveSession(sessionId);
    const { dateStr, start, end } = this._getDayBounds(date);

    const [settings, holiday] = await Promise.all([
      Settings.findOne().select("schoolName workingDays").lean(),
      Holiday.isHoliday(start, session._id),
    ]);

    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "UTC",
    }).format(start);

    const workingDay = settings?.workingDays?.find((d) => d.day === dayName);
    const isWorkingDay = !workingDay || workingDay.isWorking;
    const isHoliday = Boolean(holiday && !holiday.allowAttendance);
    const isNonWorkingDay = !isWorkingDay && !isHoliday;

    let classes = await Class.find({
      session: session._id,
      isArchived: false,
    })
      .select("_id name section teacherLabel")
      .lean();

    if (group && group.toUpperCase() !== "ALL") {
      const targetGroup = group.toUpperCase();
      classes = classes.filter(
        (c) => this._getClassGroup(c.name) === targetGroup,
      );
    }

    classes = this._sortClasses(classes);
    const classIds = classes.map((c) => c._id);

    const [students, attendanceRecords] = await Promise.all([
      Student.find({
        class: { $in: classIds },
        status: "Active",
        isActive: true,
      })
        .select("_id class")
        .lean(),
      Attendance.find({
        class: { $in: classIds },
        date: { $gte: start, $lte: end },
      })
        .select("student class status")
        .lean(),
    ]);

    const activeStudentIds = new Set(students.map((s) => s._id.toString()));
    const classStudentCounts = {};
    students.forEach((s) => {
      const cid = s.class.toString();
      classStudentCounts[cid] = (classStudentCounts[cid] || 0) + 1;
    });

    const classAttendanceStats = {};
    const seenStudentClass = new Set();

    attendanceRecords.forEach((rec) => {
      const sid = rec.student.toString();
      const cid = rec.class.toString();
      const pairKey = `${sid}:${cid}`;
      if (!activeStudentIds.has(sid) || seenStudentClass.has(pairKey)) return;
      seenStudentClass.add(pairKey);

      if (!classAttendanceStats[cid]) {
        classAttendanceStats[cid] = { present: 0, absent: 0 };
      }
      if (rec.status === "Present") classAttendanceStats[cid].present += 1;
      else if (rec.status === "Absent") classAttendanceStats[cid].absent += 1;
    });

    let totalStudents = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let markedClasses = 0;

    const classBreakdown = classes.map((cls) => {
      const cid = cls._id.toString();
      const total = classStudentCounts[cid] || 0;
      const present = classAttendanceStats[cid]?.present || 0;
      const absent = classAttendanceStats[cid]?.absent || 0;
      const marked = present + absent;
      const unmarked = Math.max(0, total - marked);
      const percentage =
        marked > 0 ? Number(((present / marked) * 100).toFixed(1)) : 0;

      totalStudents += total;
      totalPresent += present;
      totalAbsent += absent;
      if (marked > 0) markedClasses += 1;

      let markingStatus = "pending";
      if (total === 0) markingStatus = "empty";
      else if (marked >= total) markingStatus = "completed";
      else if (marked > 0) markingStatus = "partial";

      return {
        classId: cls._id,
        name: cls.name,
        section: cls.section,
        fullName: `${cls.name} - ${cls.section}`,
        group: this._getClassGroup(cls.name),
        classTeacher: cls.teacherLabel || null,
        totalStudents: total,
        present,
        absent,
        unmarked,
        percentage,
        status: markingStatus,
      };
    });

    const totalMarked = totalPresent + totalAbsent;
    const totalUnmarked = Math.max(0, totalStudents - totalMarked);
    const overallPercentage =
      totalMarked > 0
        ? Number(((totalPresent / totalMarked) * 100).toFixed(1))
        : 0;

    return {
      schoolName: settings?.schoolName || "School Attendance System",
      session,
      date: dateStr,
      dayName,
      isWorkingDay,
      isNonWorkingDay,
      isHoliday,
      holiday: holiday
        ? { name: holiday.name, type: holiday.type, description: holiday.description }
        : null,
      summary: {
        totalClasses: classes.length,
        markedClasses,
        pendingClasses: Math.max(0, classes.length - markedClasses),
        totalStudents,
        present: totalPresent,
        absent: totalAbsent,
        unmarked: totalUnmarked,
        attendancePercentage: overallPercentage,
      },
      classes: classBreakdown,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  READ-ONLY ENDPOINT 5: SINGLE CLASS ROSTER & ATTENDANCE BY DATE
  // ═══════════════════════════════════════════════════════════════
  async getClassAttendance({ classId, date }) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throwError("Invalid classId.", 400);
    }

    const cls = await Class.findById(classId)
      .populate("session", "_id name startDate endDate isActive")
      .lean();
    if (!cls) throwError("Class not found.", 404);

    const { dateStr, start, end } = this._getDayBounds(date);

    const [students, records, holiday] = await Promise.all([
      Student.find({
        class: cls._id,
        status: "Active",
        isActive: true,
      })
        .select("_id scholarNumber name fatherName gender section")
        .sort({ name: 1 })
        .lean(),
      Attendance.find({
        class: cls._id,
        date: { $gte: start, $lte: end },
      })
        .select("student status markedAt")
        .lean(),
      Holiday.isHoliday(start, cls.session?._id || cls.session),
    ]);

    const recordMap = new Map(
      records.map((r) => [r.student.toString(), r]),
    );

    let present = 0;
    let absent = 0;

    const studentList = students.map((s) => {
      const rec = recordMap.get(s._id.toString());
      const status = rec?.status || "Unmarked";
      if (status === "Present") present += 1;
      else if (status === "Absent") absent += 1;

      return {
        studentId: s._id,
        scholarNumber: s.scholarNumber,
        name: s.name,
        fatherName: s.fatherName,
        gender: s.gender,
        section: s.section,
        status,
        markedAt: rec?.markedAt || null,
      };
    });

    const total = students.length;
    const marked = present + absent;
    const unmarked = Math.max(0, total - marked);
    const percentage =
      marked > 0 ? Number(((present / marked) * 100).toFixed(1)) : 0;

    return {
      date: dateStr,
      isHoliday: Boolean(holiday && !holiday.allowAttendance),
      holiday: holiday ? { name: holiday.name, type: holiday.type } : null,
      class: {
        _id: cls._id,
        name: cls.name,
        section: cls.section,
        fullName: `${cls.name} - ${cls.section}`,
        classTeacher: cls.teacherLabel || null,
        session: cls.session,
      },
      summary: {
        totalStudents: total,
        present,
        absent,
        unmarked,
        attendancePercentage: percentage,
      },
      students: studentList,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  READ-ONLY ENDPOINT 6: PAGINATED ATTENDANCE RECORDS (FILTERABLE)
  // ═══════════════════════════════════════════════════════════════
  async getAttendanceRecords({
    date,
    from,
    to,
    classId,
    status,
    scholarNumber,
    search,
    sessionId,
    page = 1,
    limit = 50,
  }) {
    const session = await this._resolveSession(sessionId);
    const filter = { session: session._id };

    if (date) {
      const { start, end } = this._getDayBounds(date);
      filter.date = { $gte: start, $lte: end };
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = this._getDayBounds(from).start;
      if (to) filter.date.$lte = this._getDayBounds(to).end;
    }

    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        throwError("Invalid classId.", 400);
      }
      filter.class = classId;
    }

    if (status) {
      const normalized =
        status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      if (!["Present", "Absent"].includes(normalized)) {
        throwError("Invalid status filter. Use Present or Absent.", 400);
      }
      filter.status = normalized;
    }

    if (scholarNumber || search) {
      const studentFilter = { session: session._id };
      if (scholarNumber) {
        studentFilter.scholarNumber = String(scholarNumber).trim().toUpperCase();
      } else if (search) {
        const escaped = String(search)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        studentFilter.$or = [
          { name: { $regex: escaped, $options: "i" } },
          { scholarNumber: { $regex: escaped, $options: "i" } },
        ];
      }
      const matchedStudents = await Student.find(studentFilter)
        .select("_id")
        .lean();
      filter.student = { $in: matchedStudents.map((s) => s._id) };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .select("student class date status markedAt")
        .populate("student", "scholarNumber name fatherName gender section status")
        .populate("class", "name section")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    const formatted = records.map((r) => ({
      date: this._toIstDateString(r.date),
      status: r.status,
      markedAt: r.markedAt || null,
      student: r.student
        ? {
            studentId: r.student._id,
            scholarNumber: r.student.scholarNumber,
            name: r.student.name,
            fatherName: r.student.fatherName,
            gender: r.student.gender,
            section: r.student.section,
          }
        : null,
      class: r.class
        ? {
            classId: r.class._id,
            name: r.class.name,
            section: r.class.section,
            fullName: `${r.class.name} - ${r.class.section}`,
          }
        : null,
    }));

    return {
      records: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum * limitNum < total,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  READ-ONLY ENDPOINT 7: INDIVIDUAL STUDENT ATTENDANCE BY SCHOLAR NO
  // ═══════════════════════════════════════════════════════════════
  async getStudentAttendance({ scholarNumber, from, to, month, year, sessionId }) {
    if (!scholarNumber || !String(scholarNumber).trim()) {
      throwError("Scholar number is required.", 400);
    }

    const normalizedScholar = String(scholarNumber).trim().toUpperCase();
    const studentQuery = { scholarNumber: normalizedScholar };
    if (sessionId) {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        throwError("Invalid sessionId.", 400);
      }
      studentQuery.session = sessionId;
    }

    const student = await Student.findOne(studentQuery)
      .select(
        "_id scholarNumber name fatherName gender class section session status",
      )
      .populate("class", "_id name section teacherLabel")
      .populate("session", "_id name startDate endDate isActive")
      .lean();

    if (!student) {
      throwError(`Student with scholar number '${normalizedScholar}' not found.`, 404);
    }

    const attFilter = {
      student: student._id,
      session: student.session?._id || student.session,
    };

    if (month && year) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) {
        throwError("Invalid month or year.", 400);
      }
      const startStr = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const endStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      attFilter.date = {
        $gte: new Date(`${startStr}T00:00:00.000Z`),
        $lte: new Date(`${endStr}T23:59:59.999Z`),
      };
    } else if (from || to) {
      attFilter.date = {};
      if (from) attFilter.date.$gte = this._getDayBounds(from).start;
      if (to) attFilter.date.$lte = this._getDayBounds(to).end;
    }

    const records = await Attendance.find(attFilter)
      .select("date status markedAt")
      .sort({ date: -1 })
      .lean();

    let present = 0;
    let absent = 0;
    const history = records.map((r) => {
      if (r.status === "Present") present += 1;
      else if (r.status === "Absent") absent += 1;
      return {
        date: this._toIstDateString(r.date),
        status: r.status,
        markedAt: r.markedAt || null,
      };
    });

    const totalMarked = present + absent;
    const attendancePercentage =
      totalMarked > 0 ? Number(((present / totalMarked) * 100).toFixed(1)) : 0;

    return {
      student: {
        studentId: student._id,
        scholarNumber: student.scholarNumber,
        name: student.name,
        fatherName: student.fatherName,
        gender: student.gender,
        status: student.status,
        section: student.section,
        class: student.class
          ? {
              classId: student.class._id,
              name: student.class.name,
              section: student.class.section,
              fullName: `${student.class.name} - ${student.class.section}`,
              classTeacher: student.class.teacherLabel || null,
            }
          : null,
        session: student.session || null,
      },
      summary: {
        totalDaysMarked: totalMarked,
        present,
        absent,
        attendancePercentage,
      },
      history,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  READ-ONLY ENDPOINT 8: MONTHLY SCHOOL & CLASS SUMMARY
  // ═══════════════════════════════════════════════════════════════
  async getMonthlySummary({ year, month, sessionId }) {
    const session = await this._resolveSession(sessionId);
    const now = new Date();
    const y = parseInt(year, 10) || now.getFullYear();
    const m = parseInt(month, 10) || now.getMonth() + 1;

    if (m < 1 || m > 12 || y < 2000 || y > 2100) {
      throwError("Invalid month or year.", 400);
    }

    const startStr = `${y}-${String(m).padStart(2, "0")}-01`;
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const endStr = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    const monthStart = new Date(`${startStr}T00:00:00.000Z`);
    const monthEnd = new Date(`${endStr}T23:59:59.999Z`);

    const classes = this._sortClasses(
      await Class.find({
        session: session._id,
        isArchived: false,
      })
        .select("_id name section teacherLabel")
        .lean(),
    );
    const classIds = classes.map((c) => c._id);

    const [students, records] = await Promise.all([
      Student.find({
        class: { $in: classIds },
        status: "Active",
        isActive: true,
      })
        .select("_id class")
        .lean(),
      Attendance.find({
        class: { $in: classIds },
        date: { $gte: monthStart, $lte: monthEnd },
      })
        .select("student class date status")
        .lean(),
    ]);

    const activeStudentIds = new Set(students.map((s) => s._id.toString()));
    const studentCountMap = {};
    students.forEach((s) => {
      const cid = s.class.toString();
      studentCountMap[cid] = (studentCountMap[cid] || 0) + 1;
    });

    const classStats = {};
    records.forEach((r) => {
      const sid = r.student.toString();
      if (!activeStudentIds.has(sid)) return;
      const cid = r.class.toString();
      if (!classStats[cid]) {
        classStats[cid] = {
          present: 0,
          absent: 0,
          daysMarked: new Set(),
        };
      }
      if (r.status === "Present") classStats[cid].present += 1;
      else if (r.status === "Absent") classStats[cid].absent += 1;
      classStats[cid].daysMarked.add(this._toIstDateString(r.date));
    });

    let overallPresent = 0;
    let overallAbsent = 0;

    const classSummaries = classes.map((cls) => {
      const cid = cls._id.toString();
      const st = classStats[cid] || {
        present: 0,
        absent: 0,
        daysMarked: new Set(),
      };
      const totalMarked = st.present + st.absent;
      overallPresent += st.present;
      overallAbsent += st.absent;

      return {
        classId: cls._id,
        name: cls.name,
        section: cls.section,
        fullName: `${cls.name} - ${cls.section}`,
        group: this._getClassGroup(cls.name),
        classTeacher: cls.teacherLabel || null,
        totalStudents: studentCountMap[cid] || 0,
        daysAttendanceTaken: st.daysMarked.size,
        presentCount: st.present,
        absentCount: st.absent,
        attendancePercentage:
          totalMarked > 0
            ? Number(((st.present / totalMarked) * 100).toFixed(1))
            : 0,
      };
    });

    const overallTotal = overallPresent + overallAbsent;

    return {
      session,
      year: y,
      month: m,
      period: `${y}-${String(m).padStart(2, "0")}`,
      summary: {
        totalClasses: classes.length,
        totalStudents: students.length,
        presentCount: overallPresent,
        absentCount: overallAbsent,
        attendancePercentage:
          overallTotal > 0
            ? Number(((overallPresent / overallTotal) * 100).toFixed(1))
            : 0,
      },
      classes: classSummaries,
    };
  }
}

module.exports = new ExternalApiService();
