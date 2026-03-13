import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Heart, MapPin, ArrowRight } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useOrderStore } from "../../store/orderStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { formatKSh, formatDate } from "../../utils/formatPrice";
import Badge from "../../components/ui/Badge";
import { ORDER_STATUSES } from "../../utils/constants";

export default function AccountDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { orders, fetchOrders, isLoading } = useOrderStore();
  const wishlistCount = useWishlistStore((s) => s.productIds.length);

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const getStatusVariant = (status: string): any => {
    const s = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
    return s?.color ?? "default";
  };

  return (
    <div>
      {/* Welcome card */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
        <h1 className="text-2xl font-bold font-lexend text-gray-900">
          Hello, {user?.first_name}!
        </h1>
        <p className="text-gray-500 font-manrope mt-1">
          Manage your orders, addresses, and account settings.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Orders", value: orders.length, icon: <Package size={20} />, to: "/account/orders" },
          { label: "Wishlist Items", value: wishlistCount, icon: <Heart size={20} />, to: "/wishlist" },
          { label: "Saved Addresses", value: "—", icon: <MapPin size={20} />, to: "/account/addresses" },
        ].map(({ label, value, icon, to }) => (
          <Link key={to} to={to} className="bg-white rounded-xl p-5 border border-gray-100 flex items-center gap-4 hover:border-maroon-700 transition-colors group">
            <div className="w-10 h-10 bg-maroon-50 rounded-lg flex items-center justify-center text-maroon-700 group-hover:bg-maroon-100 transition-colors">
              {icon}
            </div>
            <div>
              <p className="text-xl font-bold font-lexend text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 font-manrope">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold font-lexend text-gray-900">Recent Orders</h2>
          <Link to="/account/orders" className="text-sm text-maroon-700 font-manrope font-medium flex items-center gap-1 hover:text-maroon-800">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500 font-manrope">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <Package size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-manrope">No orders yet.</p>
            <Link to="/shop" className="text-sm text-maroon-700 font-manrope font-medium mt-2 inline-block hover:underline">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 3).map((order) => (
              <Link
                key={order.id}
                to={`/account/orders/${order.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold font-manrope text-gray-900">{order.order_number}</p>
                  <p className="text-xs text-gray-500 font-manrope">{formatDate(order.created_at)} · {order.items?.length ?? 0} items</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusVariant(order.status)}>
                    {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES]?.label ?? order.status}
                  </Badge>
                  <span className="text-sm font-bold font-manrope text-gray-900">
                    {formatKSh(order.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
