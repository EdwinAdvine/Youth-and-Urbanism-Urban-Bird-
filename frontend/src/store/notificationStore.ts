import { create } from "zustand";
import type { Notification } from "../types";
import { notificationService } from "../services/notificationService";

interface NotificationState {
  // Customer notifications
  notifications: Notification[];
  unreadCount: number;
  total: number;
  page: number;
  isLoading: boolean;

  // Admin notifications
  adminNotifications: Notification[];
  adminUnreadCount: number;
  adminTotal: number;
  adminPage: number;
  isAdminLoading: boolean;

  // Customer actions
  fetchNotifications: (page?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;

  // Admin actions
  fetchAdminNotifications: (page?: number) => Promise<void>;
  fetchAdminUnreadCount: () => Promise<void>;
  markAdminRead: (id: string) => Promise<void>;
  markAdminAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  page: 1,
  isLoading: false,

  adminNotifications: [],
  adminUnreadCount: 0,
  adminTotal: 0,
  adminPage: 1,
  isAdminLoading: false,

  fetchNotifications: async (page = 1) => {
    set({ isLoading: true });
    try {
      const data = await notificationService.getNotifications(page);
      set((state) => ({
        notifications: page === 1 ? data.items : [...state.notifications, ...data.items],
        total: data.total,
        unreadCount: data.unread_count,
        page,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await notificationService.getUnreadCount();
      set({ unreadCount: count });
    } catch {
      // silent fail — user may not be logged in
    }
  },

  markRead: async (id: string) => {
    await notificationService.markRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await notificationService.markAllRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  fetchAdminNotifications: async (page = 1) => {
    set({ isAdminLoading: true });
    try {
      const data = await notificationService.getAdminNotifications(page);
      set((state) => ({
        adminNotifications: page === 1 ? data.items : [...state.adminNotifications, ...data.items],
        adminTotal: data.total,
        adminUnreadCount: data.unread_count,
        adminPage: page,
        isAdminLoading: false,
      }));
    } catch {
      set({ isAdminLoading: false });
    }
  },

  fetchAdminUnreadCount: async () => {
    try {
      const count = await notificationService.getAdminUnreadCount();
      set({ adminUnreadCount: count });
    } catch {
      // silent fail
    }
  },

  markAdminRead: async (id: string) => {
    await notificationService.markAdminRead(id);
    set((state) => ({
      adminNotifications: state.adminNotifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      adminUnreadCount: Math.max(0, state.adminUnreadCount - 1),
    }));
  },

  markAdminAllRead: async () => {
    await notificationService.markAdminAllRead();
    set((state) => ({
      adminNotifications: state.adminNotifications.map((n) => ({ ...n, is_read: true })),
      adminUnreadCount: 0,
    }));
  },
}));
