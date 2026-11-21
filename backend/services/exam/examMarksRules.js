"use strict";

// Shared marks rules (teacher entry, admin correction, results).
//  - Normal subject:      one mark, 0..maxMarks.
//  - Component subject:   internalMax and/or oralMax > 0 -> Written
//                         (maxMarks - internalMax - oralMax) + Internal + Oral.
//                         Total = sum of the parts the subject has.
//  - Grade-only subject:  no marks; a grade from GRADES. Never counted in
//                         totals/percentage and has no pass/fail.
const GRADES = Object.freeze(["A+", "A", "B", "C", "D"]);

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const has = (v) => v !== null && v !== undefined;

const componentMax = (s) => {
  const internal = s.internalMax || 0;
  const oral = s.oralMax || 0;
  return { written: round2((s.maxMarks || 0) - internal - oral), internal, oral };
};

// A row counts as entered once it can be scored: absent, graded, or complete.
const isEntered = (d) => d.attendance === "absent" || has(d.marks) || has(d.grade);

const checkNumber = (label, v, max, name, out) => {
  if (!Number.isFinite(v)) out.push(`${name}: ${label} must be a number`);
  else if (v < 0) out.push(`${name}: ${label} cannot be negative`);
  else if (v > max) out.push(`${name}: ${label} ${v} exceeds the maximum (${max})`);
};

/**
 * Validate one entry for a subject and return the values to store.
 * `partial` rows (a component still missing) are allowed while entering.
 */
const normalizeEntry = (subject, e, name) => {
  const problems = [];
  const base = { attendance: e.attendance, remarks: e.remarks || "" };
  const empty = { marks: null, writtenMarks: null, internalMarks: null, oralMarks: null, grade: null };

  if (subject.gradeOnly) {
    if (has(e.marks) || has(e.internalMarks) || has(e.oralMarks)) {
      problems.push(`${name}: ${subject.name} takes a grade, not marks`);
    }
    if (e.attendance === "absent" && has(e.grade)) {
      problems.push(`${name}: an absent student cannot have a grade`);
    } else if (has(e.grade) && !GRADES.includes(e.grade)) {
      problems.push(`${name}: grade must be one of ${GRADES.join(", ")}`);
    }
    return {
      problems,
      value: { ...base, ...empty, grade: e.attendance === "absent" ? null : e.grade ?? null },
    };
  }

  if (has(e.grade)) problems.push(`${name}: ${subject.name} does not take a grade`);
  if (e.attendance === "absent") {
    if (has(e.marks) || has(e.internalMarks) || has(e.oralMarks)) {
      problems.push(`${name}: an absent student cannot have marks`);
    }
    return { problems, value: { ...base, ...empty } };
  }

  const { written, internal, oral } = componentMax(subject);
  if (internal === 0 && oral === 0) {
    if (has(e.internalMarks)) problems.push(`${name}: ${subject.name} has no internal marks`);
    if (has(e.oralMarks)) problems.push(`${name}: ${subject.name} has no oral marks`);
    if (has(e.marks)) checkNumber("marks", e.marks, subject.maxMarks, name, problems);
    return {
      problems,
      value: { ...base, ...empty, marks: has(e.marks) ? e.marks : null },
    };
  }

  if (internal === 0 && has(e.internalMarks)) problems.push(`${name}: ${subject.name} has no internal marks`);
  if (oral === 0 && has(e.oralMarks)) problems.push(`${name}: ${subject.name} has no oral marks`);
  if (has(e.marks)) checkNumber("written marks", e.marks, written, name, problems);
  if (has(e.internalMarks) && internal > 0) checkNumber("internal marks", e.internalMarks, internal, name, problems);
  if (has(e.oralMarks) && oral > 0) checkNumber("oral marks", e.oralMarks, oral, name, problems);
  const w = has(e.marks) ? e.marks : null;
  const i = internal > 0 && has(e.internalMarks) ? e.internalMarks : null;
  const o = oral > 0 && has(e.oralMarks) ? e.oralMarks : null;
  const complete = w !== null && (internal === 0 || i !== null) && (oral === 0 || o !== null);
  return {
    problems,
    value: {
      ...base,
      grade: null,
      writtenMarks: w,
      internalMarks: i,
      oralMarks: o,
      // Total exists only once every part the subject has is entered.
      marks: complete && !problems.length ? round2(w + (i || 0) + (o || 0)) : null,
    },
  };
};

// Comparable snapshot used for change detection and audit before/after.
const snapshot = (d) => ({
  attendance: d.attendance,
  marks: d.marks ?? null,
  writtenMarks: d.writtenMarks ?? null,
  internalMarks: d.internalMarks ?? null,
  oralMarks: d.oralMarks ?? null,
  grade: d.grade ?? null,
  remarks: d.remarks || "",
});

const sameSnapshot = (a, b) =>
  a.attendance === b.attendance &&
  a.marks === b.marks &&
  a.writtenMarks === b.writtenMarks &&
  a.internalMarks === b.internalMarks &&
  a.oralMarks === b.oralMarks &&
  a.grade === b.grade &&
  a.remarks === b.remarks;

module.exports = { GRADES, round2, componentMax, isEntered, normalizeEntry, snapshot, sameSnapshot };
