/**
 * notificationStore.ts — Zustand store for in-platform notifications.
 *
 * The store manages two independent notification streams that share the same
 * Notification model on the backend but are scoped differently:
 *
 *   Customer notifications — belong to a specific user (user_id = <uuid>)
 *     Fetched via GET /api/v1/notifications
 *     Displayed in the storefront notification dropdown / account page
 *
 *   Admin notifications    — global, not tied to any user (user_id = NULL)
 *     Fetched via GET /api/v1/admin/notifications
 *     Displayed in the admin panel notification inbox
 *
 * Both streams support pagination (load-more style: page > 1 appends to list),
 * unread badge counts, mark-as-read, and (admin-only) delete.
 *
 * The unread counts are the source of truth for badge numbers on the
 * NotificationBell component and the admin sidebar badge.
 */

import { create } from "zustand";
import type { Notification } from "../types";
import { notificationService } from "../services/notificationService";

interface NotificationState {
  // ── Customer notification state ──────────────────────────────────────────────
  notifications: Notification[];
  unreadCount: number;   // drives the bell badge in the storefront header
  total: number;         // total available on server (for "load more" button)
  page: number;          // last fetched page number
  isLoading: boolean;

  // ── Admin notification state ─────────────────────────────────────────────────
  adminNotifications: Notification[];
  adminUnreadCount: number;  // drives the admin sidebar badge
  adminTotal: number;
  adminPage: number;
  isAdminLoading: boolean;

  // ── Customer actions ─────────────────────────────────────────────────────────
  fetchNotifications: (page?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;

  // ── Admin actions ────────────────────────────────────────────────────────────
  fetchAdminNotifications: (page?: number) => Promise<void>;
  fetchAdminUnreadCount: () => Promise<void>;
  markAdminRead: (id: string) => Promise<void>;
  markAdminAllRead: () => Promise<void>;
  deleteAdminNotification: (id: string) => Promise<void>;
  deleteAllAdminNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  // ── Initial state ────────────────────────────────────────────────────────────
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

  // ── Customer actions ─────────────────────────────────────────────────────────

  fetchNotifications: async (page = 1) => {
    set({ isLoading: true });
    try {
      const data = await notificationService.getNotifications(page);
      set((state) => ({
        // Replace list on page 1; append for subsequent pages (load-more pattern)
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
      // Silent fail — user may not be logged in (header renders before auth check)
    }
  },

  markRead: async (id: string) => {
    await notificationService.markRead(id);
    // Optimistic update: update UI immediately without waiting for a re-fetch
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      // Guard against going negative if count is stale
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await notificationService.markAllRead();
    // Optimistic update: mark every loaded notification as read
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  // ── Admin actions ────────────────────────────────────────────────────────────

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
      // Silent fail — admin user may not be authenticated yet
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

  deleteAdminNotification: async (id: string) => {
    await notificationService.deleteAdminNotification(id);
    set((state) => {
      // Check if the deleted notification was unread so we can update the badge
      const removed = state.adminNotifications.find((n) => n.id === id);
      return {
        adminNotifications: state.adminNotifications.filter((n) => n.id !== id),
        adminTotal: Math.max(0, state.adminTotal - 1),
        // Only decrement badge if the deleted notification was unread
        adminUnreadCount: removed && !removed.is_read
          ? Math.max(0, state.adminUnreadCount - 1)
          : state.adminUnreadCount,
      };
    });
  },

  deleteAllAdminNotifications: async () => {
    await notificationService.deleteAllAdminNotifications();
    // Reset all admin notification state to empty
    set({ adminNotifications: [], adminTotal: 0, adminUnreadCount: 0 });
  },
}));
