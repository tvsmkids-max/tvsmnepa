"use strict";

const Student = require("../models/Student.model");

class StudentRepository {
  async findAll(
    filter = {},
    { page = 1, limit = 20, sort = "rollNumber", populate = "" } = {},
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Student.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(populate)
        .lean(),
      Student.countDocuments(filter),
    ]);
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id, populate = "") {
    return Student.findById(id).populate(populate).lean();
  }

  async findByScholarNumber(scholarNumber) {
    return Student.findOne({
      scholarNumber: scholarNumber.toUpperCase(),
    }).lean();
  }

  async create(data) {
    const student = new Student(data);
    await student.save();
    return student.toObject();
  }

  async updateById(id, data) {
    return Student.findByIdAndUpdate(
      id,
      { $set: data },
      {
        new: true,
        runValidators: true,
      },
    ).lean();
  }

  async deleteById(id) {
    return Student.findByIdAndDelete(id).lean();
  }

  async search(query, filter = {}) {
    return Student.find({
      ...filter,
      $or: [
        { scholarNumber: new RegExp(query, "i") },
        { rollNumber: new RegExp(query, "i") },
        { name: new RegExp(query, "i") },
        { fatherName: new RegExp(query, "i") },
        { mobile: new RegExp(query, "i") },
      ],
    })
      .limit(20)
      .populate("class", "name section")
      .lean();
  }

  async count(filter = {}) {
    return Student.countDocuments(filter);
  }

  async countByStatus(sessionId) {
    return Student.aggregate([
      { $match: { session: sessionId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
  }

  async countByClass(sessionId) {
    return Student.aggregate([
      {
        $match: {
          session: sessionId,
          status: "Active",
        },
      },
      {
        $group: {
          _id: "$class",
          count: { $sum: 1 },
        },
      },
    ]);
  }

  // ─── BULK OPERATIONS ───

  /**
   * Find multiple students by IDs
   */
  async findByIds(ids) {
    return Student.find({ _id: { $in: ids } }).lean();
  }

  /**
   * Bulk soft delete — sets isActive: false, status: 'Inactive'
   */
  async bulkSoftDelete(ids, statusRemark = "Bulk soft-deleted") {
    return Student.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          isActive: false,
          status: "Inactive",
          statusRemark,
          statusDate: new Date(),
        },
      },
    );
  }

  /**
   * Bulk hard delete — permanently removes students
   */
  async bulkHardDelete(ids) {
    return Student.deleteMany({ _id: { $in: ids } });
  }
}

module.exports = new StudentRepository();
