import { useQuery } from "@tanstack/react-query";
import dashboardApi from "../api/dashboardApi";

export const dashboardKeys = {
  all: ["dashboard"],
  kpis: () => [...dashboardKeys.all, "kpis"],
  alerts: () => [...dashboardKeys.all, "alerts"],
  activity: (limit) => [...dashboardKeys.all, "activity", limit],
  todayStats: () => [...dashboardKeys.all, "today-stats"],
};

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
