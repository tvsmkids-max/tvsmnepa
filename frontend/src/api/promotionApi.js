import axiosInstance from "./axiosInstance";

const promotionApi = {
  preview: (data) => axiosInstance.post("/promotion/preview", data),
  execute: (data) => axiosInstance.post("/promotion/execute", data),
};

export default promotionApi;
