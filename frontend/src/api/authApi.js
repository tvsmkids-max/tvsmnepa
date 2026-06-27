import axiosInstance from "./axiosInstance";

const authApi = {
  login: (data) => axiosInstance.post("/auth/login", data),
  logout: (refreshToken) =>
    axiosInstance.post("/auth/logout", { refreshToken }),
  refreshToken: (token) =>
    axiosInstance.post("/auth/refresh", { refreshToken: token }),
  changePassword: (data) => axiosInstance.post("/auth/change-password", data),
  getMe: () => axiosInstance.get("/auth/me"),
};

export default authApi;
