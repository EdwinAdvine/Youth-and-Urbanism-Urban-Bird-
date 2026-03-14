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
  guest_email?: string;
}

export interface MpesaInitiateResponse {
  checkout_request_id: string;
  merchant_request_id: string;
  message: string;
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
    const guestEmail = sessionStorage.getItem("ub_guest_email");
    const params = guestEmail ? { guest_email: guestEmail } : undefined;
    const res = await api.get<Order>(`${BASE}/${orderNumber}`, { params });
    return res.data;
  },

  async cancelOrder(orderNumber: string): Promise<void> {
    await api.post(`${BASE}/${orderNumber}/cancel`);
  },

  async initiateMpesa(orderId: string, phone: string): Promise<MpesaInitiateResponse> {
    const res = await api.post<MpesaInitiateResponse>("/api/v1/payments/mpesa/initiate", {
      order_id: orderId,
      phone,
    });
    return res.data;
  },

  async checkMpesaStatus(checkoutRequestId: string): Promise<{ ResultCode: number; ResultDesc: string }> {
    const res = await api.get(`/api/v1/payments/mpesa/status/${checkoutRequestId}`);
    return res.data;
  },

  async initializePaystack(orderId: string): Promise<{ authorization_url: string; reference: string; access_code: string }> {
    const res = await api.post("/api/v1/payments/paystack/initialize", { order_id: orderId });
    return res.data;
  },

  async verifyPaystack(reference: string): Promise<{ status: string; message: string }> {
    const res = await api.get(`/api/v1/payments/paystack/verify/${reference}`);
    return res.data;
  },
};
