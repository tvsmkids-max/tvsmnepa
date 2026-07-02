import axiosInstance from "./axiosInstance";

const dashboardApi = {
  // ─── Existing (kept for backward compat) ───
  getKPIs: () => axiosInstance.get("/attendance/dashboard/kpis"),
  getAlerts: () => axiosInstance.get("/attendance/dashboard/alerts"),
  getActivity: (limit = 10) =>
    axiosInstance.get("/attendance/dashboard/activity", { params: { limit } }),
  getTodayStats: () => axiosInstance.get("/attendance/today-stats"),

  // ─── NEW: Teacher-specific endpoints ───
  getTeacherSummary: (period = "today") =>
    axiosInstance.get("/dashboard/teacher/summary", { params: { period } }),
  getTeacherDefaulters: (limit = 5, threshold = 75) =>
    axiosInstance.get("/dashboard/teacher/defaulters", {
      params: { limit, threshold },
    }),
  getUpcomingHolidays: (limit = 3, days = 60) =>
    axiosInstance.get("/dashboard/upcoming-holidays", {
      params: { limit, days },
    }),
};

export default dashboardApi;
