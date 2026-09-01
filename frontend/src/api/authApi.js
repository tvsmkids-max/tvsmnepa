import axiosInstance from "./axiosInstance";

const authApi = {
  getLoginOptions: () => axiosInstance.get("/auth/login-options"),
  login: (data) => axiosInstance.post("/auth/login", data),
  logout: (refreshToken) =>
    axiosInstance.post("/auth/logout", { refreshToken }),
  refreshAccessToken: (refreshToken) =>
    axiosInstance.post("/auth/refresh", { refreshToken }),
  changePassword: (data) => axiosInstance.post("/auth/change-password", data),
  getMe: () => axiosInstance.get("/auth/me"),
};

export default authApi;
