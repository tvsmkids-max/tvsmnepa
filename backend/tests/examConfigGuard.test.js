"use strict";
const test = require("node:test");
const assert = require("node:assert");
require("./helpers");
const { findConfigConflicts } = require("../services/exam/examConfigGuard");

const subj = (name, o = {}) => ({ name, nameKey: name.toLowerCase(), maxMarks: 100, passingMarks: 33, internalMax: 0, oralMax: 0, gradeOnly: false, ...o });
const st = (o) => new Map(Object.entries(o));

test("subjects without entered marks can change freely", () => {
  assert.deepStrictEqual(findConfigConflicts({
    existingSubjects: [subj("Hindi")],
    newSubjects: [subj("Hindi", { maxMarks: 50 }), subj("Art", { gradeOnly: true })],
    stats: st({}),
  }), []);
});

test("passing marks can always change", () => {
  assert.deepStrictEqual(findConfigConflicts({
    existingSubjects: [subj("Hindi")],
    newSubjects: [subj("Hindi", { passingMarks: 40 })],
    stats: st({ hindi: { count: 10, maxMarks: 95 } }),
  }), []);
});

test("subject with entered marks cannot be removed or renamed", () => {
  const p = findConfigConflicts({
    existingSubjects: [subj("Hindi")],
    newSubjects: [subj("Hindi Grammar")],
    stats: st({ hindi: { count: 3, maxMarks: 50 } }),
  });
  assert.strictEqual(p.length, 1);
  assert.match(p[0], /cannot be removed or renamed/);
});

test("lowering the maximum below an entered mark is blocked", () => {
  const p = findConfigConflicts({
    existingSubjects: [subj("Hindi")],
    newSubjects: [subj("Hindi", { maxMarks: 80 })],
    stats: st({ hindi: { count: 3, maxMarks: 90 } }),
  });
  assert.strictEqual(p.length, 1);
});

test("lowering the maximum is fine when entered marks still fit", () => {
  assert.deepStrictEqual(findConfigConflicts({
    existingSubjects: [subj("Hindi")],
    newSubjects: [subj("Hindi", { maxMarks: 80 })],
    stats: st({ hindi: { count: 3, maxMarks: 70 } }),
  }), []);
});

test("internal and oral limits are checked separately; written limit excludes them", () => {
  const existing = [subj("Science", { internalMax: 20, oralMax: 10 })];
  const stats = st({ science: { count: 5, maxMarks: 60, maxInternal: 18, maxOral: 9 } });
  assert.deepStrictEqual(findConfigConflicts({ existingSubjects: existing, newSubjects: [subj("Science", { internalMax: 20, oralMax: 10 })], stats }), []);
  assert.strictEqual(findConfigConflicts({ existingSubjects: existing, newSubjects: [subj("Science", { internalMax: 15, oralMax: 10 })], stats }).length, 1);
  assert.strictEqual(findConfigConflicts({ existingSubjects: existing, newSubjects: [subj("Science", { internalMax: 20, oralMax: 5 })], stats }).length, 1);
  // internal+oral grew to 40, written max falls to 60 -> still fits 60
  assert.deepStrictEqual(findConfigConflicts({ existingSubjects: existing, newSubjects: [subj("Science", { internalMax: 30, oralMax: 10 })], stats }), []);
  // grew to 50, written max 50 < 60 entered
  assert.strictEqual(findConfigConflicts({ existingSubjects: existing, newSubjects: [subj("Science", { internalMax: 40, oralMax: 10 })], stats }).length, 1);
});

test("switching between marks and grade-only is blocked once entries exist", () => {
  const p = findConfigConflicts({
    existingSubjects: [subj("Art", { gradeOnly: true, maxMarks: 0 })],
    newSubjects: [subj("Art")],
    stats: st({ art: { count: 2 } }),
  });
  assert.strictEqual(p.length, 1);
});
