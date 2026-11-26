"use strict";
const test = require("node:test");
const assert = require("node:assert");
require("./helpers");
const escapeRegex = require("../utils/escapeRegex");

test("special characters are matched literally", () => {
  const re = new RegExp(escapeRegex("a.*(b"), "i");
  assert.ok(re.test("xx a.*(b yy"));
  assert.ok(!re.test("aXXXb"));
});

test("catastrophic patterns cannot run as regex", () => {
  const evil = "(a+)+$";
  const re = new RegExp(escapeRegex(evil), "i");
  const started = Date.now();
  re.test("a".repeat(40) + "!");
  assert.ok(Date.now() - started < 200);
});

test("input is capped and null-safe", () => {
  assert.strictEqual(escapeRegex("x".repeat(500)).length, 100);
  assert.strictEqual(escapeRegex(undefined), "");
});
