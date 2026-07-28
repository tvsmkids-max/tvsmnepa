import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import managementApi, { managementAdminApi } from "../api/managementApi";

// ═══════════════════════════════════════════════════════════════════
//  QUERY KEYS
// ═══════════════════════════════════════════════════════════════════

export const managementKeys = {
  all: ["management"],
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
  monthlyReport: (key, year, month) => [
    ...managementKeys.all,
    "monthlyReport",
    key,
    year,
    month,
  ],
  monthlyClassDetail: (key, classId, year, month) => [
    ...managementKeys.all,
    "monthlyClassDetail",
    key,
    classId,
    year,
    month,
  ],
  monthlyMatrix: (key, year, month) => [
    ...managementKeys.all,
    "monthlyMatrix",
    key,
    year,
    month,
  ],
  accessUrls: () => [...managementKeys.all, "admin", "access-urls"],
};

// ═══════════════════════════════════════════════════════════════════
//  AUTO-REFRESH SETTINGS
// ═══════════════════════════════════════════════════════════════════

const AUTO_REFRESH_MS = 60 * 60 * 1000; // 1 hour
const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

// ═══════════════════════════════════════════════════════════════════
//  PUBLIC HOOKS
// ═══════════════════════════════════════════════════════════════════

export const useValidateAccess = (secretKey, options = {}) => {
  return useQuery({
    queryKey: managementKeys.validate(secretKey),
    queryFn: async () => {
      const res = await managementApi.validateAccess(secretKey);
      return res.data?.data || null;
    },
    enabled: !!secretKey,
    retry: false,
    staleTime: 30 * 60 * 1000,
    ...options,
  });
};

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
    keepPreviousData: true,
    ...options,
  });
};

export const useClassDetail = (secretKey, classId, date, enabled = true) => {
  return useQuery({
    queryKey: managementKeys.classDetail(secretKey, classId, date),
    queryFn: async () => {
      const res = await managementApi.getClassDetail(secretKey, classId, date);
      return res.data?.data || null;
    },
    enabled: !!secretKey && !!classId && enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useMonthlyReport = (secretKey, year, month, options = {}) => {
  return useQuery({
    queryKey: managementKeys.monthlyReport(secretKey, year, month),
    queryFn: async () => {
      const res = await managementApi.getMonthlyReport(secretKey, year, month);
      return res.data?.data || null;
    },
    enabled: !!secretKey && !!year && !!month,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    ...options,
  });
};

export const useMonthlyClassDetail = (
  secretKey,
  classId,
  year,
  month,
  enabled = true,
) => {
  return useQuery({
    queryKey: managementKeys.monthlyClassDetail(
      secretKey,
      classId,
      year,
      month,
    ),
    queryFn: async () => {
      const res = await managementApi.getMonthlyClassDetail(
        secretKey,
        classId,
        year,
        month,
      );
      return res.data?.data || null;
    },
    enabled: !!secretKey && !!classId && !!year && !!month && enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * ✅ NEW: Monthly Matrix (Class × Date grid)
 */
export const useMonthlyMatrix = (secretKey, year, month, options = {}) => {
  return useQuery({
    queryKey: managementKeys.monthlyMatrix(secretKey, year, month),
    queryFn: async () => {
      const res = await managementApi.getMonthlyMatrix(secretKey, year, month);
      return res.data?.data || null;
    },
    enabled: !!secretKey && !!year && !!month,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
    ...options,
  });
};

/**
 * Manual refresh helper
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
    queryClient.invalidateQueries({
      queryKey: [...managementKeys.all, "monthlyReport", secretKey],
    });
    queryClient.invalidateQueries({
      queryKey: [...managementKeys.all, "monthlyClassDetail", secretKey],
    });
    queryClient.invalidateQueries({
      queryKey: [...managementKeys.all, "monthlyMatrix", secretKey],
    });
  };
};

// ═══════════════════════════════════════════════════════════════════
//  ADMIN HOOKS
// ═══════════════════════════════════════════════════════════════════

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
