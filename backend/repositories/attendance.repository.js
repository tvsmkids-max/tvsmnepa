"use strict";

const Attendance = require("../models/Attendance.model");
const mongoose = require("mongoose");

class AttendanceRepository {
  /**
   * Normalize incoming date WITHOUT setHours (which breaks IST UTC midnights).
   * Service already passes Asia/Kolkata-locked YYYY-MM-DDT00:00:00.000Z.
   */
  _asDay(dateInput) {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date) {
      return new Date(dateInput.getTime());
    }
    if (
      typeof dateInput === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ) {
      return new Date(`${dateInput}T00:00:00.000Z`);
    }
    return new Date(dateInput);
  }

  _dayRange(dateInput) {
    const start = this._asDay(dateInput);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }

  async findByClassAndDate(classId, date) {
    const { start, end } = this._dayRange(date);
    return Attendance.find({
      class: classId,
      date: { $gte: start, $lte: end },
    })
      .populate("student", "name scholarNumber status")
      .populate("markedBy", "name")
      .populate("editedBy", "name")
      .lean();
  }

  async findByStudentAndRange(studentId, dateFrom, dateTo) {
    const filter = { student: studentId };
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = this._asDay(dateFrom);
      if (dateTo) {
        const to = this._asDay(dateTo);
        to.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }
    return Attendance.find(filter)
      .sort("-date")
      .populate("markedBy", "name role")
      .populate("editedBy", "name role")
      .populate("class", "name section")
      .lean();
  }

  /**
   * ✅ CRITICAL FIX: Do NOT call setHours(0,0,0,0) on already-normalized IST dates.
   * That shifted dates by -5.5h on servers and made getSheet miss all records.
   */
  async upsertMany(records) {
    const ops = records.map((r) => {
      const date = this._asDay(r.date);

      return {
        updateOne: {
          filter: {
            student: r.student,
            date,
          },
          update: {
            $set: {
              status: r.status,
              class: r.class,
              session: r.session,
              date,
              markedBy: r.markedBy,
              markedAt: new Date(),
              isLocked: false,
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    return Attendance.bulkWrite(ops);
  }

  async editAttendance(id, status, editedBy, editReason) {
    return Attendance.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          editedBy,
          editedAt: new Date(),
          editReason: editReason || "",
        },
      },
      { new: true },
    ).lean();
  }

  async lockByClassAndDate(classId, date) {
    const { start, end } = this._dayRange(date);
    return Attendance.updateMany(
      { class: classId, date: { $gte: start, $lte: end } },
      { $set: { isLocked: true } },
    );
  }

  async unlockByClassAndDate(classId, date) {
    const { start, end } = this._dayRange(date);
    return Attendance.updateMany(
      { class: classId, date: { $gte: start, $lte: end } },
      { $set: { isLocked: false } },
    );
  }

  async isLocked(classId, date) {
    const { start, end } = this._dayRange(date);
    const record = await Attendance.findOne({
      class: classId,
      date: { $gte: start, $lte: end },
      isLocked: true,
    }).lean();
    return !!record;
  }

  async getStatsByClassAndDate(classId, date) {
    const { start, end } = this._dayRange(date);
    const result = await Attendance.aggregate([
      {
        $match: {
          class: new mongoose.Types.ObjectId(classId),
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const stats = { Present: 0, Absent: 0, total: 0, isLocked: false };
    result.forEach((r) => {
      stats[r._id] = r.count;
      stats.total += r.count;
    });
    stats.isLocked = await this.isLocked(classId, date);
    return stats;
  }

  async getAttendancePercentage(studentId, fromDate, toDate) {
    const filter = { student: new mongoose.Types.ObjectId(studentId) };

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = this._asDay(fromDate);
      if (toDate) {
        const to = this._asDay(toDate);
        to.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }

    const result = await Attendance.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const stats = { Present: 0, Absent: 0, total: 0, percentage: 0 };
    result.forEach((r) => {
      if (r._id === "Present") stats.Present = r.count;
      if (r._id === "Absent") stats.Absent = r.count;
      stats.total += r.count;
    });

    if (stats.total > 0) {
      stats.percentage = Math.round((stats.Present / stats.total) * 100);
    }

    return stats;
  }

  async getPendingClasses(sessionId, date) {
    const Class = require("../models/Class.model");
    const { start, end } = this._dayRange(date);

    const classes = await Class.find({
      session: sessionId,
      isArchived: false,
    }).lean();

    const result = [];
    for (const cls of classes) {
      const count = await Attendance.countDocuments({
        class: cls._id,
        date: { $gte: start, $lte: end },
      });
      if (count === 0) {
        result.push(cls);
      }
    }
    return result;
  }
}

module.exports = new AttendanceRepository();
