import axiosInstance from "./axiosInstance";

const classApi = {
  list: (params = {}) => axiosInstance.get("/classes", { params }),
  getById: (id) => axiosInstance.get(`/classes/${id}`),
  create: (data) => axiosInstance.post("/classes", data),
  update: (id, data) => axiosInstance.put(`/classes/${id}`, data),
  delete: (id) => axiosInstance.delete(`/classes/${id}`),
  archive: (id, isArchived) =>
    axiosInstance.patch(`/classes/${id}/archive`, { isArchived }),
  resetPassword: (id, newPassword) =>
    axiosInstance.patch(`/classes/${id}/reset-password`, { newPassword }),
};

export default classApi;
