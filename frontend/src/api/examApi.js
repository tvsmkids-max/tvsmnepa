import axiosInstance from "./axiosInstance";

const examApi = {
  mine: () => axiosInstance.get("/exams/mine"),
  list: (params = {}) => axiosInstance.get("/exams", { params }),
  getById: (id) => axiosInstance.get(`/exams/${id}`),
  create: (data) => axiosInstance.post("/exams", data),
  update: (id, data) => axiosInstance.put(`/exams/${id}`, data),
  remove: (id) => axiosInstance.delete(`/exams/${id}`),
  changeStatus: (id, data) => axiosInstance.patch(`/exams/${id}/status`, data),
  listSubjects: () => axiosInstance.get("/exams/subjects"),
  addSubject: (name) => axiosInstance.post("/exams/subjects", { name }),
  renameSubject: (id, name) => axiosInstance.put(`/exams/subjects/${id}`, { name }),
  removeSubject: (id) => axiosInstance.delete(`/exams/subjects/${id}`),
  saveBulkTimetable: (id, data) => axiosInstance.put(`/exams/${id}/timetable-bulk`, data),
  saveClassConfigs: (id, data) => axiosInstance.put(`/exams/${id}/classes`, data),
  removeClassConfig: (id, classId) =>
    axiosInstance.delete(`/exams/${id}/classes/${classId}`),
  getTimetable: (id, params = {}) =>
    axiosInstance.get(`/exams/${id}/timetable`, { params }),
  saveTimetable: (id, classId, entries) =>
    axiosInstance.put(`/exams/${id}/timetable/${classId}`, { entries }),
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
  adminSaveMarks: (id, classId, subjectKey, entries) =>
    axiosInstance.put(`/exams/${id}/marks/${classId}/${encodeURIComponent(subjectKey)}/entry`, { entries }),
  adminSubmitMarks: (id, classId) => axiosInstance.post(`/exams/${id}/marks/${classId}/submit`),
  lockMarks: (id, classId) => axiosInstance.post(`/exams/${id}/marks/${classId}/lock`),
  unlockMarks: (id, classId, reason) =>
    axiosInstance.post(`/exams/${id}/marks/${classId}/unlock`, { reason }),
  validateResults: (id) => axiosInstance.get(`/exams/${id}/results/validate`),
  calculateResults: (id) => axiosInstance.post(`/exams/${id}/results/calculate`),
  listResults: (id, classId) =>
    axiosInstance.get(`/exams/${id}/results`, { params: classId ? { classId } : {} }),
  publishSummary: (id) => axiosInstance.get(`/exams/${id}/results/publish-summary`),
  publishResults: (id) => axiosInstance.post(`/exams/${id}/results/publish`, { confirm: true }),
  withdrawResults: (id, reason) => axiosInstance.post(`/exams/${id}/results/withdraw`, { reason }),
  myResults: (id) => axiosInstance.get(`/exams/mine/${id}/results`),
  runReport: (type, params = {}) => axiosInstance.get(`/exams/reports/${type}`, { params }),
  reportCards: (sessionId, classId) =>
    axiosInstance.get("/exams/report-cards", { params: { sessionId, classId } }),
  saveReportCardFields: (sessionId, classId, entries) =>
    axiosInstance.put("/exams/report-cards/fields", { sessionId, classId, entries }),
  approveRanks: (sessionId, classId) =>
    axiosInstance.post("/exams/report-cards/ranks/approve", { sessionId, classId }),
  revokeRanks: (sessionId, classId) =>
    axiosInstance.post("/exams/report-cards/ranks/revoke", { sessionId, classId }),
  myReportCards: (sessionId) =>
    axiosInstance.get("/exams/mine/report-cards", { params: { sessionId } }),
  saveMyRemarks: (sessionId, entries) =>
    axiosInstance.put("/exams/mine/report-cards/remarks", { sessionId, entries }),
  audit: (id, params = {}) =>
    axiosInstance.get(`/exams/${id}/audit`, { params }),
};

export default examApi;
