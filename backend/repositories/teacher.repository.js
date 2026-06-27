"use strict";

const Teacher = require("../models/Teacher.model");

class TeacherRepository {
  async findAll(
    filter = {},
    { page = 1, limit = 20, sort = "-createdAt", populate = "" } = {},
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Teacher.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(populate)
        .lean(),
      Teacher.countDocuments(filter),
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
    return Teacher.findById(id).populate(populate).lean();
  }

  async findByUserId(userId) {
    return Teacher.findOne({ user: userId }).lean();
  }

  async findByEmployeeId(employeeId) {
    return Teacher.findOne({ employeeId: employeeId.toUpperCase() }).lean();
  }

  async create(data) {
    const teacher = new Teacher(data);
    await teacher.save();
    return teacher.toObject();
  }

  async updateById(id, data) {
    return Teacher.findByIdAndUpdate(
      id,
      { $set: data },
      {
        new: true,
        runValidators: true,
      },
    ).lean();
  }

  async deleteById(id) {
    return Teacher.findByIdAndDelete(id).lean();
  }

  async assignClasses(id, classIds) {
    return Teacher.findByIdAndUpdate(
      id,
      { $set: { assignedClasses: classIds } },
      { new: true },
    )
      .populate("assignedClasses")
      .lean();
  }

  async count(filter = {}) {
    return Teacher.countDocuments(filter);
  }
}

module.exports = new TeacherRepository();
