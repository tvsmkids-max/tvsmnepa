import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import externalKeyApi from "../api/externalKeyApi";

export const externalKeyQueryKeys = {
  all: ["external-api-keys"],
  list: () => [...externalKeyQueryKeys.all, "list"],
};

export const useExternalKeys = (options = {}) => {
  return useQuery({
    queryKey: externalKeyQueryKeys.list(),
    queryFn: async () =>
      (await externalKeyApi.listKeys()).data?.data || [],
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateExternalKey = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: (data) => externalKeyApi.createKey(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: externalKeyQueryKeys.list() });
      enqueueSnackbar("Read-only API key generated", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to generate API key",
        { variant: "error" },
      );
    },
  });
};

export const useRevokeExternalKey = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: (id) => externalKeyApi.revokeKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: externalKeyQueryKeys.list() });
      enqueueSnackbar("API key revoked", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to revoke API key",
        { variant: "error" },
      );
    },
  });
};

export const useDeleteExternalKey = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: (id) => externalKeyApi.deleteKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: externalKeyQueryKeys.list() });
      enqueueSnackbar("API key deleted", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to delete API key",
        { variant: "error" },
      );
    },
  });
};
