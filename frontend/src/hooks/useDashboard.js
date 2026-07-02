import { useQuery } from "@tanstack/react-query";
import dashboardApi from "../api/dashboardApi";

// ═══════════════════════════════════════════════════════════════════
//  QUERY KEYS
// ═══════════════════════════════════════════════════════════════════

export const dashboardKeys = {
  all: ["dashboard"],
  // ─── Existing (admin dashboard) ───
  kpis: () => [...dashboardKeys.all, "kpis"],
  alerts: () => [...dashboardKeys.all, "alerts"],
  activity: (limit) => [...dashboardKeys.all, "activity", limit],
  todayStats: () => [...dashboardKeys.all, "today-stats"],
  // ─── NEW (teacher dashboard) ───
  teacherSummary: (period) => [...dashboardKeys.all, "teacher-summary", period],
  teacherDefaulters: (limit, threshold) => [
    ...dashboardKeys.all,
    "teacher-defaulters",
    limit,
    threshold,
  ],
  upcomingHolidays: (limit, days) => [
    ...dashboardKeys.all,
    "upcoming-holidays",
    limit,
    days,
  ],
};

// ═══════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD HOOKS (Existing — Unchanged)
// ═══════════════════════════════════════════════════════════════════

/**
 * Admin/School-wide KPIs
 */
export const useDashboardKPIs = (options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.kpis(),
    queryFn: async () => {
      const res = await dashboardApi.getKPIs();
      return res.data?.data || null;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    ...options,
  });
};

/**
 * Admin dashboard alerts (pending classes, defaulters, holidays, config)
 */
export const useDashboardAlerts = (options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.alerts(),
    queryFn: async () => {
      const res = await dashboardApi.getAlerts();
      return res.data?.data || { alerts: [], total: 0 };
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    ...options,
  });
};

/**
 * Recent activity feed (school-wide)
 */
export const useRecentActivity = (limit = 10, options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.activity(limit),
    queryFn: async () => {
      const res = await dashboardApi.getActivity(limit);
      return res.data?.data || [];
    },
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Today's school-wide attendance stats
 */
export const useTodayStats = (options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.todayStats(),
    queryFn: async () => {
      const res = await dashboardApi.getTodayStats();
      return res.data?.data || null;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    ...options,
  });
};

// ═══════════════════════════════════════════════════════════════════
//  TEACHER DASHBOARD HOOKS (New)
// ═══════════════════════════════════════════════════════════════════

/**
 * Teacher-specific dashboard summary
 * Returns attendance stats + class breakdown ONLY for teacher's assigned classes
 * period: "today" | "week" | "month"
 */
export const useTeacherSummary = (period = "today", options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.teacherSummary(period),
    queryFn: async () => {
      const res = await dashboardApi.getTeacherSummary(period);
      return res.data?.data || null;
    },
    staleTime: 30 * 1000, // 30 sec
    keepPreviousData: true, // Smooth toggle transitions
    refetchOnWindowFocus: true,
    ...options,
  });
};

/**
 * Teacher's defaulter students (current month, below threshold %)
 * Only students from teacher's assigned classes
 */
export const useTeacherDefaulters = (
  limit = 5,
  threshold = 75,
  options = {},
) => {
  return useQuery({
    queryKey: dashboardKeys.teacherDefaulters(limit, threshold),
    queryFn: async () => {
      const res = await dashboardApi.getTeacherDefaulters(limit, threshold);
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 min (defaulters don't change fast)
    ...options,
  });
};

/**
 * Upcoming holidays (next N holidays within N days)
 * Common for all roles
 */
export const useUpcomingHolidays = (limit = 3, days = 60, options = {}) => {
  return useQuery({
    queryKey: dashboardKeys.upcomingHolidays(limit, days),
    queryFn: async () => {
      const res = await dashboardApi.getUpcomingHolidays(limit, days);
      return res.data?.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 min (holidays are static)
    ...options,
  });
};
