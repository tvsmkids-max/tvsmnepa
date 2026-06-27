import axiosInstance from "./axiosInstance";

const holidayApi = {
  list: (params = {}) => axiosInstance.get("/holidays", { params }),
  getById: (id) => axiosInstance.get(`/holidays/${id}`),
  create: (data) => axiosInstance.post("/holidays", data),
  update: (id, data) => axiosInstance.put(`/holidays/${id}`, data),
  delete: (id) => axiosInstance.delete(`/holidays/${id}`),
  checkDate: (date, sessionId) =>
    axiosInstance.get(`/holidays/check/${date}`, {
      params: { session: sessionId },
    }),
};

export default holidayApi;
