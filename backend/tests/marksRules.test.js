"use strict";
const test = require("node:test");
const assert = require("node:assert");
require("./helpers");
const { normalizeEntry, componentMax, isEntered, GRADES } = require("../services/exam/examMarksRules");

const plain = { name: "Maths", maxMarks: 100 };
const comp = { name: "Science", maxMarks: 100, internalMax: 20, oralMax: 10 };
const gradeOnly = { name: "Art", gradeOnly: true };

test("normal subject accepts 0..max and rejects outside", () => {
  assert.strictEqual(normalizeEntry(plain, { attendance: "present", marks: 100 }, "S").problems.length, 0);
  assert.strictEqual(normalizeEntry(plain, { attendance: "present", marks: 0 }, "S").value.marks, 0);
  assert.ok(normalizeEntry(plain, { attendance: "present", marks: 101 }, "S").problems.length);
  assert.ok(normalizeEntry(plain, { attendance: "present", marks: -1 }, "S").problems.length);
});

test("absent students cannot carry marks or a grade", () => {
  assert.ok(normalizeEntry(plain, { attendance: "absent", marks: 5 }, "S").problems.length);
  assert.ok(normalizeEntry(gradeOnly, { attendance: "absent", grade: "A" }, "S").problems.length);
  const ok = normalizeEntry(plain, { attendance: "absent" }, "S");
  assert.strictEqual(ok.problems.length, 0);
  assert.strictEqual(ok.value.marks, null);
});

test("component subject splits written/internal/oral and totals only when complete", () => {
  assert.deepStrictEqual(componentMax(comp), { written: 70, internal: 20, oral: 10 });
  const partial = normalizeEntry(comp, { attendance: "present", marks: 60, internalMarks: 15 }, "S");
  assert.strictEqual(partial.value.marks, null);
  const full = normalizeEntry(comp, { attendance: "present", marks: 60, internalMarks: 15, oralMarks: 8 }, "S");
  assert.strictEqual(full.value.marks, 83);
  assert.ok(normalizeEntry(comp, { attendance: "present", marks: 71 }, "S").problems.length);
  assert.ok(normalizeEntry(comp, { attendance: "present", internalMarks: 21 }, "S").problems.length);
});

test("subjects without components reject internal/oral marks", () => {
  assert.ok(normalizeEntry(plain, { attendance: "present", marks: 50, internalMarks: 5 }, "S").problems.length);
});

test("grade-only subjects take a valid grade and no marks", () => {
  for (const g of GRADES) assert.strictEqual(normalizeEntry(gradeOnly, { attendance: "present", grade: g }, "S").problems.length, 0);
  assert.ok(normalizeEntry(gradeOnly, { attendance: "present", grade: "Z" }, "S").problems.length);
  assert.ok(normalizeEntry(gradeOnly, { attendance: "present", marks: 5 }, "S").problems.length);
  assert.ok(normalizeEntry(plain, { attendance: "present", grade: "A" }, "S").problems.length);
});

test("isEntered counts absent, graded or marked rows only", () => {
  assert.ok(isEntered({ attendance: "absent" }));
  assert.ok(isEntered({ attendance: "present", marks: 0 }));
  assert.ok(!isEntered({ attendance: "present" }));
});
