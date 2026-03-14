import { create } from "zustand";
import api from "../services/api";
import type { NavCategory } from "../data/navData";

interface DynamicCategory {
  id: string;
  name: string;
  slug: string;
  banner_url: string | null;
  subcategories: { id: string; name: string; slug: string; display_order: number; is_active?: boolean }[];
}

interface NavCategoryStore {
  navCategories: NavCategory[];
  rawCategories: DynamicCategory[];
  isLoaded: boolean;
  fetchCategories: () => Promise<void>;
}

function toNavCategory(cat: DynamicCategory): NavCategory {
  const activeSubs = cat.subcategories
    .filter((s) => s.is_active !== false)
    .sort((a, b) => a.display_order - b.display_order);

  return {
    label: cat.name.toUpperCase(),
    slug: cat.slug,
    href: `/category/${cat.slug}`,
    // Use category banner if available, fall back to static image matching the slug
    bannerUrl: cat.banner_url || `/category-${cat.slug}.jpg`,
    groups:
      activeSubs.length > 0
        ? [
            {
              title: "",
              items: activeSubs.map((sub) => ({
                label: sub.name,
                href: `/category/${cat.slug}?sub=${sub.slug}`,
              })),
            },
          ]
        : [],
  };
}

export const useNavCategoryStore = create<NavCategoryStore>((set, get) => ({
  navCategories: [],
  rawCategories: [],
  isLoaded: false,

  fetchCategories: async () => {
    if (get().isLoaded) return;
    try {
      const res = await api.get<DynamicCategory[]>("/api/v1/categories");
      const rawCategories = res.data;
      const navCategories = rawCategories.map(toNavCategory);
      set({ navCategories, rawCategories, isLoaded: true });
    } catch {
      // If fetch fails, mark as loaded so we don't retry on every render;
      // MegaMenu will fall back to static navData.
      set({ isLoaded: true });
    }
  },
}));
