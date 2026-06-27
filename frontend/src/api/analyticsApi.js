import axiosInstance from "./axiosInstance";

const analyticsApi = {
  getQuickStats: () => axiosInstance.get("/analytics/quick-stats"),
  getTrend: (days = 30) =>
    axiosInstance.get("/analytics/trend", { params: { days } }),
  getClassComparison: () => axiosInstance.get("/analytics/class-comparison"),
  getDistribution: () => axiosInstance.get("/analytics/distribution"),
  getTopDefaulters: (limit = 10) =>
    axiosInstance.get("/analytics/top-defaulters", { params: { limit } }),
  getInsights: () => axiosInstance.get("/analytics/insights"),
};

export default analyticsApi;
