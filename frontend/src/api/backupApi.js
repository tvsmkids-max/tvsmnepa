import axiosInstance from "./axiosInstance";

const backupApi = {
  // Get backup statistics
  getStats: () => axiosInstance.get("/backup/stats"),

  // Download backup as JSON file (returns blob)
  downloadBackup: () =>
    axiosInstance.get("/backup/create", {
      responseType: "blob",
      timeout: 120000, // 2 minutes (large backups can take time)
    }),

  // Validate uploaded backup (before restore)
  validateBackup: (backupData) =>
    axiosInstance.post(
      "/backup/validate",
      { backup: backupData },
      {
        timeout: 60000,
        maxBodyLength: 100 * 1024 * 1024, // 100MB
        maxContentLength: 100 * 1024 * 1024,
      },
    ),

  // Restore backup
  restoreBackup: (backupData, collections = null) =>
    axiosInstance.post(
      "/backup/restore",
      { backup: backupData, collections },
      {
        timeout: 180000, // 3 minutes
        maxBodyLength: 100 * 1024 * 1024,
        maxContentLength: 100 * 1024 * 1024,
      },
    ),
};

export default backupApi;
