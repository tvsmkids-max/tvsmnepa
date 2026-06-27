import axiosInstance from "./axiosInstance";

const notificationApi = {
  list: () => axiosInstance.get("/notifications"),
  getUnreadCount: () => axiosInstance.get("/notifications/unread-count"),
  markAsRead: (id) => axiosInstance.patch(`/notifications/${id}/read`),
  markAllRead: () => axiosInstance.patch("/notifications/read-all"),
  delete: (id) => axiosInstance.delete(`/notifications/${id}`),
  checkPendingNow: () => axiosInstance.post("/notifications/check-pending"),
};

export default notificationApi;
