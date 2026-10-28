import axiosInstance from "./axiosInstance";

const userApi = {
  list: () => axiosInstance.get("/users"),
  setStatus: (id, isActive) => axiosInstance.patch(`/users/${id}/status`, { isActive }),
  resetCredential: (id, password) =>
    axiosInstance.patch(`/users/${id}/reset-credential`, { password }),
  unlock: (id) => axiosInstance.patch(`/users/${id}/unlock`),
};

export default userApi;
