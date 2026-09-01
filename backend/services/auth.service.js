"use strict";

const User = require("../models/User.model");
const Class = require("../models/Class.model");
const userRepository = require("../repositories/user.repository");
const { hashPassword, comparePassword } = require("../utils/passwordHelper");
const {
  generateTokenPair,
  verifyRefreshToken,
  generateAccessToken,
} = require("../utils/jwtHelper");
const { createAuditLog } = require("../middlewares/audit.middleware");
const { getClassSortRank } = require("../utils/classSort");

class AuthService {
  async getLoginOptions() {
    const users = await User.find({ isActive: true })
      .select("_id name role linkedClass")
      .populate("linkedClass", "name section session teacherLabel")
      .lean();

    const options = [];

    users
      .filter((u) => u.role === "admin")
      .forEach((u) => {
        options.push({
          _id: u._id,
          name: u.name,
          role: "admin",
          displayName: "Admin",
        });
      });

    const classUsers = users
      .filter((u) => u.role === "class" && u.linkedClass)
      .map((u) => {
        const teacherSuffix = u.linkedClass.teacherLabel
          ? ` (${u.linkedClass.teacherLabel.toUpperCase()})`
          : "";
        return {
          _id: u._id,
          name: u.name,
          role: "class",
          displayName: `${u.linkedClass.name} - ${u.linkedClass.section}${teacherSuffix}`,
          sortRank: getClassSortRank(u.linkedClass.name),
          section: u.linkedClass.section,
        };
      })
      .sort((a, b) => {
        if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
        return (a.section || "").localeCompare(b.section || "");
      });

    options.push(...classUsers);
    return options;
  }

  async login({ userId, password, req }) {
    const user = await User.findById(userId)
      .select("+password +loginAttempts +lockUntil")
      .populate("linkedClass", "name section teacherLabel")
      .lean();

    if (!user) {
      throw Object.assign(new Error("Invalid account or credentials"), {
        statusCode: 401,
      });
    }

    if (!user.isActive) {
      throw Object.assign(new Error("This account has been deactivated"), {
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

    const credential = password != null ? String(password) : "";

    // ✅ NEW: Strict role-based credential enforcement
    if (user.role === "admin") {
      if (!credential || credential.length < 8) {
        throw Object.assign(
          new Error("Password is required for Admin (min 8 characters)"),
          { statusCode: 400 },
        );
      }
    } else if (user.role === "class") {
      if (!/^\d{5}$/.test(credential)) {
        throw Object.assign(new Error("Please enter a valid 5-digit PIN"), {
          statusCode: 400,
        });
      }
    } else {
      throw Object.assign(new Error("Invalid account role"), {
        statusCode: 401,
      });
    }

    const isMatch = await comparePassword(credential, user.password);

    if (!isMatch) {
      const userDoc = await User.findById(user._id).select(
        "+loginAttempts +lockUntil",
      );
      await userDoc.incrementLoginAttempts();

      await createAuditLog({
        user: { _id: user._id, name: user.name, role: user.role },
        action: "LOGIN",
        module: "Auth",
        description: `Failed login attempt for ${user.name}`,
        req,
        status: "failed",
      });

      throw Object.assign(new Error("Invalid account or credentials"), {
        statusCode: 401,
      });
    }

    const userDoc = await User.findById(user._id).select("+loginAttempts");
    await userDoc.resetLoginAttempts();

    const tokens = generateTokenPair({
      _id: user._id,
      name: user.name,
      role: user.role,
    });

    await userRepository.addRefreshToken(user._id, tokens.refreshToken);

    await createAuditLog({
      user: { _id: user._id, name: user.name, role: user.role },
      action: "LOGIN",
      module: "Auth",
      description: `${user.name} logged in successfully`,
      req,
      status: "success",
    });

    const safeUser = {
      _id: user._id,
      name: user.name,
      role: user.role,
      linkedClass: user.linkedClass
        ? user.linkedClass._id || user.linkedClass
        : null,
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
      description: `${user.name} logged out`,
      req,
    });
    return true;
  }

  async refreshAccessToken(refreshToken) {
    const { valid, payload, expired } = verifyRefreshToken(refreshToken);
    if (!valid) {
      throw Object.assign(
        new Error(
          expired ? "Session expired. Please login again." : "Invalid session",
        ),
        { statusCode: 401 },
      );
    }
    const user = await userRepository.findByIdWithAuth(payload.id);
    if (!user)
      throw Object.assign(new Error("Account not found"), { statusCode: 401 });
    if (!user.isActive)
      throw Object.assign(new Error("Account deactivated"), {
        statusCode: 401,
      });

    if (!user.refreshTokens.includes(refreshToken)) {
      await userRepository.clearRefreshTokens(user._id);
      throw Object.assign(
        new Error("Session reuse detected. Please login again."),
        { statusCode: 401 },
      );
    }

    const newAccessToken = generateAccessToken({
      id: user._id.toString(),
      role: user.role,
      name: user.name,
    });

    return { accessToken: newAccessToken };
  }

  async changePassword({ userId, currentPassword, newPassword, req, user }) {
    const userWithPass = await userRepository.findByIdWithAuth(userId);
    if (!userWithPass)
      throw Object.assign(new Error("Account not found"), { statusCode: 404 });

    const isMatch = await comparePassword(
      currentPassword,
      userWithPass.password,
    );
    if (!isMatch)
      throw Object.assign(new Error("Current credential is incorrect"), {
        statusCode: 400,
      });

    if (user.role === "class") {
      if (!/^\d{5}$/.test(newPassword))
        throw Object.assign(new Error("New PIN must be exactly 5 digits"), {
          statusCode: 400,
        });
    } else {
      if (newPassword.length < 8)
        throw Object.assign(
          new Error("New password must be at least 8 characters"),
          { statusCode: 400 },
        );
    }

    if (await comparePassword(newPassword, userWithPass.password)) {
      throw Object.assign(
        new Error("New credential cannot be the same as current"),
        { statusCode: 400 },
      );
    }

    const hashed = await hashPassword(newPassword);
    await userRepository.updatePassword(userId, hashed);

    await createAuditLog({
      user,
      action: "UPDATE",
      module: "Auth",
      description: "Credential changed successfully",
      req,
    });

    return true;
  }

  async getMe(userId) {
    const user = await User.findById(userId)
      .populate("linkedClass", "name section teacherLabel")
      .lean();
    if (!user)
      throw Object.assign(new Error("Account not found"), { statusCode: 404 });

    delete user.password;
    delete user.refreshTokens;
    delete user.loginAttempts;
    delete user.lockUntil;

    return user;
  }
}

module.exports = new AuthService();
