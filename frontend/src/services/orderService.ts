import api from "./api";
import type { Order } from "../types";

const BASE = "/api/v1/orders";

export interface CheckoutRequest {
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address_line_1: string;
  shipping_address_line_2?: string;
  shipping_city: string;
  shipping_county: string;
  shipping_rate_id?: string;
  payment_method: string;
  coupon_code?: string;
  mpesa_phone?: string;
}

export const orderService = {
  async checkout(data: CheckoutRequest): Promise<Order> {
    const res = await api.post<Order>(`${BASE}/checkout`, data);
    return res.data;
  },

  async listOrders(page = 1, limit = 10): Promise<Order[]> {
    const res = await api.get<Order[]>(BASE, { params: { page, limit } });
    return res.data;
  },

  async getOrder(orderNumber: string): Promise<Order> {
    const res = await api.get<Order>(`${BASE}/${orderNumber}`);
    return res.data;
  },

  async cancelOrder(orderNumber: string): Promise<void> {
    await api.post(`${BASE}/${orderNumber}/cancel`);
  },
};
