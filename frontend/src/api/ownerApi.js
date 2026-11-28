import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
export const OWNER_TOKEN_KEY = "sams_owner_token";

export const ownerToken = {
  get: () => {
    try {
      return localStorage.getItem(OWNER_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  },
  set: (t) => {
    try {
      localStorage.setItem(OWNER_TOKEN_KEY, t);
    } catch {
      /* ignore */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(OWNER_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

// Separate from the school axios instance: its own token, no school refresh logic.
const http = axios.create({ baseURL: `${API_BASE_URL}/owner`, timeout: 30000 });
http.interceptors.request.use((c) => {
  const t = ownerToken.get();
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
http.interceptors.response.use(
  (r) => r,
  (err) => {
    const onLogin = window.location.pathname === "/owner/login";
    if (err.response?.status === 401 && !onLogin) {
      ownerToken.clear();
      window.location.href = "/owner/login";
    }
    return Promise.reject(err);
  },
);

const ownerApi = {
  login: (data) => http.post("/login", data),
  me: () => http.get("/me"),
  changePassword: (data) => http.post("/change-password", data),
  getPlatform: () => http.get("/platform"),
  savePlatform: (data) => http.put("/platform", data),
  listSchools: (q) => http.get("/schools", { params: q ? { q } : {} }),
  getSchool: (id) => http.get(`/schools/${id}`),
  createSchool: (data) => http.post("/schools", data),
  updateSchool: (id, data) => http.put(`/schools/${id}`, data),
  setSchoolStatus: (id, status) => http.patch(`/schools/${id}/status`, { status }),
};

export default ownerApi;
