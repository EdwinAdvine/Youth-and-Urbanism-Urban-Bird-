import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useOrderStore } from "../../store/orderStore";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { formatKSh, formatDate } from "../../utils/formatPrice";
import { ORDER_STATUSES } from "../../utils/constants";
import toast from "react-hot-toast";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentOrder, isLoading, fetchOrder, cancelOrder } = useOrderStore();

  useEffect(() => {
    if (id) fetchOrder(id);
  }, [id]);

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-manrope">Loading…</div>;
  if (!currentOrder) return <div className="p-8 text-center text-gray-500 font-manrope">Order not found.</div>;

  const o = currentOrder;
  const statusInfo = ORDER_STATUSES[o.status as keyof typeof ORDER_STATUSES];

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      await cancelOrder(o.id);
      toast.success("Order cancelled.");
    } catch {
      toast.error("Could not cancel order.");
    }
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
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <h2 className="px-6 py-4 font-semibold font-lexend text-gray-900 border-b border-gray-100">Items</h2>
          <div className="divide-y divide-gray-50">
            {o.items?.map((item) => (
              <div key={item.id} className="flex gap-4 p-4">
                {item.image_url && (
                  <img src={item.image_url} alt={item.product_name} className="w-16 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-100" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-manrope text-gray-900">{item.product_name}</p>
                  <p className="text-xs text-gray-500 font-manrope">{item.size} · {item.color_name}</p>
                  <p className="text-xs text-gray-500 font-manrope">SKU: {item.sku}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold font-manrope text-gray-900">{formatKSh(item.unit_price)}</p>
                  <p className="text-xs text-gray-500 font-manrope">Qty: {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
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
