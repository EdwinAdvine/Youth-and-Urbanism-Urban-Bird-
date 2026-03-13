import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "../types";

const MAX_COMPARE = 4;

interface CompareState {
  products: Product[];

  addProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  toggleProduct: (product: Product) => void;
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;
  canAdd: () => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      products: [],

      isInCompare: (productId) =>
        get().products.some((p) => p.id === productId),

      canAdd: () => get().products.length < MAX_COMPARE,

      addProduct: (product) => {
        if (get().products.length >= MAX_COMPARE) return;
        if (get().isInCompare(product.id)) return;
        set((s) => ({ products: [...s.products, product] }));
      },

      removeProduct: (productId) =>
        set((s) => ({
          products: s.products.filter((p) => p.id !== productId),
        })),

      toggleProduct: (product) => {
        if (get().isInCompare(product.id)) {
          get().removeProduct(product.id);
        } else {
          get().addProduct(product);
        }
      },

      clearCompare: () => set({ products: [] }),
    }),
    {
      name: "ub-compare-storage",
    }
  )
);
