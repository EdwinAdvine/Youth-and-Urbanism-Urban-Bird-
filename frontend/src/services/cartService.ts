import api from "./api";
import type { Cart } from "../types";

const BASE = "/api/v1/cart";

export const cartService = {
  async getCart(): Promise<Cart> {
    const res = await api.get<Cart>(BASE);
    return res.data;
  },

  async addItem(variant_id: string, quantity = 1): Promise<Cart> {
    const res = await api.post<Cart>(`${BASE}/items`, { variant_id, quantity });
    return res.data;
  },

  async updateItem(item_id: string, quantity: number): Promise<Cart> {
    const res = await api.patch<Cart>(`${BASE}/items/${item_id}`, { quantity });
    return res.data;
  },

  async removeItem(item_id: string): Promise<Cart> {
    const res = await api.delete<Cart>(`${BASE}/items/${item_id}`);
    return res.data;
  },

  async clearCart(): Promise<void> {
    await api.delete(BASE);
  },

  async mergeCart(): Promise<void> {
    await api.post(`${BASE}/merge`);
  },
};
