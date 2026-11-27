// Pages that only one role may open (mirrors the RoleRoute wrappers in AppRouter).
const ADMIN_ONLY = [
  "/dashboard",
  "/students/shift",
  "/classes",
  "/sessions",
  "/settings",
  "/reports/unmarked",
  "/exams/section",
  "/exams/report-cards",
  "/exams/reports",
  "/activity-logs",
  "/users",
  "/promotion",
  "/backup",
];
const CLASS_ONLY = ["/teacher/dashboard", "/exams/mine"];

const under = (path, base) => path === base || path.startsWith(`${base}/`);

/** True when `role` is allowed to open `path` (a pathname). */
export const canOpenPath = (role, path) => {
  if (!path || path === "/" || path === "/login" || path === "/unauthorized") return false;
  if (under(path, "/exams/mine")) return role === "class";
  if (path === "/exams" || /^\/exams\/[^/]+(\/(classes|timetable|admit-cards|marks|results|details|audit))?$/.test(path)) return role === "admin";
  if (CLASS_ONLY.some((b) => under(path, b))) return role === "class";
  if (ADMIN_ONLY.some((b) => under(path, b))) return role === "admin";
  return true;
};

/**
 * Maps an admin exam page URL to the menu entry that should look active.
 * /exams/:id/:section -> /exams/section/:section ; /exams/:id -> /exams.
 * Returns null for any other URL.
 */
export const examMenuPathFor = (pathname) => {
  const m = pathname.match(/^\/exams\/([^/]+)\/(classes|timetable|admit-cards|marks|results|details|audit)$/);
  if (m && !["mine", "section"].includes(m[1])) return `/exams/section/${m[2]}`;
  const one = pathname.match(/^\/exams\/([^/]+)$/);
  if (one && !["mine", "section", "report-cards", "reports"].includes(one[1])) return "/exams";
  return null;
};
