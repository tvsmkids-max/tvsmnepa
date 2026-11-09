import axiosInstance from "./axiosInstance";

const externalKeyApi = {
  listKeys: () => axiosInstance.get("/external/admin/keys"),
  createKey: (data) => axiosInstance.post("/external/admin/keys", data),
  revokeKey: (id) => axiosInstance.patch(`/external/admin/keys/${id}/revoke`),
  deleteKey: (id) => axiosInstance.delete(`/external/admin/keys/${id}`),
};

export default externalKeyApi;
