import axiosInstance from "./axiosInstance";

const attendanceApi = {
  getSheet: (params) => axiosInstance.get("/attendance/sheet", { params }),

  markAttendance: (data) => axiosInstance.post("/attendance/mark", data),

  editSingle: (id, data) => axiosInstance.put(`/attendance/${id}`, data),

  lock: (data) => axiosInstance.post("/attendance/lock", data),

  unlock: (data) => axiosInstance.post("/attendance/unlock", data),

  getStudentHistory: (studentId, params = {}) =>
    axiosInstance.get(`/attendance/student/${studentId}`, { params }),

  getPending: () => axiosInstance.get("/attendance/pending"),

  getTodayStats: () => axiosInstance.get("/attendance/today-stats"),
};

export default attendanceApi;
