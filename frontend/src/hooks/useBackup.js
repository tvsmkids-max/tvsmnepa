import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import backupApi from "../api/backupApi";

export const backupKeys = {
  all: ["backup"],
  stats: () => [...backupKeys.all, "stats"],
};

/**
 * Fetch backup statistics
 */
export const useBackupStats = (options = {}) => {
  return useQuery({
    queryKey: backupKeys.stats(),
    queryFn: async () => {
      const res = await backupApi.getStats();
      return res.data?.data || null;
    },
    staleTime: 60 * 1000, // 1 min
    ...options,
  });
};

/**
 * Download backup (triggers file download)
 */
export const useDownloadBackup = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: async () => {
      const response = await backupApi.downloadBackup();

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers["content-disposition"] || "";
      const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
      const filename = filenameMatch
        ? filenameMatch[1]
        : `backup_${new Date().toISOString().split("T")[0]}.json`;

      // Trigger browser download
      const blob = new Blob([response.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { filename, size: blob.size };
    },
    onSuccess: (result) => {
      enqueueSnackbar(`Backup downloaded: ${result.filename}`, {
        variant: "success",
        autoHideDuration: 6000,
      });
      queryClient.invalidateQueries({ queryKey: backupKeys.stats() });
    },
    onError: (err) => {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to download backup",
        { variant: "error" },
      );
    },
  });
};

/**
 * Validate backup file
 */
export const useValidateBackup = () => {
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (backupData) => backupApi.validateBackup(backupData),
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Invalid backup file", {
        variant: "error",
      });
    },
  });
};

/**
 * Restore from backup
 */
export const useRestoreBackup = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ backup, collections }) =>
      backupApi.restoreBackup(backup, collections),
    onSuccess: (res) => {
      enqueueSnackbar(res.data?.message || "Restore complete", {
        variant: "success",
        autoHideDuration: 8000,
      });
      // Invalidate everything since data may have changed
      queryClient.invalidateQueries();
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Restore failed", {
        variant: "error",
      });
    },
  });
};

/**
 * Helper: Parse uploaded backup file
 */
export const parseBackupFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    if (!file.name.endsWith(".json")) {
      reject(new Error("File must be a .json file"));
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      reject(new Error("File too large (max 100MB)"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (err) {
        reject(new Error("Invalid JSON file: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};
