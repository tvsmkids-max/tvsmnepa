import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import managementApi, { managementAdminApi } from "../api/managementApi";

export const managementKeys = {
  all: ["management"],
  validate: (key) => [...managementKeys.all, "validate", key],
  range: (key, from, to, group) => [
    ...managementKeys.all,
    "range",
    key,
    from,
    to,
    group,
  ],
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

const STALE_TIME_MS = 5 * 60 * 1000;
const AUTO_REFRESH_MS = 60 * 1000; // Live sync every 60 sec

export const useValidateAccess = (secretKey, options = {}) => {
  return useQuery({
    queryKey: managementKeys.validate(secretKey),
    queryFn: async () =>
      (await managementApi.validateAccess(secretKey)).data?.data || null,
    enabled: !!secretKey,
    retry: false,
    staleTime: 30 * 60 * 1000,
    ...options,
  });
};

export const useRangeOverview = (secretKey, from, to, group, options = {}) => {
  return useQuery({
    queryKey: managementKeys.range(secretKey, from, to, group),
    queryFn: async () =>
      (await managementApi.getRangeOverview(secretKey, from, to, group)).data
        ?.data || null,
    enabled: !!secretKey && !!from && !!to,
    staleTime: STALE_TIME_MS,
    refetchInterval: AUTO_REFRESH_MS,
    keepPreviousData: true,
    ...options,
  });
};

export const useClassDetail = (secretKey, classId, date, enabled = true) => {
  return useQuery({
    queryKey: managementKeys.classDetail(secretKey, classId, date),
    queryFn: async () =>
      (await managementApi.getClassDetail(secretKey, classId, date)).data
        ?.data || null,
    enabled: !!secretKey && !!classId && enabled,
    staleTime: 60 * 1000,
  });
};

export const useMonthlyReport = (secretKey, year, month, options = {}) => {
  return useQuery({
    queryKey: managementKeys.monthlyReport(secretKey, year, month),
    queryFn: async () =>
      (await managementApi.getMonthlyReport(secretKey, year, month)).data
        ?.data || null,
    enabled: !!secretKey && !!year && !!month,
    staleTime: STALE_TIME_MS,
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
    queryFn: async () =>
      (
        await managementApi.getMonthlyClassDetail(
          secretKey,
          classId,
          year,
          month,
        )
      ).data?.data || null,
    enabled: !!secretKey && !!classId && !!year && !!month && enabled,
    staleTime: 60 * 1000,
  });
};

export const useMonthlyMatrix = (secretKey, year, month, options = {}) => {
  return useQuery({
    queryKey: managementKeys.monthlyMatrix(secretKey, year, month),
    queryFn: async () =>
      (await managementApi.getMonthlyMatrix(secretKey, year, month)).data
        ?.data || null,
    enabled: !!secretKey && !!year && !!month,
    staleTime: STALE_TIME_MS,
    keepPreviousData: true,
    ...options,
  });
};

export const useRefreshManagement = () => {
  const queryClient = useQueryClient();
  return (secretKey) => {
    if (!secretKey) return;
    queryClient.invalidateQueries({ queryKey: managementKeys.all });
  };
};

// ADMIN
export const useAccessUrls = (options = {}) => {
  return useQuery({
    queryKey: managementKeys.accessUrls(),
    queryFn: async () =>
      (await managementAdminApi.listAccessUrls()).data?.data || [],
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateAccessUrl = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: (data) => managementAdminApi.createAccessUrl(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: managementKeys.accessUrls() });
      enqueueSnackbar("Access URL created", { variant: "success" });
    },
    onError: (err) =>
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      }),
  });
};

export const useRevokeAccessUrl = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: (id) => managementAdminApi.revokeAccessUrl(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: managementKeys.accessUrls() });
      enqueueSnackbar("Access URL revoked", { variant: "success" });
    },
  });
};

export const useDeleteAccessUrl = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: (id) => managementAdminApi.deleteAccessUrl(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: managementKeys.accessUrls() });
      enqueueSnackbar("Access URL deleted", { variant: "success" });
    },
  });
};
