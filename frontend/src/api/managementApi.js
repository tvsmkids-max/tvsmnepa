import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

const managementApi = {
  validateAccess: (secretKey) =>
    publicClient.get(`/management/${secretKey}/validate`),

  getRangeOverview: (secretKey, from, to, group) =>
    publicClient.get(`/management/${secretKey}/range`, {
      params: { from, to, group },
    }),

  getClassDetail: (secretKey, classId, date) =>
    publicClient.get(`/management/${secretKey}/class/${classId}`, {
      params: date ? { date } : {},
    }),

  getMonthlyReport: (secretKey, year, month) =>
    publicClient.get(`/management/${secretKey}/monthly-report`, {
      params: { year, month },
    }),

  getMonthlyClassDetail: (secretKey, classId, year, month) =>
    publicClient.get(`/management/${secretKey}/monthly-class/${classId}`, {
      params: { year, month },
    }),

  getMonthlyMatrix: (secretKey, year, month) =>
    publicClient.get(`/management/${secretKey}/monthly-matrix`, {
      params: { year, month },
    }),
};

import axiosInstance from "./axiosInstance";
export const managementAdminApi = {
  listAccessUrls: () => axiosInstance.get("/management/admin/access-urls"),
  createAccessUrl: (data) =>
    axiosInstance.post("/management/admin/access-urls", data),
  revokeAccessUrl: (id) =>
    axiosInstance.patch(`/management/admin/access-urls/${id}/revoke`),
  deleteAccessUrl: (id) =>
    axiosInstance.delete(`/management/admin/access-urls/${id}`),
};

export default managementApi;
