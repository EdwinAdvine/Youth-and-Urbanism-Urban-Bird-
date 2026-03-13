import { create } from "zustand";
import type { Cart } from "../types";
import { cartService } from "../services/cartService";

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;

  fetchCart: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  clearError: () => void;

  get itemCount(): number;
  get subtotal(): number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  cart: null,
  isLoading: false,
  error: null,

  get itemCount() {
    return get().cart?.item_count || 0;
  },

  get subtotal() {
    return get().cart?.subtotal || 0;
  },

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const cart = await cartService.getCart();
      set({ cart, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (variantId, quantity = 1) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartService.addItem(variantId, quantity);
      set({ cart, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to add item", isLoading: false });
      throw err;
    }
  },

  updateItem: async (itemId, quantity) => {
    set({ isLoading: true });
    try {
      const cart = await cartService.updateItem(itemId, quantity);
      set({ cart, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to update item", isLoading: false });
    }
  },

  removeItem: async (itemId) => {
    set({ isLoading: true });
    try {
      const cart = await cartService.removeItem(itemId);
      set({ cart, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  clearCart: async () => {
    await cartService.clearCart();
    set({ cart: null });
  },

  clearError: () => set({ error: null }),
}));
