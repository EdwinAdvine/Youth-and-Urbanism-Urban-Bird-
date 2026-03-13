import { useCallback } from "react";

export interface RecentlyViewedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  is_on_sale?: boolean;
  sale_percentage?: number;
}

const KEY = "ub_recently_viewed";
const MAX = 6;

function getStored(): RecentlyViewedProduct[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const trackView = useCallback((product: RecentlyViewedProduct) => {
    const prev = getStored().filter((p) => p.id !== product.id);
    const next = [product, ...prev].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const getRecent = useCallback((excludeId?: string): RecentlyViewedProduct[] => {
    return getStored().filter((p) => p.id !== excludeId);
  }, []);

  return { trackView, getRecent };
}
