import api from "./api";
import type { Category } from "../types";

const BASE = "/api/v1/categories";

export const categoryService = {
  async listCategories(): Promise<Category[]> {
    const res = await api.get<Category[]>(BASE);
    return res.data;
  },

  async getCategoryBySlug(slug: string): Promise<Category> {
    const res = await api.get<Category>(`${BASE}/${slug}`);
    return res.data;
  },
};
