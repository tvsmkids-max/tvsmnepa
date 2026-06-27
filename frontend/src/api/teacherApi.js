import axiosInstance from "./axiosInstance";

const teacherApi = {
  list: (params = {}) => axiosInstance.get("/teachers", { params }),
  getMyProfile: () => axiosInstance.get("/teachers/me"),
  getById: (id) => axiosInstance.get(`/teachers/${id}`),
  create: (data) => axiosInstance.post("/teachers", data),
  update: (id, data) => axiosInstance.put(`/teachers/${id}`, data),
  delete: (id) => axiosInstance.delete(`/teachers/${id}`),
  assignClasses: (id, classIds) =>
    axiosInstance.patch(`/teachers/${id}/assign`, {
      assignedClasses: classIds,
    }),
  resetPassword: (id, newPassword) =>
    axiosInstance.patch(`/teachers/${id}/reset-password`, { newPassword }),
};

export default teacherApi;
