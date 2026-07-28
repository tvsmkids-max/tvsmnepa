import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// ═══════════════════════════════════════════════════════════════════
//  Management API uses secret key in URL — no login required
// ═══════════════════════════════════════════════════════════════════

const publicClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ═══════════════════════════════════════════════════════════════════
//  PUBLIC ENDPOINTS (via secret key)
// ═══════════════════════════════════════════════════════════════════

const managementApi = {
  /**
   * Validate access key
   */
  validateAccess: (secretKey) =>
    publicClient.get(`/management/${secretKey}/validate`),

  /**
   * Page 1: Today Overview
   */
  getTodayOverview: (secretKey) =>
    publicClient.get(`/management/${secretKey}/today`),

  /**
   * Page 2 (OLD): Monthly Trends
   */
  getMonthlyTrends: (secretKey) =>
    publicClient.get(`/management/${secretKey}/monthly`),

  /**
   * Page 3: Yearly Performance
   */
  getYearlyPerformance: (secretKey) =>
    publicClient.get(`/management/${secretKey}/yearly`),

  /**
   * Page 4: Alerts
   */
  getAlerts: (secretKey) => publicClient.get(`/management/${secretKey}/alerts`),

  /**
   * Page 5: Rankings
   */
  getRankings: (secretKey, period = "month") =>
    publicClient.get(`/management/${secretKey}/rankings`, {
      params: { period },
    }),

  /**
   * Class detail for TODAY dialog
   */
  getClassDetail: (secretKey, classId, date) =>
    publicClient.get(`/management/${secretKey}/class/${classId}`, {
      params: date ? { date } : {},
    }),

  /**
   * Monthly Report — class cards summary
   */
  getMonthlyReport: (secretKey, year, month) =>
    publicClient.get(`/management/${secretKey}/monthly-report`, {
      params: { year, month },
    }),

  /**
   * Monthly Class Detail — calendar view for one class
   */
  getMonthlyClassDetail: (secretKey, classId, year, month) =>
    publicClient.get(`/management/${secretKey}/monthly-class/${classId}`, {
      params: { year, month },
    }),

  /**
   * ✅ NEW: Monthly Matrix — Class × Date grid (Present/Absent per day)
   */
  getMonthlyMatrix: (secretKey, year, month) =>
    publicClient.get(`/management/${secretKey}/monthly-matrix`, {
      params: { year, month },
    }),
};

// ═══════════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

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
