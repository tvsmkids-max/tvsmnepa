import axiosInstance from "./axiosInstance";

const shiftApi = {
  preview: (data) => axiosInstance.post("/shift/preview", data),
  execute: (data) => axiosInstance.post("/shift/execute", data),
};

export default shiftApi;
