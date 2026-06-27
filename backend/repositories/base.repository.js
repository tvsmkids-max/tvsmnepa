"use strict";

/**
 * Base Repository - Generic CRUD operations
 * All entity repositories extend this class
 */
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id, populate = "") {
    return this.model.findById(id).populate(populate).lean();
  }

  async findOne(filter = {}, populate = "") {
    return this.model.findOne(filter).populate(populate).lean();
  }

  async findAll({
    filter = {},
    sort = { createdAt: -1 },
    page = 1,
    limit = 20,
    populate = "",
    select = "",
  } = {}) {
    const skip = (page - 1) * limit;
    const safLimit = Math.min(limit, 500);

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(safLimit)
        .populate(populate)
        .select(select)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page,
        limit: safLimit,
        total,
        totalPages: Math.ceil(total / safLimit),
        hasNext: page < Math.ceil(total / safLimit),
        hasPrev: page > 1,
      },
    };
  }

  async findAllWithoutPagination(
    filter = {},
    sort = { createdAt: -1 },
    populate = "",
  ) {
    return this.model.find(filter).sort(sort).populate(populate).lean();
  }

  async create(data) {
    const doc = new this.model(data);
    await doc.save();
    return doc.toObject();
  }

  async bulkCreate(dataArray) {
    return this.model.insertMany(dataArray, { ordered: false });
  }

  async updateById(id, data, options = { new: true, runValidators: true }) {
    return this.model.findByIdAndUpdate(id, { $set: data }, options).lean();
  }

  async updateOne(filter, data, options = { new: true, runValidators: true }) {
    return this.model.findOneAndUpdate(filter, { $set: data }, options).lean();
  }

  async updateMany(filter, data) {
    return this.model.updateMany(filter, { $set: data });
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id).lean();
  }

  async deleteMany(filter) {
    return this.model.deleteMany(filter);
  }

  async exists(filter) {
    const count = await this.model.countDocuments(filter);
    return count > 0;
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return this.model.aggregate(pipeline);
  }
}

module.exports = BaseRepository;
