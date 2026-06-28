import axiosInstance from "./axiosInstance";

const dashboardApi = {
  getKPIs: () => axiosInstance.get("/attendance/dashboard/kpis"),
  getAlerts: () => axiosInstance.get("/attendance/dashboard/alerts"),
  getActivity: (limit = 10) =>
    axiosInstance.get("/attendance/dashboard/activity", { params: { limit } }),
  getTodayStats: () => axiosInstance.get("/attendance/today-stats"),
};

export default dashboardApi;
