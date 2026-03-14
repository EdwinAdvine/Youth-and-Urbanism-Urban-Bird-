import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Package, CheckCircle, Truck, MapPin, Clock, XCircle } from "lucide-react";
import api from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { formatKSh, formatDate } from "../utils/formatPrice";
import { useSEO } from "../hooks/useSEO";

const STATUS_STEPS = [
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const STATUS_ORDER = ["pending_payment", "confirmed", "processing", "shipped", "out_for_delivery", "delivered"];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Pending Payment", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  confirmed: { label: "Confirmed", color: "text-blue-700 bg-blue-50 border-blue-200" },
  processing: { label: "Processing", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  shipped: { label: "Shipped", color: "text-purple-700 bg-purple-50 border-purple-200" },
  out_for_delivery: { label: "Out for Delivery", color: "text-orange-700 bg-orange-50 border-orange-200" },
  delivered: { label: "Delivered", color: "text-green-700 bg-green-50 border-green-200" },
  cancelled: { label: "Cancelled", color: "text-red-700 bg-red-50 border-red-200" },
  refunded: { label: "Refunded", color: "text-gray-700 bg-gray-50 border-gray-200" },
  returned: { label: "Returned", color: "text-gray-700 bg-gray-50 border-gray-200" },
};

interface TrackedOrder {
  order_number: string;
  status: string;
  created_at: string;
  total: number;
  shipping_full_name: string;
  shipping_city: string;
  shipping_county: string;
  tracking_number: string | null;
  items: {
    product_name: string;
    size: string;
    color_name: string;
    quantity: number;
    unit_price: number;
    product_image: string | null;
  }[];
}

export default function TrackOrderPage() {
  useSEO({
    title: "Track My Order",
    description: "Track the status of your Urban Bird order. Enter your order number and email to get real-time updates.",
  });

  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOrder(null);
    setLoading(true);
    try {
      const res = await api.get("/api/v1/orders/track", {
        params: { order_number: orderNumber.trim().toUpperCase(), email: email.trim() },
      });
      setOrder(res.data);
    } catch (err: any) {
      setError(
        err.response?.status === 404
          ? "No order found with that order number and email. Please check your details and try again."
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (status: string) => STATUS_ORDER.indexOf(status);

  const isCancelled = order && ["cancelled", "refunded", "returned"].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-maroon-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-maroon-700" />
          </div>
          <h1 className="text-3xl font-bold font-lexend text-gray-900">Track Your Order</h1>
          <p className="text-gray-500 font-manrope mt-2">
            Enter your order number and the email address used when placing the order.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Order Number"
              placeholder="e.g. UB-20260314-12345"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="The email used when ordering"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-4">
                <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-manrope text-red-700">{error}</p>
              </div>
            )}
            <Button type="submit" isLoading={loading} className="w-full">
              Track Order
            </Button>
          </form>
          <p className="text-xs text-gray-400 font-manrope text-center mt-4">
            Have an account?{" "}
            <Link to="/account/orders" className="text-maroon-700 hover:underline font-medium">
              View all orders in My Account
            </Link>
          </p>
        </div>

        {/* Result */}
        {order && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Order header */}
            <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold font-lexend text-gray-900">{order.order_number}</h2>
                <p className="text-sm text-gray-500 font-manrope mt-0.5">
                  Placed on {formatDate(order.created_at)} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                </p>
              </div>
              {STATUS_LABELS[order.status] && (
                <span className={`text-xs font-semibold font-manrope px-3 py-1.5 rounded-full border ${STATUS_LABELS[order.status].color}`}>
                  {STATUS_LABELS[order.status].label}
                </span>
              )}
            </div>

            {/* Progress tracker (only for active statuses) */}
            {!isCancelled && (
              <div className="px-6 py-6 border-b border-gray-100">
                <div className="flex items-center">
                  {STATUS_STEPS.map((step, i) => {
                    const currentIdx = getStepIndex(order.status);
                    const stepIdx = getStepIndex(step.key);
                    const done = stepIdx <= currentIdx;
                    const active = step.key === order.status;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex-1 flex items-center">
                        <div className="flex flex-col items-center min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                            done ? "bg-maroon-700 text-white" : "bg-gray-100 text-gray-300"
                          } ${active ? "ring-2 ring-maroon-300 ring-offset-1" : ""}`}>
                            <Icon size={16} />
                          </div>
                          <span className={`text-[10px] sm:text-xs font-manrope mt-1.5 text-center leading-tight max-w-[60px] ${
                            done ? "text-maroon-700 font-semibold" : "text-gray-400"
                          }`}>
                            {step.label}
                          </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 sm:mx-2 mb-5 ${
                            getStepIndex(STATUS_STEPS[i + 1].key) <= currentIdx ? "bg-maroon-700" : "bg-gray-200"
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tracking number */}
            {order.tracking_number && (
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-blue-50/50">
                <Truck size={16} className="text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-manrope">Tracking Number</p>
                  <p className="text-sm font-semibold font-manrope text-gray-900">{order.tracking_number}</p>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="divide-y divide-gray-50">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-4 px-6 py-4">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-14 h-18 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                    />
                  ) : (
                    <div className="w-14 h-18 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold font-manrope text-gray-900">{item.product_name}</p>
                    <p className="text-xs text-gray-500 font-manrope mt-0.5">
                      {item.size} · {item.color_name} · Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-bold font-manrope text-gray-900 flex-shrink-0">
                    {formatKSh(item.unit_price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-manrope text-gray-500">
                <MapPin size={14} className="text-maroon-400" />
                {order.shipping_city}, {order.shipping_county}
              </div>
              <div className="text-sm font-bold font-manrope text-gray-900">
                Total: <span className="text-maroon-700">{formatKSh(order.total)}</span>
              </div>
            </div>

            {/* Help */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400 font-manrope">
              <Clock size={13} />
              Questions about your order? Email us at{" "}
              <a href="mailto:hello@urbanbird.co.ke" className="text-maroon-700 hover:underline">
                hello@urbanbird.co.ke
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
