import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import managementApi, { managementAdminApi } from "../api/managementApi";

// ═══════════════════════════════════════════════════════════════════
//  QUERY KEYS
// ═══════════════════════════════════════════════════════════════════

export const managementKeys = {
  all: ["management"],
  // Public (per secret key)
  validate: (key) => [...managementKeys.all, "validate", key],
  today: (key) => [...managementKeys.all, "today", key],
  monthly: (key) => [...managementKeys.all, "monthly", key],
  yearly: (key) => [...managementKeys.all, "yearly", key],
  alerts: (key) => [...managementKeys.all, "alerts", key],
  rankings: (key, period) => [...managementKeys.all, "rankings", key, period],
  classDetail: (key, classId, date) => [
    ...managementKeys.all,
    "classDetail",
    key,
    classId,
    date,
  ],
  // Admin
  accessUrls: () => [...managementKeys.all, "admin", "access-urls"],
};

// ═══════════════════════════════════════════════════════════════════
//  AUTO-REFRESH SETTINGS
// ═══════════════════════════════════════════════════════════════════

// Auto-refresh every 1 hour (as decided in design)
const AUTO_REFRESH_MS = 60 * 60 * 1000;

// Stale time: 5 minutes (data considered fresh)
const STALE_TIME_MS = 5 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════
//  PUBLIC HOOKS (Management Dashboard Pages)
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate secret key (called once on dashboard load)
 * Returns { valid: true, label: "..." } if valid
 */
export const useValidateAccess = (secretKey, options = {}) => {
  return useQuery({
    queryKey: managementKeys.validate(secretKey),
    queryFn: async () => {
      const res = await managementApi.validateAccess(secretKey);
      return res.data?.data || null;
    },
    enabled: !!secretKey,
    retry: false,
    staleTime: 30 * 60 * 1000, // 30 min
    ...options,
  });
};

/**
 * Page 1: Today Overview
 */
export const useTodayOverview = (secretKey, options = {}) => {
  return useQuery({
    queryKey: managementKeys.today(secretKey),
    queryFn: async () => {
      const res = await managementApi.getTodayOverview(secretKey);
      return res.data?.data || null;
    },
    enabled: !!secretKey,
    staleTime: STALE_TIME_MS,
    refetchInterval: AUTO_REFRESH_MS,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Page 2: Monthly Trends
 */
export const useMonthlyTrends = (secretKey, options = {}) => {
  return useQuery({
    queryKey: managementKeys.monthly(secretKey),
    queryFn: async () => {
      const res = await managementApi.getMonthlyTrends(secretKey);
      return res.data?.data || null;
    },
    enabled: !!secretKey,
    staleTime: STALE_TIME_MS,
    refetchInterval: AUTO_REFRESH_MS,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Page 3: Yearly Performance
 */
export const useYearlyPerformance = (secretKey, options = {}) => {
  return useQuery({
    queryKey: managementKeys.yearly(secretKey),
    queryFn: async () => {
      const res = await managementApi.getYearlyPerformance(secretKey);
      return res.data?.data || null;
    },
    enabled: !!secretKey,
    staleTime: STALE_TIME_MS,
    refetchInterval: AUTO_REFRESH_MS,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Page 4: Alerts
 */
export const useAlerts = (secretKey, options = {}) => {
  return useQuery({
    queryKey: managementKeys.alerts(secretKey),
    queryFn: async () => {
      const res = await managementApi.getAlerts(secretKey);
      return res.data?.data || null;
    },
    enabled: !!secretKey,
    staleTime: STALE_TIME_MS,
    refetchInterval: AUTO_REFRESH_MS,
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Page 5: Rankings
 */
export const useRankings = (secretKey, period = "month", options = {}) => {
  return useQuery({
    queryKey: managementKeys.rankings(secretKey, period),
    queryFn: async () => {
      const res = await managementApi.getRankings(secretKey, period);
      return res.data?.data || null;
    },
    enabled: !!secretKey,
    staleTime: STALE_TIME_MS,
    refetchInterval: AUTO_REFRESH_MS,
    refetchOnWindowFocus: false,
    keepPreviousData: true, // Smooth period toggle
    ...options,
  });
};

/**
 * Class Detail (for management click-through dialog)
 * Fetches when classId is set + enabled=true
 */
export const useClassDetail = (secretKey, classId, date, enabled = true) => {
  return useQuery({
    queryKey: managementKeys.classDetail(secretKey, classId, date),
    queryFn: async () => {
      const res = await managementApi.getClassDetail(secretKey, classId, date);
      return res.data?.data || null;
    },
    enabled: !!secretKey && !!classId && enabled,
    staleTime: 60 * 1000, // 1 min
    refetchOnWindowFocus: false,
  });
};

/**
 * Manual refresh helper — invalidates all data for a secret key
 */
export const useRefreshManagement = () => {
  const queryClient = useQueryClient();
  return (secretKey) => {
    if (!secretKey) return;
    queryClient.invalidateQueries({
      queryKey: managementKeys.today(secretKey),
    });
    queryClient.invalidateQueries({
      queryKey: managementKeys.monthly(secretKey),
    });
    queryClient.invalidateQueries({
      queryKey: managementKeys.yearly(secretKey),
    });
    queryClient.invalidateQueries({
      queryKey: managementKeys.alerts(secretKey),
    });
    queryClient.invalidateQueries({
      queryKey: [...managementKeys.all, "rankings", secretKey],
    });
    queryClient.invalidateQueries({
      queryKey: [...managementKeys.all, "classDetail", secretKey],
    });
  };
};

// ═══════════════════════════════════════════════════════════════════
//  ADMIN HOOKS (For admin to manage URLs — used in Settings later)
// ═══════════════════════════════════════════════════════════════════

/**
 * List all access URLs (admin only)
 */
export const useAccessUrls = (options = {}) => {
  return useQuery({
    queryKey: managementKeys.accessUrls(),
    queryFn: async () => {
      const res = await managementAdminApi.listAccessUrls();
      return res.data?.data || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
};

/**
 * Create new access URL
 */
export const useCreateAccessUrl = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (data) => managementAdminApi.createAccessUrl(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managementKeys.accessUrls() });
      enqueueSnackbar("Access URL created successfully", {
        variant: "success",
      });
    },
    onError: (err) => {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to create access URL",
        { variant: "error" },
      );
    },
  });
};

/**
 * Revoke access URL (disable)
 */
export const useRevokeAccessUrl = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => managementAdminApi.revokeAccessUrl(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managementKeys.accessUrls() });
      enqueueSnackbar("Access URL revoked", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed to revoke", {
        variant: "error",
      });
    },
  });
};

/**
 * Delete access URL permanently
 */
export const useDeleteAccessUrl = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => managementAdminApi.deleteAccessUrl(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managementKeys.accessUrls() });
      enqueueSnackbar("Access URL deleted", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed to delete", {
        variant: "error",
      });
    },
  });
};
