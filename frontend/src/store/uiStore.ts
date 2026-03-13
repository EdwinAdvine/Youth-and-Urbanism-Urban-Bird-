import { create } from "zustand";
import type { Product } from "../types";

interface UIState {
  isCartDrawerOpen: boolean;
  isSearchModalOpen: boolean;
  isMobileMenuOpen: boolean;
  isMobileFilterOpen: boolean;
  isQuickViewOpen: boolean;
  quickViewProduct: Product | null;

  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;
  openSearchModal: () => void;
  closeSearchModal: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  openMobileFilter: () => void;
  closeMobileFilter: () => void;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;
  closeAll: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isCartDrawerOpen: false,
  isSearchModalOpen: false,
  isMobileMenuOpen: false,
  isMobileFilterOpen: false,
  isQuickViewOpen: false,
  quickViewProduct: null,

  openCartDrawer: () => set({ isCartDrawerOpen: true }),
  closeCartDrawer: () => set({ isCartDrawerOpen: false }),
  toggleCartDrawer: () => set((s) => ({ isCartDrawerOpen: !s.isCartDrawerOpen })),
  openSearchModal: () => set({ isSearchModalOpen: true }),
  closeSearchModal: () => set({ isSearchModalOpen: false }),
  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  openMobileFilter: () => set({ isMobileFilterOpen: true }),
  closeMobileFilter: () => set({ isMobileFilterOpen: false }),
  openQuickView: (product) => set({ isQuickViewOpen: true, quickViewProduct: product }),
  closeQuickView: () => set({ isQuickViewOpen: false, quickViewProduct: null }),
  closeAll: () => set({
    isCartDrawerOpen: false,
    isSearchModalOpen: false,
    isMobileMenuOpen: false,
    isMobileFilterOpen: false,
    isQuickViewOpen: false,
  }),
}));
