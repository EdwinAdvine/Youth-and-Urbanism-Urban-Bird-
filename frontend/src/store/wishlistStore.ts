import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "../types";
import api from "../services/api";

interface WishlistState {
  productIds: string[];
  isLoading: boolean;

  addItem: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  toggleItem: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  fetchWishlist: () => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: [],
      isLoading: false,

      isInWishlist: (productId) => get().productIds.includes(productId),

      addItem: async (productId) => {
        set((s) => ({ productIds: [...s.productIds, productId] }));
        try {
          await api.post("/api/v1/wishlist/items", { product_id: productId });
        } catch {
          set((s) => ({ productIds: s.productIds.filter((id) => id !== productId) }));
        }
      },

      removeItem: async (productId) => {
        set((s) => ({ productIds: s.productIds.filter((id) => id !== productId) }));
        try {
          await api.delete(`/api/v1/wishlist/items/${productId}`);
        } catch {
          // Revert on error
        }
      },

      toggleItem: async (productId) => {
        if (get().isInWishlist(productId)) {
          await get().removeItem(productId);
        } else {
          await get().addItem(productId);
        }
      },

      fetchWishlist: async () => {
        try {
          const res = await api.get<Product[]>("/api/v1/wishlist");
          set({ productIds: res.data.map((p) => p.id) });
        } catch {
          // Not authenticated, skip
        }
      },
    }),
    {
      name: "ub-wishlist-storage",
      partialize: (state) => ({ productIds: state.productIds }),
    }
  )
);
