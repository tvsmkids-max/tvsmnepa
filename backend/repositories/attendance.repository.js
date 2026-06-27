"use strict";

const Attendance = require("../models/Attendance.model");

class AttendanceRepository {
  async findByClassAndDate(classId, date) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return Attendance.find({ class: classId, date: day })
      .populate("student", "name rollNumber scholarNumber status")
      .populate("markedBy", "name")
      .populate("editedBy", "name")
      .lean();
  }
  async findByStudentAndRange(studentId, dateFrom, dateTo) {
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
    return Attendance.find(filter)
      .sort("-date")
      .populate("markedBy", "name email role")
      .populate("editedBy", "name email role")
      .populate("class", "name section")
      .lean();
  }
  async upsertMany(records) {
    const ops = records.map((r) => {
      const date = new Date(r.date);
      date.setHours(0, 0, 0, 0);
      return {
        updateOne: {
          filter: { student: r.student, date },
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
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return Attendance.updateMany(
      { class: classId, date: day },
      { $set: { isLocked: true } },
    );
  }

  async unlockByClassAndDate(classId, date) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return Attendance.updateMany(
      { class: classId, date: day },
      { $set: { isLocked: false } },
    );
  }

  async isLocked(classId, date) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const record = await Attendance.findOne({
      class: classId,
      date: day,
      isLocked: true,
    }).lean();
    return !!record;
  }

  async getStatsByClassAndDate(classId, date) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const result = await Attendance.aggregate([
      {
        $match: {
          class: new (require("mongoose").Types.ObjectId)(classId),
          date: day,
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const stats = { Present: 0, Absent: 0, total: 0, isLocked: false };
    result.forEach((r) => {
      stats[r._id] = r.count;
      stats.total += r.count;
    });
    stats.isLocked = await this.isLocked(classId, day);
    return stats;
  }

  async getAttendancePercentage(studentId, fromDate, toDate) {
    const mongoose = require("mongoose");
    const filter = { student: new mongoose.Types.ObjectId(studentId) };

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        filter.date.$gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }

    const result = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
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
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    const classes = await Class.find({
      session: sessionId,
      isArchived: false,
    }).lean();

    const result = [];
    for (const cls of classes) {
      const count = await Attendance.countDocuments({
        class: cls._id,
        date: day,
      });
      if (count === 0) {
        result.push(cls);
      }
    }
    return result;
  }
}

module.exports = new AttendanceRepository();
