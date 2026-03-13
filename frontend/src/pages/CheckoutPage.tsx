import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { useCheckoutStore } from "../store/checkoutStore";
import type { CheckoutStep } from "../store/checkoutStore";
import { useAuthStore } from "../store/authStore";
import { formatKSh } from "../utils/formatPrice";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { KENYAN_COUNTIES } from "../utils/constants";
import api from "../services/api";
import { orderService } from "../services/orderService";
import toast from "react-hot-toast";

const STEPS: { key: CheckoutStep; label: string }[] = [
  { key: "shipping", label: "Shipping" },
  { key: "payment", label: "Payment" },
  { key: "review", label: "Review" },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const {
    step, setStep,
    shippingData, setShippingData,
    paymentMethod, setPaymentMethod,
    mpesaPhone, setMpesaPhone,
    couponCode, couponDiscount, setCoupon, clearCoupon,
    shippingCost, setShippingCost,
    isProcessing, setProcessing,
    error, setError,
    resetCheckout,
  } = useCheckoutStore();

  const [couponInput, setCouponInput] = useState("");
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [selectedRate, setSelectedRate] = useState<any>(null);

  const subtotal = cart?.subtotal ?? 0;
  const total = subtotal - couponDiscount + shippingCost;

  // Prefill M-Pesa phone with user's phone
  useEffect(() => {
    if (user?.phone && !mpesaPhone) setMpesaPhone(user.phone);
  }, [user]);

  const fetchShippingRates = async (county: string) => {
    try {
      const res = await api.get(`/api/v1/shipping/rates?county=${encodeURIComponent(county)}`);
      setShippingRates(res.data);
      if (res.data.length) {
        setSelectedRate(res.data[0]);
        setShippingCost(res.data[0].price);
      }
    } catch {}
  };

  const handleApplyCoupon = async () => {
    try {
      const res = await api.post("/api/v1/coupons/validate", { code: couponInput, order_amount: subtotal });
      setCoupon(couponInput, res.data.discount_amount);
      toast.success(`Coupon applied! -${formatKSh(res.data.discount_amount)}`);
    } catch {
      toast.error("Invalid or expired coupon");
    }
  };

  const handlePlaceOrder = async () => {
    if (!shippingData) return;
    setProcessing(true);
    setError(null);
    try {
      const payload = {
        shipping_full_name: shippingData.full_name,
        shipping_phone: shippingData.phone,
        shipping_address_line_1: shippingData.address_line_1,
        shipping_address_line_2: shippingData.address_line_2,
        shipping_city: shippingData.city,
        shipping_county: shippingData.county,
        shipping_rate_id: selectedRate?.id,
        payment_method: paymentMethod ?? "",
        coupon_code: couponCode || undefined,
        mpesa_phone: paymentMethod === "mpesa" ? mpesaPhone : undefined,
      };
      const order = await orderService.checkout(payload);
      resetCheckout();
      navigate(`/order-confirmation/${order.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to place order");
      toast.error("Failed to place order");
    } finally {
      setProcessing(false);
    }
  };

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="container-custom py-8 max-w-4xl">
      <h1 className="text-3xl font-bold font-lexend text-gray-900 mb-8">Checkout</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map(({ key, label }, i) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${i <= stepIdx ? "text-maroon-700" : "text-gray-400"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-manrope border-2 ${
                i < stepIdx ? "bg-maroon-700 border-maroon-700 text-white" :
                i === stepIdx ? "border-maroon-700 text-maroon-700" :
                "border-gray-300 text-gray-400"
              }`}>
                {i < stepIdx ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className="text-sm font-manrope font-medium hidden sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight size={16} className="text-gray-300" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main form */}
        <div className="lg:col-span-2">
          {/* Step 1: Shipping */}
          {step === "shipping" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const data = Object.fromEntries(fd.entries()) as any;
                setShippingData(data);
                fetchShippingRates(data.county);
                setStep("payment");
              }}
              className="bg-white rounded-xl border border-gray-100 p-6 space-y-4"
            >
              <h2 className="font-bold font-lexend text-gray-900 text-lg mb-2">Shipping Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name" name="full_name" defaultValue={shippingData?.full_name || `${user?.first_name} ${user?.last_name}`} required />
                <Input label="Phone" name="phone" type="tel" defaultValue={shippingData?.phone || user?.phone || ""} required />
              </div>
              <Input label="Address Line 1" name="address_line_1" defaultValue={shippingData?.address_line_1 || ""} required />
              <Input label="Address Line 2 (optional)" name="address_line_2" defaultValue={shippingData?.address_line_2 || ""} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City / Town" name="city" defaultValue={shippingData?.city || ""} required />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700 font-manrope">County</label>
                  <select name="county" defaultValue={shippingData?.county || ""} required
                    className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700">
                    <option value="">Select county</option>
                    {KENYAN_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <Button type="submit" fullWidth size="lg">Continue to Payment</Button>
            </form>
          )}

          {/* Step 2: Payment */}
          {step === "payment" && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
              <h2 className="font-bold font-lexend text-gray-900 text-lg">Payment Method</h2>

              {/* Shipping method selection */}
              {shippingRates.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 font-manrope mb-2">Shipping Method</p>
                  <div className="space-y-2">
                    {shippingRates.map((rate) => (
                      <label key={rate.id} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedRate?.id === rate.id ? "border-maroon-700 bg-maroon-50" : "border-gray-200 hover:border-gray-300"
                      }`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping_rate"
                            checked={selectedRate?.id === rate.id}
                            onChange={() => { setSelectedRate(rate); setShippingCost(rate.price); }}
                            className="text-maroon-700"
                          />
                          <span className="text-sm font-manrope font-medium capitalize">{rate.method}</span>
                        </div>
                        <span className="text-sm font-manrope font-bold">
                          {rate.price === 0 ? "Free" : formatKSh(rate.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment options */}
              <div>
                <p className="text-sm font-semibold text-gray-700 font-manrope mb-2">Pay With</p>
                <div className="space-y-2">
                  {[
                    { value: "mpesa", label: "M-Pesa", desc: "Pay via M-Pesa STK Push" },
                    { value: "stripe", label: "Card (Visa / Mastercard)", desc: "Secure card payment" },
                    { value: "cod", label: "Cash on Delivery", desc: "Pay when your order arrives" },
                  ].map(({ value, label, desc }) => (
                    <label key={value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      paymentMethod === value ? "border-maroon-700 bg-maroon-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <input
                        type="radio"
                        name="payment"
                        value={value}
                        checked={paymentMethod === value}
                        onChange={() => setPaymentMethod(value as any)}
                        className="text-maroon-700"
                      />
                      <div>
                        <p className="text-sm font-manrope font-semibold text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500 font-manrope">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* M-Pesa phone */}
              {paymentMethod === "mpesa" && (
                <Input
                  label="M-Pesa Phone Number"
                  type="tel"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  hint="You will receive an STK Push to complete payment"
                />
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("shipping")}>Back</Button>
                <Button
                  fullWidth
                  onClick={() => setStep("review")}
                  disabled={!paymentMethod}
                >
                  Review Order
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === "review" && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
              <h2 className="font-bold font-lexend text-gray-900 text-lg">Review Your Order</h2>

              {shippingData && (
                <div className="text-sm font-manrope text-gray-600 bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold text-gray-900 mb-1">Shipping to:</p>
                  <p>{shippingData.full_name} · {shippingData.phone}</p>
                  <p>{shippingData.address_line_1}, {shippingData.city}, {shippingData.county}</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-manrope">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("payment")}>Back</Button>
                <Button
                  fullWidth
                  size="lg"
                  isLoading={isProcessing}
                  onClick={handlePlaceOrder}
                >
                  Place Order · {formatKSh(total)}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
            <h2 className="font-bold font-lexend text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {cart?.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-14 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                    {item.variant.product?.primary_image && (
                      <img src={item.variant.product.primary_image} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-manrope font-medium text-gray-900 truncate">{item.variant.product?.name}</p>
                    <p className="text-xs text-gray-500 font-manrope">{item.variant.size} · ×{item.quantity}</p>
                  </div>
                  <span className="text-xs font-bold font-manrope text-gray-900 flex-shrink-0">
                    {formatKSh(Number(item.unit_price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-1 focus:ring-maroon-700"
              />
              {couponDiscount > 0 ? (
                <Button size="sm" variant="ghost" onClick={clearCoupon}>Remove</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={handleApplyCoupon}>Apply</Button>
              )}
            </div>

            <div className="space-y-2 text-sm font-manrope border-t border-gray-100 pt-4">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatKSh(subtotal)}</span></div>
              {couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatKSh(couponDiscount)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{shippingCost === 0 ? "Free" : formatKSh(shippingCost)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2 mt-2">
                <span>Total</span><span className="text-maroon-700">{formatKSh(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
