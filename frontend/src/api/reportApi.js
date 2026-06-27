import axiosInstance from "./axiosInstance";

const reportApi = {
  getDaily: (params = {}) => axiosInstance.get("/reports/daily", { params }),
  getMonthly: (params = {}) =>
    axiosInstance.get("/reports/monthly", { params }),
  getStudent: (id, params = {}) =>
    axiosInstance.get(`/reports/student/${id}`, { params }),
  getDefaulters: (params = {}) =>
    axiosInstance.get("/reports/defaulters", { params }),
  getClassTrend: (classId, params = {}) =>
    axiosInstance.get(`/reports/class-trend/${classId}`, { params }),
  getAnalytics: () => axiosInstance.get("/reports/analytics"),
};

export default reportApi;
