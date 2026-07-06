import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// ═══════════════════════════════════════════════════════════════════
//  IMPORTANT: Management API does NOT use axiosInstance
//  Because axiosInstance has auth interceptors that redirect on 401
//  Management uses secret key in URL — no login required
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
   * Validate access key (used on first load)
   */
  validateAccess: (secretKey) =>
    publicClient.get(`/management/${secretKey}/validate`),

  /**
   * Page 1: Today Overview
   */
  getTodayOverview: (secretKey) =>
    publicClient.get(`/management/${secretKey}/today`),

  /**
   * Page 2: Monthly Trends
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
   * period: "today" | "month" | "year"
   */
  getRankings: (secretKey, period = "month") =>
    publicClient.get(`/management/${secretKey}/rankings`, {
      params: { period },
    }),

  /**
   * Get class detail for management dialog
   */
  getClassDetail: (secretKey, classId, date) =>
    publicClient.get(`/management/${secretKey}/class/${classId}`, {
      params: date ? { date } : {},
    }),
};

// ═══════════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS (require auth) — uses axiosInstance
// ═══════════════════════════════════════════════════════════════════

import axiosInstance from "./axiosInstance";

export const managementAdminApi = {
  /**
   * List all access URLs
   */
  listAccessUrls: () => axiosInstance.get("/management/admin/access-urls"),

  /**
   * Create new access URL
   */
  createAccessUrl: (data) =>
    axiosInstance.post("/management/admin/access-urls", data),

  /**
   * Revoke access URL (soft disable)
   */
  revokeAccessUrl: (id) =>
    axiosInstance.patch(`/management/admin/access-urls/${id}/revoke`),

  /**
   * Delete access URL permanently
   */
  deleteAccessUrl: (id) =>
    axiosInstance.delete(`/management/admin/access-urls/${id}`),
};

export default managementApi;
