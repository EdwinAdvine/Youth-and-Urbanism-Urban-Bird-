import { create } from "zustand";
import type { Product, ProductFilters } from "../types";
import { productService } from "../services/productService";

interface ProductState {
  products: Product[];
  currentProduct: Product | null;
  featuredProducts: Product[];
  newArrivals: Product[];
  onSaleProducts: Product[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  filters: ProductFilters;
  page: number;

  fetchProducts: (filters?: ProductFilters, page?: number) => Promise<void>;
  fetchProduct: (slug: string) => Promise<void>;
  fetchFeatured: () => Promise<void>;
  fetchNewArrivals: () => Promise<void>;
  fetchOnSale: () => Promise<void>;
  setFilters: (filters: Partial<ProductFilters>) => void;
  resetFilters: () => void;
  clearError: () => void;
}

const defaultFilters: ProductFilters = {
  sort: "latest",
};

export const useProductStore = create<ProductState>()((set, get) => ({
  products: [],
  currentProduct: null,
  featuredProducts: [],
  newArrivals: [],
  onSaleProducts: [],
  isLoading: false,
  error: null,
  totalCount: 0,
  filters: defaultFilters,
  page: 1,

  fetchProducts: async (filters, page = 1) => {
    const activeFilters = filters ?? get().filters;
    set({ isLoading: true, error: null, filters: activeFilters, page });
    try {
      const res = await productService.listProducts({ ...activeFilters, page, limit: 24 });
      set({ products: res.items, totalCount: res.total, isLoading: false });
    } catch {
      set({ isLoading: false, error: "Failed to load products" });
    }
  },

  fetchProduct: async (slug) => {
    set({ isLoading: true, error: null });
    try {
      const product = await productService.getProductBySlug(slug);
      set({ currentProduct: product, isLoading: false });
    } catch {
      set({ isLoading: false, error: "Product not found" });
    }
  },

  fetchFeatured: async () => {
    try {
      const res = await productService.getFeatured();
      set({ featuredProducts: res });
    } catch {
      // silently fail for homepage sections
    }
  },

  fetchNewArrivals: async () => {
    try {
      const res = await productService.getNewArrivals();
      set({ newArrivals: res });
    } catch {}
  },

  fetchOnSale: async () => {
    try {
      const res = await productService.getOnSale();
      set({ onSaleProducts: res });
    } catch {}
  },

  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters }, page: 1 })),

  resetFilters: () => set({ filters: defaultFilters, page: 1 }),

  clearError: () => set({ error: null }),
}));
