import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Package, RotateCcw, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { useOrderStore } from "../../store/orderStore";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { formatKSh, formatDate } from "../../utils/formatPrice";
import { ORDER_STATUSES } from "../../utils/constants";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useSEO } from "../../hooks/useSEO";

const RETURN_REASONS = [
  { value: "wrong_size", label: "Wrong Size" },
  { value: "doesnt_fit", label: "Doesn't Fit" },
  { value: "defective", label: "Defective / Damaged" },
  { value: "not_as_described", label: "Not as Described" },
  { value: "changed_mind", label: "Changed Mind" },
  { value: "other", label: "Other" },
];

const RETURN_STATUS_STEPS = [
  { key: "requested", label: "Requested", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle },
  { key: "item_received", label: "Item Received", icon: Package },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

const RESOLUTION_LABELS: Record<string, string> = {
  refund: "Refund",
  exchange: "Exchange",
  store_credit: "Store Credit",
};

interface ReturnRequest {
  id: string;
  reason: string;
  status: string;
  resolution_type: string | null;
  refund_amount: number | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default function OrderDetailPage() {
  useSEO({ title: "Order Details", noindex: true });
  const { id } = useParams<{ id: string }>();
  const { currentOrder, isLoading, fetchOrder, cancelOrder } = useOrderStore();

  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState("wrong_size");
  const [returnNote, setReturnNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchOrder(id);
  }, [id]);

  useEffect(() => {
    if (id) {
      setReturnsLoading(true);
      api.get(`/api/v1/orders/${id}/returns`)
        .then((r) => setReturns(r.data))
        .catch(() => {})
        .finally(() => setReturnsLoading(false));
    }
  }, [id]);

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-manrope">Loading…</div>;
  if (!currentOrder) return <div className="p-8 text-center text-gray-500 font-manrope">Order not found.</div>;

  const o = currentOrder;
  const statusInfo = ORDER_STATUSES[o.status as keyof typeof ORDER_STATUSES];
  const activeReturn = returns[0] ?? null;
  const canRequestReturn = o.status === "delivered" && !activeReturn;

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      await cancelOrder(o.order_number);
      toast.success("Order cancelled.");
    } catch {
      toast.error("Could not cancel order.");
    }
  };

  const handleSubmitReturn = async () => {
    setSubmitting(true);
    try {
      await api.post(`/api/v1/orders/${o.order_number}/return`, {
        items: o.items?.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
        })) ?? [],
        reason: returnReason,
        customer_note: returnNote.trim() || null,
      });
      toast.success("Return request submitted! We'll review it within 1–2 business days.");
      setShowReturnForm(false);
      // Reload returns
      const r = await api.get(`/api/v1/orders/${o.order_number}/returns`);
      setReturns(r.data);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to submit return request.");
    } finally {
      setSubmitting(false);
    }
  };

  const getReturnStepIndex = (status: string) => {
    if (status === "rejected") return -1;
    return RETURN_STATUS_STEPS.findIndex((s) => s.key === status);
  };

  return (
    <div>
      <Link to="/account/orders" className="flex items-center gap-1 text-sm text-gray-500 font-manrope hover:text-maroon-700 mb-5 transition-colors">
        <ChevronLeft size={16} /> Back to Orders
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold font-lexend text-gray-900">{o.order_number}</h1>
            <p className="text-sm text-gray-500 font-manrope mt-1">Placed on {formatDate(o.created_at)}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={statusInfo?.color as any ?? "default"} size="md">
              {statusInfo?.label ?? o.status}
            </Badge>
            {["pending_payment", "confirmed"].includes(o.status) && (
              <Button variant="danger" size="sm" onClick={handleCancel}>
                Cancel Order
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Items */}
        <div className="md:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <h2 className="px-6 py-4 font-semibold font-lexend text-gray-900 border-b border-gray-100">Items</h2>
            <div className="divide-y divide-gray-50">
              {o.items?.map((item) => (
                <div key={item.id} className="flex gap-4 p-4">
                  {item.product_image && (
                    <img src={item.product_image} alt={item.product_name} className="w-16 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold font-manrope text-gray-900">{item.product_name}</p>
                    <p className="text-xs text-gray-500 font-manrope">{item.size} · {item.color_name}</p>
                    <p className="text-xs text-gray-500 font-manrope">SKU: {item.variant_sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold font-manrope text-gray-900">{formatKSh(item.unit_price)}</p>
                    <p className="text-xs text-gray-500 font-manrope">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Return Section ── */}
          {(activeReturn || canRequestReturn) && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold font-lexend text-gray-900 flex items-center gap-2">
                  <RotateCcw size={16} className="text-maroon-700" /> Returns
                </h2>
                {canRequestReturn && !showReturnForm && (
                  <button
                    onClick={() => setShowReturnForm(true)}
                    className="text-xs text-maroon-700 hover:text-maroon-800 font-manrope font-medium border border-maroon-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Request a Return
                  </button>
                )}
              </div>

              {/* Return form */}
              {showReturnForm && (
                <div className="p-6 space-y-4">
                  <p className="text-sm text-gray-600 font-manrope">
                    We accept returns within 7 days of delivery. Please select a reason and we'll review your request within 1–2 business days.
                  </p>
                  <div>
                    <label className="block text-xs font-manrope font-medium text-gray-500 mb-1.5">Reason for Return *</label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                    >
                      {RETURN_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-manrope font-medium text-gray-500 mb-1.5">Additional Details (optional)</label>
                    <textarea
                      value={returnNote}
                      onChange={(e) => setReturnNote(e.target.value)}
                      rows={3}
                      placeholder="Describe the issue with your order…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowReturnForm(false)}
                      className="flex-1 border border-gray-200 text-gray-700 font-manrope text-sm rounded-lg py-2.5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReturn}
                      disabled={submitting}
                      className="flex-1 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-60 text-white font-manrope text-sm font-medium rounded-lg py-2.5"
                    >
                      {submitting ? "Submitting…" : "Submit Return Request"}
                    </button>
                  </div>
                </div>
              )}

              {/* Return status tracker */}
              {activeReturn && !returnsLoading && (
                <div className="p-6">
                  {activeReturn.status === "rejected" ? (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                      <XCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold font-manrope text-red-800">Return Not Approved</p>
                        {activeReturn.admin_note && (
                          <p className="text-sm font-manrope text-red-700 mt-1">{activeReturn.admin_note}</p>
                        )}
                        <p className="text-xs text-red-500 font-manrope mt-2">
                          Questions? Contact us at hello@urbanbird.co.ke
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Progress steps */}
                      <div className="flex items-center mb-6">
                        {RETURN_STATUS_STEPS.map((step, i) => {
                          const currentIdx = getReturnStepIndex(activeReturn.status);
                          const done = i <= currentIdx;
                          const active = i === currentIdx;
                          return (
                            <div key={step.key} className="flex-1 flex items-center">
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                  done ? "bg-maroon-700 text-white" : "bg-gray-100 text-gray-400"
                                } ${active ? "ring-2 ring-maroon-300" : ""}`}>
                                  {done ? <CheckCircle size={16} /> : i + 1}
                                </div>
                                <span className={`text-xs font-manrope mt-1.5 text-center leading-tight ${done ? "text-maroon-700 font-medium" : "text-gray-400"}`}>
                                  {step.label}
                                </span>
                              </div>
                              {i < RETURN_STATUS_STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < currentIdx ? "bg-maroon-700" : "bg-gray-200"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Status details */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm font-manrope">
                          <span className="text-gray-500">Reason</span>
                          <span className="text-gray-900 font-medium capitalize">
                            {RETURN_REASONS.find((r) => r.value === activeReturn.reason)?.label ?? activeReturn.reason}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-manrope">
                          <span className="text-gray-500">Submitted</span>
                          <span className="text-gray-900">{formatDate(activeReturn.created_at)}</span>
                        </div>
                        {activeReturn.resolution_type && (
                          <div className="flex justify-between text-sm font-manrope">
                            <span className="text-gray-500">Resolution</span>
                            <span className="text-gray-900 font-medium capitalize">
                              {RESOLUTION_LABELS[activeReturn.resolution_type] ?? activeReturn.resolution_type}
                            </span>
                          </div>
                        )}
                        {activeReturn.refund_amount && (
                          <div className="flex justify-between text-sm font-manrope">
                            <span className="text-gray-500">Refund Amount</span>
                            <span className="font-bold text-green-700">{formatKSh(activeReturn.refund_amount)}</span>
                          </div>
                        )}
                        {activeReturn.resolved_at && (
                          <div className="flex justify-between text-sm font-manrope">
                            <span className="text-gray-500">Resolved</span>
                            <span className="text-gray-900">{formatDate(activeReturn.resolved_at)}</span>
                          </div>
                        )}
                      </div>

                      {activeReturn.admin_note && (
                        <div className="mt-3 bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                          <p className="text-xs font-manrope font-medium text-yellow-800 mb-1">Note from Urban Bird</p>
                          <p className="text-sm font-manrope text-yellow-900">{activeReturn.admin_note}</p>
                        </div>
                      )}

                      {activeReturn.status === "approved" && (
                        <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4">
                          <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm font-manrope text-blue-800">
                            Please ship the item(s) back to us. Once received, we'll process your {RESOLUTION_LABELS[activeReturn.resolution_type ?? ""] ?? "resolution"}.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold font-lexend text-gray-900 mb-4">Summary</h2>
            <div className="space-y-2 text-sm font-manrope">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatKSh(o.subtotal)}</span></div>
              {o.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatKSh(o.discount_amount)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatKSh(o.shipping_cost)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2 mt-2">
                <span>Total</span><span className="text-maroon-700">{formatKSh(o.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold font-lexend text-gray-900 mb-3">Shipping Address</h2>
            <div className="text-sm font-manrope text-gray-600 space-y-0.5">
              <p>{o.shipping_full_name}</p>
              <p>{o.shipping_phone}</p>
              <p>{o.shipping_address_line_1}</p>
              {o.shipping_address_line_2 && <p>{o.shipping_address_line_2}</p>}
              <p>{o.shipping_city}, {o.shipping_county}</p>
            </div>
          </div>

          {o.tracking_number && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold font-lexend text-gray-900 mb-2">Tracking</h2>
              <p className="text-sm font-manrope text-gray-600">{o.tracking_number}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
