"use strict";

// Escapes user text so it is matched literally inside new RegExp(...).
// Prevents regex injection and catastrophic-backtracking (ReDoS) searches.
const escapeRegex = (value) =>
  String(value ?? "")
    .slice(0, 100)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = escapeRegex;
