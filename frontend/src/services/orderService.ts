import api from "./api";
import type { Order } from "../types";

const BASE = "/api/v1/orders";

export interface CheckoutRequest {
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address_line_1?: string;
  shipping_city?: string;
  shipping_county?: string;
  shipping_rate_id?: string;
  payment_method: string;
  coupon_code?: string;
  mpesa_phone?: string;
  guest_email?: string;
  recaptcha_token?: string;
}

// reCAPTCHA v3 — site key must match the one in index.html
const RECAPTCHA_SITE_KEY = "RECAPTCHA_SITE_KEY";

async function getRecaptchaToken(action: string): Promise<string | undefined> {
  try {
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha?.execute) return undefined;
    return await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
  } catch {
    return undefined;
  }
}

export interface MpesaInitiateResponse {
  checkout_request_id: string;
  merchant_request_id: string;
  message: string;
}

export const orderService = {
  async checkout(data: CheckoutRequest): Promise<Order> {
    // Attach reCAPTCHA token for guest checkouts (silently skipped if not loaded)
    if (data.guest_email && !data.recaptcha_token) {
      data.recaptcha_token = await getRecaptchaToken("checkout");
    }
    const res = await api.post<Order>(`${BASE}/checkout`, data);
    // Store guest credentials in sessionStorage for later order lookup
    if (!res.data.user_id && res.data.guest_token) {
      sessionStorage.setItem("ub_guest_email", data.guest_email || "");
      sessionStorage.setItem("ub_guest_token", res.data.guest_token);
    }
    return res.data;
  },

  async listOrders(page = 1, limit = 10): Promise<Order[]> {
    const res = await api.get<Order[]>(BASE, { params: { page, limit } });
    return res.data;
  },

  async getOrder(orderNumber: string): Promise<Order> {
    const guestEmail = sessionStorage.getItem("ub_guest_email");
    const guestToken = sessionStorage.getItem("ub_guest_token");
    const params: Record<string, string> = {};
    if (guestEmail) params.guest_email = guestEmail;
    if (guestToken) params.guest_token = guestToken;
    const res = await api.get<Order>(`${BASE}/${orderNumber}`, {
      params: Object.keys(params).length ? params : undefined,
    });
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

  async retryPaystack(orderNumber: string): Promise<{ authorization_url: string; reference: string; access_code: string }> {
    const res = await api.post(`/api/v1/payments/paystack/retry/${orderNumber}`);
    return res.data;
  },

  async verifyPaystack(reference: string): Promise<{ status: string; message: string }> {
    const res = await api.get(`/api/v1/payments/paystack/verify/${reference}`);
    return res.data;
  },
};
