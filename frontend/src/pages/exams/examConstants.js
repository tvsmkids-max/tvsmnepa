export const EXAM_TYPES = [
  { value: "quarterly", label: "Quarterly Examination" },
  { value: "half_yearly", label: "Half-Yearly Examination" },
  { value: "annual", label: "Annual Examination" },
];

export const EXAM_STATUS_LABELS = {
  draft: "Draft",
  configuration_pending: "Configuration Pending",
  scheduled: "Scheduled",
  ongoing: "Ongoing",
  completed: "Completed",
  marks_entry_in_progress: "Marks Entry In Progress",
  marks_submitted: "Marks Submitted",
  results_prepared: "Results Prepared",
  results_published: "Results Published",
};

export const EXAM_STATUS_COLORS = {
  draft: "default",
  configuration_pending: "warning",
  scheduled: "info",
  ongoing: "primary",
  completed: "success",
  marks_entry_in_progress: "warning",
  marks_submitted: "info",
  results_prepared: "secondary",
  results_published: "success",
};

// Mirrors the server's transition map (the server is the authority).
// Phase 1 only lets an admin set these statuses by hand.
export const NEXT_STATUSES = {
  draft: ["configuration_pending"],
  configuration_pending: ["draft", "scheduled"],
  scheduled: ["configuration_pending", "ongoing"],
  ongoing: ["completed"],
};

export const BACKWARD = {
  configuration_pending: ["draft"],
  scheduled: ["configuration_pending"],
};

export const CONFIG_EDITABLE = ["draft", "configuration_pending", "scheduled"];

export const examTypeLabel = (v) =>
  EXAM_TYPES.find((t) => t.value === v)?.label || v;

export const toDateInput = (d) => (d ? String(d).slice(0, 10) : "");
