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
  marksOverview: (id) => axiosInstance.get(`/exams/mine/${id}/marks`),
  marksSheet: (id, subjectKey) =>
    axiosInstance.get(`/exams/mine/${id}/marks/${encodeURIComponent(subjectKey)}`),
  saveMarks: (id, subjectKey, entries) =>
    axiosInstance.put(`/exams/mine/${id}/marks/${encodeURIComponent(subjectKey)}`, { entries }),
  submitMarks: (id) => axiosInstance.post(`/exams/mine/${id}/marks/submit`),
  reopenMarks: (id, classId, reason) =>
    axiosInstance.post(`/exams/${id}/marks/${classId}/reopen`, { reason }),
  monitorMarks: (id) => axiosInstance.get(`/exams/${id}/marks/monitor`),
  adminMarksSheet: (id, classId, subjectKey) =>
    axiosInstance.get(`/exams/${id}/marks/${classId}/${encodeURIComponent(subjectKey)}`),
  correctMarks: (id, classId, subjectKey, entries, reason) =>
    axiosInstance.put(`/exams/${id}/marks/${classId}/${encodeURIComponent(subjectKey)}`, {
      entries,
      reason,
    }),
  lockMarks: (id, classId) => axiosInstance.post(`/exams/${id}/marks/${classId}/lock`),
  unlockMarks: (id, classId, reason) =>
    axiosInstance.post(`/exams/${id}/marks/${classId}/unlock`, { reason }),
  audit: (id, params = {}) =>
    axiosInstance.get(`/exams/${id}/audit`, { params }),
};

export default examApi;
