import api from "./api";
import type { Notification } from "../types";

interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  unread_count: number;
}

export const notificationService = {
  getNotifications: async (page = 1, limit = 20): Promise<NotificationListResponse> => {
    const { data } = await api.get("/notifications", { params: { page, limit } });
    return data;
  },

  getAdminNotifications: async (page = 1, limit = 20): Promise<NotificationListResponse> => {
    const { data } = await api.get("/admin/notifications", { params: { page, limit } });
    return data;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await api.get("/notifications/unread-count");
    return data.unread_count;
  },

  getAdminUnreadCount: async (): Promise<number> => {
    const { data } = await api.get("/admin/notifications/unread-count");
    return data.unread_count;
  },

  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAdminRead: async (id: string): Promise<void> => {
    await api.patch(`/admin/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.post("/notifications/read-all");
  },

  markAdminAllRead: async (): Promise<void> => {
    await api.post("/admin/notifications/read-all");
  },
};
