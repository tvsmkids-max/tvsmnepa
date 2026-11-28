"use strict";

const Owner = require("../models/Owner.model");
const { comparePassword, hashPassword, validatePasswordStrength } = require("../utils/passwordHelper");
const { signOwnerToken } = require("../utils/ownerJwt");

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const GENERIC = "Invalid username or password";

const publicOwner = (o) => ({ _id: o._id, name: o.name, username: o.username, lastLogin: o.lastLogin });

class OwnerService {
  async login({ username, password }) {
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      throw fail(GENERIC, 401);
    }
    const owner = await Owner.findOne({ username: username.trim().toLowerCase() }).select(
      "+password +loginAttempts +lockUntil",
    );
    if (!owner || !owner.isActive) throw fail(GENERIC, 401);
    if (owner.lockUntil && owner.lockUntil > Date.now()) {
      throw fail(`Account locked. Try again in ${Math.ceil((owner.lockUntil - Date.now()) / 60000)} minute(s)`, 423);
    }
    const ok = await comparePassword(password, owner.password);
    if (!ok) {
      const attempts = (owner.loginAttempts || 0) + 1;
      const update = { loginAttempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        update.lockUntil = new Date(Date.now() + LOCK_MS);
        update.loginAttempts = 0;
      }
      await Owner.updateOne({ _id: owner._id }, { $set: update });
      throw fail(GENERIC, 401);
    }
    await Owner.updateOne(
      { _id: owner._id },
      { $set: { loginAttempts: 0, lockUntil: null, lastLogin: new Date() } },
    );
    return { token: signOwnerToken(owner), owner: publicOwner(owner) };
  }

  async changePassword(ownerId, { currentPassword, newPassword }) {
    const owner = await Owner.findById(ownerId).select("+password");
    if (!owner || !(await comparePassword(String(currentPassword || ""), owner.password))) {
      throw fail("Current password is incorrect", 400);
    }
    const strength = validatePasswordStrength(String(newPassword || ""));
    if (!strength.isValid) throw fail(strength.errors.join(". "), 400);
    owner.password = await hashPassword(newPassword);
    // Tokens issued before this moment stop working.
    owner.passwordChangedAt = new Date(Date.now() + 1000);
    await owner.save();
    return signOwnerToken(owner);
  }
}

module.exports = new OwnerService();
module.exports.publicOwner = publicOwner;
