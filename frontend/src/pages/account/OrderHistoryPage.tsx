import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronRight } from "lucide-react";
import { useOrderStore } from "../../store/orderStore";
import Badge from "../../components/ui/Badge";
import { formatKSh, formatDate } from "../../utils/formatPrice";
import { ORDER_STATUSES } from "../../utils/constants";

export default function OrderHistoryPage() {
  const { orders, isLoading, fetchOrders } = useOrderStore();

  useEffect(() => {
    fetchOrders(1);
  }, []);

  return (
    <div>
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
        <h1 className="text-xl font-bold font-lexend text-gray-900">My Orders</h1>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl p-8 text-center text-sm text-gray-500 font-manrope border border-gray-100">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <Package size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-manrope mb-4">You haven't placed any orders yet.</p>
          <Link to="/shop" className="text-sm text-maroon-700 font-manrope font-medium hover:underline">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {orders.map((order) => {
            const statusInfo = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];
            return (
              <Link
                key={order.id}
                to={`/account/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-manrope text-gray-900">{order.order_number}</p>
                  <p className="text-xs text-gray-500 font-manrope mt-0.5">
                    {formatDate(order.created_at)} · {order.items?.length ?? 0} items
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <Badge variant={statusInfo?.color as any ?? "default"}>
                    {statusInfo?.label ?? order.status}
                  </Badge>
                  <span className="text-sm font-bold font-manrope text-gray-900 hidden sm:block">
                    {formatKSh(order.total)}
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
