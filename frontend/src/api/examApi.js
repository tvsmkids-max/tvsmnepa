import axiosInstance from "./axiosInstance";

const examApi = {
  mine: () => axiosInstance.get("/exams/mine"),
  list: (params = {}) => axiosInstance.get("/exams", { params }),
  getById: (id) => axiosInstance.get(`/exams/${id}`),
  create: (data) => axiosInstance.post("/exams", data),
  update: (id, data) => axiosInstance.put(`/exams/${id}`, data),
  remove: (id) => axiosInstance.delete(`/exams/${id}`),
  changeStatus: (id, data) => axiosInstance.patch(`/exams/${id}/status`, data),
  saveClassConfigs: (id, data) => axiosInstance.put(`/exams/${id}/classes`, data),
  removeClassConfig: (id, classId) =>
    axiosInstance.delete(`/exams/${id}/classes/${classId}`),
  getTimetable: (id, params = {}) =>
    axiosInstance.get(`/exams/${id}/timetable`, { params }),
  saveTimetable: (id, classId, entries) =>
    axiosInstance.put(`/exams/${id}/timetable/${classId}`, { entries }),
  getRollNumbers: (id, classId) =>
    axiosInstance.get(`/exams/${id}/roll-numbers`, { params: { classId } }),
  generateRollNumbers: (id, classId) =>
    axiosInstance.post(`/exams/${id}/roll-numbers/${classId}/generate`),
  updateRollNumber: (id, classId, studentId, data) =>
    axiosInstance.put(`/exams/${id}/roll-numbers/${classId}/${studentId}`, data),
  buildAdmitCards: (id, data) => axiosInstance.post(`/exams/${id}/admit-cards`, data),
  audit: (id, params = {}) =>
    axiosInstance.get(`/exams/${id}/audit`, { params }),
};

export default examApi;
