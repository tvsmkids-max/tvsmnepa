"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { stub, fresh } = require("./helpers");

stub("config/env", { JWT_SECRET: "test-secret-1", JWT_REFRESH_SECRET: "x", JWT_EXPIRES_IN: "1d", JWT_REFRESH_EXPIRES_IN: "30d", BCRYPT_ROUNDS: 4 });
stub("utils/logger", { warn() {}, info() {}, error() {}, debug() {} });

const { signOwnerToken, verifyOwnerToken } = fresh("utils/ownerJwt");
const { generateAccessToken, verifyAccessToken } = fresh("utils/jwtHelper");
const { checkImageDataUrl } = fresh("utils/imageData");

const PNG = "data:image/png;base64,iVBORw0KGgo=";

test("owner token and school token cannot be swapped", () => {
  const ownerTok = signOwnerToken({ _id: "o1" });
  const schoolTok = generateAccessToken({ id: "u1", role: "admin" });
  assert.ok(verifyOwnerToken(ownerTok));
  assert.strictEqual(verifyOwnerToken(schoolTok), null);
  assert.strictEqual(verifyAccessToken(ownerTok).valid, false);
});

test("logo upload: only small png/jpeg/webp data URLs", () => {
  assert.strictEqual(checkImageDataUrl("", "Logo"), null);
  assert.strictEqual(checkImageDataUrl(PNG, "Logo"), PNG);
  for (const bad of ["data:image/svg+xml;base64,PHN2Zz4=", "http://x/y.png", "data:text/html;base64,AAAA", 5]) {
    assert.throws(() => checkImageDataUrl(bad, "Logo"), /PNG, JPEG or WebP/);
  }
  const big = "data:image/png;base64," + "A".repeat(600 * 1024);
  assert.throws(() => checkImageDataUrl(big, "Logo"), /too large/);
});

// ---- school service against an in-memory School stand-in (no database) ----
const rows = [];
class FakeSchool {
  constructor(d) {
    Object.assign(this, { status: "active", nameLines: [], ...d, _id: String(rows.length + 1) });
  }
  async save() {
    if (!rows.includes(this)) rows.push(this);
  }
  toObject() {
    return { ...this };
  }
  static async exists(f) {
    return rows.find((r) => r.code === f.code) ? { _id: 1 } : null;
  }
  static async findById(id) {
    return rows.find((r) => r._id === id) || null;
  }
}
FakeSchool.SCHOOL_STATUS = { ACTIVE: "active", SUSPENDED: "suspended" };
stub("models/School.model", FakeSchool);
const schools = fresh("services/school.service");

test("school create validates code, name and uniqueness", async () => {
  await assert.rejects(() => schools.create("o", { code: "a", name: "X" }), /2–12/);
  await assert.rejects(() => schools.create("o", { code: "TV SM", name: "X" }), /2–12/);
  await assert.rejects(() => schools.create("o", { code: "TVSM", name: "  " }), /name is required/);
  const s = await schools.create("o", { code: "tvsm", name: "TVSM School", udiseCode: "1", nameLines: ["A", "B"] });
  assert.strictEqual(s.code, "TVSM");
  await assert.rejects(() => schools.create("o", { code: "TVSM", name: "Again" }), /already used/);
  await assert.rejects(() => schools.create("o", { code: "ABC", name: "Z", nameLines: ["1", "2", "3"] }), /at most 2/);
  await assert.rejects(() => schools.create("o", { code: "ABD", name: "Z", logo: "data:image/svg+xml;base64,AAAA" }), /PNG, JPEG/);
});

test("school update never changes the login code", async () => {
  const id = rows[0]._id;
  const out = await schools.update("o", id, { code: "HACK", name: "Renamed" });
  assert.strictEqual(out.code, "TVSM");
  assert.strictEqual(out.name, "Renamed");
  await assert.rejects(() => schools.update("o", id, { name: "  " }), /name is required/);
});

// ---- owner login lockout ----
const owners = new Map();
const FakeOwner = {
  findOne: (f) => ({ select: async () => owners.get(f.username) || null }),
  updateOne: async (f, u) => Object.assign(owners.get("boss"), u.$set),
  findById: async () => owners.get("boss"),
};
stub("models/Owner.model", FakeOwner);
stub("utils/passwordHelper", {
  comparePassword: async (p, h) => h === `h:${p}`,
  hashPassword: async (p) => `h:${p}`,
  validatePasswordStrength: (p) => ({ isValid: p.length >= 8, errors: ["weak"] }),
});
const ownerSvc = fresh("services/owner.service");

test("owner login: generic errors, lock after 5 failures, success resets", async () => {
  owners.set("boss", { _id: "o1", name: "B", username: "boss", password: "h:Right#123", isActive: true, loginAttempts: 0, lockUntil: null });
  await assert.rejects(() => ownerSvc.login({ username: "nobody", password: "x" }), /Invalid username or password/);
  await assert.rejects(() => ownerSvc.login({ username: { $ne: "" }, password: "x" }), /Invalid username or password/);
  for (let i = 0; i < 5; i++) await assert.rejects(() => ownerSvc.login({ username: "boss", password: "bad" }), /Invalid username or password/);
  await assert.rejects(() => ownerSvc.login({ username: "boss", password: "Right#123" }), /locked/);
  owners.get("boss").lockUntil = null;
  const ok = await ownerSvc.login({ username: "boss", password: "Right#123" });
  assert.ok(verifyOwnerToken(ok.token));
  assert.strictEqual(owners.get("boss").loginAttempts, 0);
});
