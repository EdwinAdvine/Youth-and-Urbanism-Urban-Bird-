import { create } from "zustand";
import type { Order } from "../types";
import { orderService } from "../services/orderService";

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  page: number;

  fetchOrders: (page?: number) => Promise<void>;
  fetchOrder: (id: string) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useOrderStore = create<OrderState>()((set) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,
  totalCount: 0,
  page: 1,

  fetchOrders: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const res = await orderService.listOrders(page, 10);
      set({
        orders: res,
        totalCount: res.length,
        page,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, error: "Failed to load orders" });
    }
  },

  fetchOrder: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const order = await orderService.getOrder(id);
      set({ currentOrder: order, isLoading: false });
    } catch {
      set({ isLoading: false, error: "Failed to load order" });
    }
  },

  cancelOrder: async (orderNumber) => {
    try {
      await orderService.cancelOrder(orderNumber);
      // Update the orders list and currentOrder
      set((s) => ({
        orders: s.orders.map((o) =>
          o.order_number === orderNumber ? { ...o, status: "cancelled" } : o
        ),
        currentOrder:
          s.currentOrder?.order_number === orderNumber
            ? { ...s.currentOrder, status: "cancelled" }
            : s.currentOrder,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to cancel order" });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
