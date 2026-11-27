"use strict";
const test = require("node:test");
const assert = require("node:assert");
require("./helpers");
const ManagementAccess = require("../models/ManagementAccess.model");

// Tiny in-memory stand-in for the collection (no database).
const rows = [];
const matches = (doc, f) => {
  if (f.isActive !== undefined && doc.isActive !== f.isActive) return false;
  return f.$or.some((c) =>
    Object.entries(c).every(([k, v]) =>
      v && typeof v === "object" && "$ne" in v ? doc[k] !== v.$ne : doc[k] === v,
    ),
  );
};
const model = {
  hashKey: ManagementAccess.hashKey,
  findOne: (f) => ({ lean: async () => rows.find((d) => matches(d, f)) || null }),
};
const validate = (key) => ManagementAccess.validateAccess.call(model, key);

test("a hashed record opens only with the real key", async () => {
  rows.length = 0;
  const key = "RealKey123";
  rows.push({ _id: 1, isActive: true, keyHashed: true, secretKey: ManagementAccess.hashKey(key) });
  assert.ok(await validate(key));
  assert.strictEqual(await validate("wrong"), null);
});

test("a leaked hash cannot be replayed as a key", async () => {
  rows.length = 0;
  const hash = ManagementAccess.hashKey("RealKey123");
  rows.push({ _id: 1, isActive: true, keyHashed: true, secretKey: hash });
  assert.strictEqual(await validate(hash), null);
});

test("legacy plaintext links keep working until migrated", async () => {
  rows.length = 0;
  rows.push({ _id: 2, isActive: true, secretKey: "OldPlainKey" });
  assert.ok(await validate("OldPlainKey"));
});

test("revoked and expired links are refused", async () => {
  rows.length = 0;
  rows.push({ _id: 3, isActive: false, keyHashed: true, secretKey: ManagementAccess.hashKey("k1") });
  assert.strictEqual(await validate("k1"), null);
  rows.push({ _id: 4, isActive: true, keyHashed: true, expiresAt: new Date(Date.now() - 1000), secretKey: ManagementAccess.hashKey("k2") });
  assert.strictEqual(await validate("k2"), null);
});

test("hashing is stable and not reversible to the key", () => {
  const h = ManagementAccess.hashKey("abc");
  assert.strictEqual(h, ManagementAccess.hashKey("abc"));
  assert.strictEqual(h.length, 64);
  assert.ok(!h.includes("abc"));
});
