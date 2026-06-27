"use strict";

const BaseRepository = require("./base.repository");
const User = require("../models/User.model");

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email, includePassword = false) {
    const query = User.findOne({ email: email.toLowerCase() });
    if (includePassword) {
      query.select("+password +refreshTokens +loginAttempts +lockUntil");
    }
    return query.lean();
  }

  async findByIdWithAuth(id) {
    return User.findById(id)
      .select("+password +refreshTokens +loginAttempts +lockUntil")
      .lean();
  }

  async addRefreshToken(userId, token) {
    return User.findByIdAndUpdate(
      userId,
      { $push: { refreshTokens: token } },
      { new: true },
    );
  }

  async removeRefreshToken(userId, token) {
    return User.findByIdAndUpdate(
      userId,
      { $pull: { refreshTokens: token } },
      { new: true },
    );
  }

  async clearRefreshTokens(userId) {
    return User.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });
  }

  async updatePassword(userId, hashedPassword) {
    return User.findByIdAndUpdate(userId, {
      $set: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        refreshTokens: [],
      },
    });
  }

  async getActiveUsers(role = null) {
    const filter = { isActive: true };
    if (role) filter.role = role;
    return User.find(filter).select("-password").lean();
  }
}

module.exports = new UserRepository();
