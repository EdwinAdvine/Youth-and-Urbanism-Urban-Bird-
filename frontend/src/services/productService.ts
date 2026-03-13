import api from "./api";
import type { Product, ProductListResponse, ProductFilters, SortOption, Review } from "../types";

const BASE = "/api/v1";

export const productService = {
  async listProducts(params?: ProductFilters & { sort?: SortOption; page?: number; limit?: number }): Promise<ProductListResponse> {
    const res = await api.get<ProductListResponse>(`${BASE}/products`, { params });
    return res.data;
  },

  async getProductBySlug(slug: string): Promise<Product> {
    const res = await api.get<Product>(`${BASE}/products/${slug}`);
    return res.data;
  },

  async getFeatured(limit = 8): Promise<Product[]> {
    const res = await api.get<Product[]>(`${BASE}/products/featured`, { params: { limit } });
    return res.data;
  },

  async getNewArrivals(limit = 8): Promise<Product[]> {
    const res = await api.get<Product[]>(`${BASE}/products/new-arrivals`, { params: { limit } });
    return res.data;
  },

  async getOnSale(limit = 8): Promise<Product[]> {
    const res = await api.get<Product[]>(`${BASE}/products/on-sale`, { params: { limit } });
    return res.data;
  },

  async getReviews(slug: string, page = 1, limit = 10): Promise<Review[]> {
    const res = await api.get<Review[]>(`${BASE}/products/${slug}/reviews`, { params: { page, limit } });
    return res.data;
  },

  async createReview(slug: string, data: { rating: number; title?: string; body?: string }): Promise<Review> {
    const res = await api.post<Review>(`${BASE}/products/${slug}/reviews`, data);
    return res.data;
  },
};
