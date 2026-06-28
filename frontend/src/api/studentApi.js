import axiosInstance from "./axiosInstance";

const studentApi = {
  list: (params = {}) => axiosInstance.get("/students", { params }),
  getSections: () => axiosInstance.get("/students/sections"),
  getById: (id) => axiosInstance.get(`/students/${id}`),
  create: (data) => axiosInstance.post("/students", data),
  update: (id, data) => axiosInstance.put(`/students/${id}`, data),
  updateStatus: (id, data) =>
    axiosInstance.patch(`/students/${id}/status`, data),
  delete: (id) => axiosInstance.delete(`/students/${id}`),
  bulkDelete: (ids, mode) =>
    axiosInstance.post("/students/bulk-delete", { ids, mode }),
  search: (query, sessionId) =>
    axiosInstance.get("/students/search", {
      params: { q: query, session: sessionId },
    }),
};

export default studentApi;
