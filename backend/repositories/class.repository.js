"use strict";

const Class = require("../models/Class.model");

class ClassRepository {
  async findAll(
    filter = {},
    {
      page = 1,
      limit = 50,
      sort = "displayOrder name section",
      populate = "",
    } = {},
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Class.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(populate)
        .lean(),
      Class.countDocuments(filter),
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
    return Class.findById(id).populate(populate).lean();
  }

  async findOne(filter, populate = "") {
    return Class.findOne(filter).populate(populate).lean();
  }

  async create(data) {
    const cls = new Class(data);
    await cls.save();
    return cls.toObject();
  }

  async updateById(id, data) {
    return Class.findByIdAndUpdate(
      id,
      { $set: data },
      {
        new: true,
        runValidators: true,
      },
    ).lean();
  }

  async deleteById(id) {
    return Class.findByIdAndDelete(id).lean();
  }

  async exists(filter) {
    const count = await Class.countDocuments(filter);
    return count > 0;
  }

  async count(filter = {}) {
    return Class.countDocuments(filter);
  }
}

module.exports = new ClassRepository();
