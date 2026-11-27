"use strict";

const EXAM_TYPES = Object.freeze({
  QUARTERLY: "quarterly",
  HALF_YEARLY: "half_yearly",
  ANNUAL: "annual",
});

const EXAM_STATUS = Object.freeze({
  DRAFT: "draft",
  CONFIGURATION_PENDING: "configuration_pending",
  SCHEDULED: "scheduled",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  MARKS_ENTRY_IN_PROGRESS: "marks_entry_in_progress",
  MARKS_SUBMITTED: "marks_submitted",
  RESULTS_PREPARED: "results_prepared",
  RESULTS_PUBLISHED: "results_published",
});

const EXAM_STATUS_LABELS = Object.freeze({
  draft: "Draft",
  configuration_pending: "Configuration Pending",
  scheduled: "Scheduled",
  ongoing: "Ongoing",
  completed: "Completed",
  marks_entry_in_progress: "Marks Entry In Progress",
  marks_submitted: "Marks Submitted",
  results_prepared: "Results Prepared",
  results_published: "Results Published",
});

// Allowed transitions. Backward moves exist only where an admin must be able
// to undo a step; later phases (marks entry, results) add their own guards.
const S = EXAM_STATUS;
const EXAM_TRANSITIONS = Object.freeze({
  [S.DRAFT]: [S.CONFIGURATION_PENDING],
  [S.CONFIGURATION_PENDING]: [S.DRAFT, S.SCHEDULED],
  [S.SCHEDULED]: [S.CONFIGURATION_PENDING, S.ONGOING],
  [S.ONGOING]: [S.COMPLETED, S.MARKS_ENTRY_IN_PROGRESS],
  [S.COMPLETED]: [S.MARKS_ENTRY_IN_PROGRESS],
  [S.MARKS_ENTRY_IN_PROGRESS]: [S.MARKS_SUBMITTED],
  [S.MARKS_SUBMITTED]: [S.MARKS_ENTRY_IN_PROGRESS, S.RESULTS_PREPARED],
  [S.RESULTS_PREPARED]: [S.MARKS_SUBMITTED, S.RESULTS_PUBLISHED],
  // Published results can only be withdrawn through the audited admin
  // "withdraw" action (reason required), never by a manual status change.
  [S.RESULTS_PUBLISHED]: [S.MARKS_SUBMITTED],
});

// Statuses an admin may set by hand in Phase 1. The marks/result statuses are
// reserved for the phases that own those workflows (6-8) so that an exam can
// never claim "Marks Submitted" without marks actually being submitted.
const MANUAL_STATUSES_PHASE1 = Object.freeze([
  S.DRAFT,
  S.CONFIGURATION_PENDING,
  S.SCHEDULED,
  S.ONGOING,
  S.COMPLETED,
]);

// Class/subject configuration (subjects, written/internal/oral/passing marks)
// may be changed at ANY status. Safety lives in examConfigGuard: a change that
// would lose or invalidate marks already entered is refused. Calculated results
// are versioned snapshots, so they are not rewritten; admin recalculates to apply.
const CONFIG_EDITABLE_STATUSES = Object.freeze(Object.values(S));

module.exports = {
  EXAM_TYPES,
  EXAM_TYPE_LIST: Object.values(EXAM_TYPES),
  EXAM_STATUS,
  EXAM_STATUS_LIST: Object.values(EXAM_STATUS),
  EXAM_STATUS_LABELS,
  EXAM_TRANSITIONS,
  MANUAL_STATUSES_PHASE1,
  CONFIG_EDITABLE_STATUSES,
};
