"use strict";

const userRepository = require("../repositories/user.repository");
const { hashPassword, comparePassword } = require("../utils/passwordHelper");
const {
  generateTokenPair,
  verifyRefreshToken,
  generateAccessToken,
} = require("../utils/jwtHelper");
const { createAuditLog } = require("../middlewares/audit.middleware");
const logger = require("../utils/logger");

class AuthService {
  async login({ email, password, req }) {
    const user = await userRepository.findByEmail(email, true);

    if (!user) {
      throw Object.assign(new Error("Invalid email or password"), {
        statusCode: 401,
      });
    }

    if (!user.isActive) {
      throw Object.assign(new Error("Your account has been deactivated"), {
        statusCode: 401,
      });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw Object.assign(
        new Error(`Account locked. Try again in ${minutesLeft} minute(s)`),
        { statusCode: 423 },
      );
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      const UserModel = require("../models/User.model");
      const userDoc = await UserModel.findById(user._id).select(
        "+loginAttempts +lockUntil",
      );
      await userDoc.incrementLoginAttempts();

      await createAuditLog({
        user: { _id: user._id, name: user.name, role: user.role },
        action: "LOGIN",
        module: "Auth",
        description: `Failed login attempt for ${email}`,
        req,
        status: "failed",
      });

      throw Object.assign(new Error("Invalid email or password"), {
        statusCode: 401,
      });
    }

    const UserModel = require("../models/User.model");
    const userDoc = await UserModel.findById(user._id).select("+loginAttempts");
    await userDoc.resetLoginAttempts();

    const tokens = generateTokenPair(user);

    await userRepository.addRefreshToken(user._id, tokens.refreshToken);

    await createAuditLog({
      user: { _id: user._id, name: user.name, role: user.role },
      action: "LOGIN",
      module: "Auth",
      description: `User ${user.email} logged in successfully`,
      req,
      status: "success",
    });

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };

    return { user: safeUser, tokens };
  }

  async logout({ userId, refreshToken, req, user }) {
    if (refreshToken) {
      await userRepository.removeRefreshToken(userId, refreshToken);
    }

    await createAuditLog({
      user,
      action: "LOGOUT",
      module: "Auth",
      description: `User ${user.email} logged out`,
      req,
    });

    return true;
  }

  async refreshAccessToken(refreshToken) {
    const { valid, payload, expired } = verifyRefreshToken(refreshToken);

    if (!valid) {
      throw Object.assign(
        new Error(
          expired
            ? "Refresh token expired. Please login again."
            : "Invalid refresh token",
        ),
        { statusCode: 401 },
      );
    }

    const user = await userRepository.findByIdWithAuth(payload.id);

    if (!user) {
      throw Object.assign(new Error("User not found"), { statusCode: 401 });
    }

    if (!user.isActive) {
      throw Object.assign(new Error("Account deactivated"), {
        statusCode: 401,
      });
    }

    if (!user.refreshTokens.includes(refreshToken)) {
      await userRepository.clearRefreshTokens(user._id);
      throw Object.assign(
        new Error("Token reuse detected. Please login again."),
        { statusCode: 401 },
      );
    }

    const newAccessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return { accessToken: newAccessToken };
  }

  async changePassword({ userId, currentPassword, newPassword, req, user }) {
    const userWithPass = await userRepository.findByIdWithAuth(userId);

    if (!userWithPass) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }

    const isMatch = await comparePassword(
      currentPassword,
      userWithPass.password,
    );

    if (!isMatch) {
      throw Object.assign(new Error("Current password is incorrect"), {
        statusCode: 400,
      });
    }

    if (await comparePassword(newPassword, userWithPass.password)) {
      throw Object.assign(
        new Error("New password cannot be the same as current password"),
        { statusCode: 400 },
      );
    }

    const hashed = await hashPassword(newPassword);
    await userRepository.updatePassword(userId, hashed);

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Auth",
      description: "Password changed successfully",
      req,
    });

    return true;
  }

  async getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }
    return user;
  }
}

module.exports = new AuthService();
