import axiosInstance from "./axiosInstance";

const sessionApi = {
  list: () => axiosInstance.get("/sessions"),
  getActive: () => axiosInstance.get("/sessions/active"),
  create: (data) => axiosInstance.post("/sessions", data),
  update: (id, data) => axiosInstance.put(`/sessions/${id}`, data),
  activate: (id) => axiosInstance.patch(`/sessions/${id}/activate`),
  delete: (id) => axiosInstance.delete(`/sessions/${id}`),
};

export default sessionApi;
