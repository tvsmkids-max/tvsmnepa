import axiosInstance from "./axiosInstance";

const principalApi = {
  getDashboard: () => axiosInstance.get("/principal/dashboard"),
};

export default principalApi;
