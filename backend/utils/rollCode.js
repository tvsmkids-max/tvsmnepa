"use strict";

/**
 * Display roll number: [section letter] + class number + 2-digit serial.
 *   10th      -> 1001, 1002 ...   8th -> 801, 802 ...   3rd A -> A301, A302 ...
 * The stored `rollNumber` stays the plain serial (1, 2, 3 ...) so ordering and
 * uniqueness keep working; this is only how the number is shown and printed.
 * Classes without a number in their name use their first letters (NUR -> NUR01).
 */
const classToken = (name) => {
  const digits = String(name || "").match(/\d+/);
  if (digits) return String(parseInt(digits[0], 10));
  return String(name || "").replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
};

const sectionToken = (section) => {
  const s = String(section || "").trim();
  return s && s !== "-" ? s.toUpperCase() : "";
};

const rollCode = (cls, serial) => {
  if (serial === null || serial === undefined || serial === "") return "";
  const n = Number(serial);
  return `${sectionToken(cls?.section)}${classToken(cls?.name)}${String(n).padStart(2, "0")}`;
};

module.exports = { rollCode, classToken, sectionToken };
