import axiosInstance from "./axiosInstance";

const activityLogApi = {
  list: (params = {}) => axiosInstance.get("/activity-logs", { params }),
  getFilters: () => axiosInstance.get("/activity-logs/filters"),
};

export default activityLogApi;
