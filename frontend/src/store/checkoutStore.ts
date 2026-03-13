import { create } from "zustand";
import type { Address } from "../types";

export type CheckoutStep = "shipping" | "payment" | "review";
export type PaymentMethod = "mpesa" | "stripe" | "cod";

interface ShippingData {
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  county: string;
  save_address?: boolean;
}

interface CheckoutState {
  step: CheckoutStep;
  shippingData: ShippingData | null;
  paymentMethod: PaymentMethod | null;
  mpesaPhone: string;
  couponCode: string;
  couponDiscount: number;
  shippingCost: number;
  orderId: string | null;
  orderNumber: string | null;
  isProcessing: boolean;
  error: string | null;

  setStep: (step: CheckoutStep) => void;
  setShippingData: (data: ShippingData) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setMpesaPhone: (phone: string) => void;
  setCoupon: (code: string, discount: number) => void;
  clearCoupon: () => void;
  setShippingCost: (cost: number) => void;
  setOrder: (id: string, number: string) => void;
  setProcessing: (v: boolean) => void;
  setError: (msg: string | null) => void;
  resetCheckout: () => void;
  prefillFromAddress: (address: Address) => void;
}

const initialState = {
  step: "shipping" as CheckoutStep,
  shippingData: null,
  paymentMethod: null,
  mpesaPhone: "",
  couponCode: "",
  couponDiscount: 0,
  shippingCost: 0,
  orderId: null,
  orderNumber: null,
  isProcessing: false,
  error: null,
};

export const useCheckoutStore = create<CheckoutState>()((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  setShippingData: (data) => set({ shippingData: data }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setMpesaPhone: (phone) => set({ mpesaPhone: phone }),

  setCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),

  clearCoupon: () => set({ couponCode: "", couponDiscount: 0 }),

  setShippingCost: (cost) => set({ shippingCost: cost }),

  setOrder: (id, number) => set({ orderId: id, orderNumber: number }),

  setProcessing: (v) => set({ isProcessing: v }),

  setError: (msg) => set({ error: msg }),

  resetCheckout: () => set(initialState),

  prefillFromAddress: (address) =>
    set({
      shippingData: {
        full_name: address.full_name,
        phone: address.phone,
        address_line_1: address.address_line_1,
        address_line_2: address.address_line_2,
        city: address.city,
        county: address.county,
      },
    }),
}));
