import axios from "axios";
import { storage } from "../utils/storageUtils";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

// ═══════════════════════════════════════════════════════════════════
//  HELPER: Check if we should skip auth redirects
//  ✅ Never redirect from management pages (they don't need login)
// ═══════════════════════════════════════════════════════════════════
const shouldSkipAuthRedirect = () => {
  const currentPath = window.location.pathname;
  return (
    currentPath === "/login" ||
    currentPath === "/unauthorized" ||
    currentPath.startsWith("/management/")
  );
};

// ═══════════════════════════════════════════════════════════════════
//  Safe redirect to login (only on protected pages)
// ═══════════════════════════════════════════════════════════════════
const safeRedirectToLogin = (reason = "session-expired") => {
  if (shouldSkipAuthRedirect()) return;
  window.location.href = `/login?reason=${reason}`;
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const orig = error.config;

    if (error.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            orig.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(orig);
          })
          .catch((err) => Promise.reject(err));
      }
      orig._retry = true;
      isRefreshing = true;
      const refreshToken = storage.getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        storage.clearAuth();
        // ✅ Only redirect if not on public page
        safeRedirectToLogin("session-expired");
        return Promise.reject(error);
      }
      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        );
        const { accessToken } = res.data.data;
        storage.setToken(accessToken);
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        orig.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return axiosInstance(orig);
      } catch (refreshError) {
        processQueue(refreshError, null);
        storage.clearAuth();
        // ✅ Only redirect if not on public page
        safeRedirectToLogin("session-expired");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
