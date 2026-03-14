import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import api from "../../services/api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { formatKSh, formatDate } from "../../utils/formatPrice";
import { ORDER_STATUSES } from "../../utils/constants";
import toast from "react-hot-toast";
import { useSEO } from "../../hooks/useSEO";

const STATUS_FLOW = ["pending_payment", "confirmed", "processing", "shipped", "out_for_delivery", "delivered"];

export default function AdminOrderDetailPage() {
  useSEO({ title: "Order Detail", noindex: true });
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const load = () => {
    setIsLoading(true);
    api.get(`/api/v1/admin/orders/${id}`)
      .then((r) => { setOrder(r.data); setNewStatus(r.data.status); setTrackingNumber(r.data.tracking_number || ""); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { if (id) load(); }, [id]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await api.patch(`/api/v1/admin/orders/${id}/status`, { status: newStatus, tracking_number: trackingNumber || undefined, note: note || undefined });
      toast.success("Order updated!");
      load();
      setNote("");
    } catch {
      toast.error("Failed to update order.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="text-center text-gray-500 py-16">Loading…</div>;
  if (!order) return <div className="text-center text-gray-500 py-16">Order not found.</div>;

  const statusInfo = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];

  return (
    <div>
      <Link to="/admin/orders" className="flex items-center gap-1 text-sm text-gray-500 font-manrope hover:text-maroon-700 mb-5 transition-colors">
        <ChevronLeft size={16} /> Back to Orders
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500 font-manrope mt-1">
            Placed on {formatDate(order.created_at)} by {order.user?.first_name} {order.user?.last_name}
          </p>
        </div>
        <Badge variant={statusInfo?.color as any ?? "default"} size="md">
          {statusInfo?.label ?? order.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <h2 className="px-5 py-4 font-semibold font-lexend text-gray-900 border-b border-gray-100">Items</h2>
            <div className="divide-y divide-gray-50">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex gap-4 p-4">
                  {item.image_url && (
                    <img src={item.image_url} alt="" className="w-16 h-20 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold font-manrope text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-500 font-manrope">{item.size} · {item.color_name} · SKU: {item.sku}</p>
                    <p className="text-sm text-gray-700 font-manrope">×{item.quantity} @ {formatKSh(item.unit_price)}</p>
                  </div>
                  <p className="font-bold font-manrope text-gray-900">{formatKSh(Number(item.unit_price) * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 bg-gray-50 space-y-2 text-sm font-manrope">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatKSh(order.subtotal)}</span></div>
              {order.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatKSh(order.discount_amount)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatKSh(order.shipping_cost)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-maroon-700">{formatKSh(order.total)}</span></div>
            </div>
          </div>

          {/* Status update */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold font-lexend text-gray-900 mb-4">Update Order</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-manrope font-medium text-gray-700 block mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                >
                  {STATUS_FLOW.map((s) => (
                    <option key={s} value={s}>{ORDER_STATUSES[s as keyof typeof ORDER_STATUSES]?.label ?? s}</option>
                  ))}
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-manrope font-medium text-gray-700 block mb-1">Tracking Number</label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. UB123456"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
              </div>
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700 mb-4"
            />
            <Button onClick={handleUpdate} isLoading={isUpdating} size="sm">Update Order</Button>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold font-lexend text-gray-900 mb-3">Customer</h2>
            <p className="text-sm font-manrope text-gray-700">{order.user?.first_name} {order.user?.last_name}</p>
            <p className="text-sm font-manrope text-gray-500">{order.user?.email}</p>
            <p className="text-sm font-manrope text-gray-500">{order.user?.phone}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold font-lexend text-gray-900 mb-3">Shipping Address</h2>
            <div className="text-sm font-manrope text-gray-600 space-y-0.5">
              <p>{order.shipping_full_name}</p>
              <p>{order.shipping_phone}</p>
              <p>{order.shipping_address_line_1}</p>
              {order.shipping_address_line_2 && <p>{order.shipping_address_line_2}</p>}
              <p>{order.shipping_city}, {order.shipping_county}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold font-lexend text-gray-900 mb-2">Payment</h2>
            <p className="text-sm font-manrope text-gray-700 capitalize">{order.payment_method}</p>
            <p className="text-sm font-manrope text-gray-500">{order.payment?.status}</p>
          </div>

          {/* Status history */}
          {order.status_history?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-semibold font-lexend text-gray-900 mb-3">History</h2>
              <div className="space-y-2">
                {order.status_history.map((h: any) => (
                  <div key={h.id} className="text-xs font-manrope text-gray-500">
                    <span className="font-medium text-gray-700">{ORDER_STATUSES[h.new_status as keyof typeof ORDER_STATUSES]?.label ?? h.new_status}</span>
                    {" · "}{formatDate(h.created_at)}
                    {h.note && <p className="text-gray-400 ml-2">{h.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
