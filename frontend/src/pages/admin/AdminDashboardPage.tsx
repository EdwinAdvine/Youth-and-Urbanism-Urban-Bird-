import { useEffect, useState } from "react";
import {
  TrendingUp, ShoppingBag, Users, DollarSign,
  AlertCircle, Truck, RotateCcw, Bell, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useNotificationStore } from "../../store/notificationStore";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import api from "../../services/api";
import { formatKSh, formatDate } from "../../utils/formatPrice";
import Badge from "../../components/ui/Badge";
import { ORDER_STATUSES } from "../../utils/constants";
import { useSEO } from "../../hooks/useSEO";

const PERIODS = ["7d", "30d", "90d"] as const;

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#8b5cf6",
  shipped: "#06b6d4",
  out_for_delivery: "#f97316",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

const GATEWAY_COLORS: Record<string, string> = {
  paystack: "#00c3f7",
  cod: "#6b7280",
  mpesa: "#4caf50",
  stripe: "#635bff",
};

const GATEWAY_LABELS: Record<string, string> = {
  paystack: "Paystack",
  cod: "Cash on Delivery",
  mpesa: "M-Pesa",
  stripe: "Stripe",
};

const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  approved: "Approved",
  item_received: "Item Received",
  completed: "Completed",
  rejected: "Rejected",
};

const RETURN_STATUS_COLORS: Record<string, string> = {
  requested: "warning",
  approved: "info",
  item_received: "default",
  completed: "success",
  rejected: "danger",
};

export default function AdminDashboardPage() {
  useSEO({ title: "Dashboard", noindex: true });
  const [overview, setOverview] = useState<any>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState<any[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<any[]>([]);
  const [returnsSummary, setReturnsSummary] = useState<any>(null);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("30d");
  const [isLoading, setIsLoading] = useState(true);
  const { adminNotifications, adminUnreadCount, fetchAdminNotifications } = useNotificationStore();

  useEffect(() => {
    fetchAdminNotifications(1);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get(`/api/v1/admin/dashboard/overview?period=${period}`),
      api.get(`/api/v1/admin/dashboard/sales-chart?period=${period}`),
      api.get("/api/v1/admin/dashboard/top-products"),
      api.get("/api/v1/admin/dashboard/low-stock"),
      api.get("/api/v1/admin/dashboard/recent-orders"),
      api.get("/api/v1/admin/dashboard/order-status-breakdown"),
      api.get("/api/v1/admin/dashboard/payment-breakdown"),
      api.get("/api/v1/admin/dashboard/returns-summary"),
    ])
      .then(([ov, ch, tp, ls, ro, os, pb, rs]) => {
        setOverview(ov.data);
        setChart(ch.data);
        setTopProducts(tp.data);
        setLowStock(ls.data);
        setRecentOrders(ro.data);
        setOrderStatus(os.data);
        setPaymentBreakdown(pb.data);
        setReturnsSummary(rs.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [period]);

  const kpis = overview
    ? [
        {
          label: "Revenue",
          value: formatKSh(overview.revenue),
          icon: <DollarSign size={18} />,
          trend: overview.revenue_trend,
        },
        {
          label: "Orders",
          value: overview.orders,
          icon: <ShoppingBag size={18} />,
          trend: overview.orders_trend,
        },
        {
          label: "Avg Order Value",
          value: formatKSh(overview.avg_order_value),
          icon: <TrendingUp size={18} />,
          trend: null,
        },
        {
          label: "New Customers",
          value: overview.customers,
          icon: <Users size={18} />,
          trend: null,
        },
        {
          label: "To Dispatch",
          value: overview.orders_to_dispatch,
          icon: <Truck size={18} />,
          trend: null,
          accent: overview.orders_to_dispatch > 0 ? "orange" : "default",
        },
        {
          label: "Pending Returns",
          value: overview.pending_returns,
          icon: <RotateCcw size={18} />,
          trend: null,
          accent: overview.pending_returns > 0 ? "red" : "default",
        },
      ]
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-lexend text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-manrope font-medium rounded-md transition-colors ${
                p === period
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards — 3 cols on md, 6 on xl */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {isLoading
          ? Array(6)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-5 border border-gray-100 h-24 animate-pulse bg-gray-50"
                />
              ))
          : kpis.map(({ label, value, icon, trend, accent }) => {
              const accentClass =
                accent === "orange"
                  ? "bg-orange-50 text-orange-600"
                  : accent === "red"
                  ? "bg-red-50 text-red-600"
                  : "bg-maroon-50 text-maroon-700";
              return (
                <div key={label} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-manrope text-gray-500 leading-tight">{label}</span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentClass}`}>
                      {icon}
                    </div>
                  </div>
                  <p className="text-xl font-bold font-lexend text-gray-900">{value ?? "—"}</p>
                  {trend !== null && trend !== undefined && (
                    <p className={`text-xs font-manrope mt-0.5 ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% vs prev
                    </p>
                  )}
                </div>
              );
            })}
      </div>

      {/* Sales chart + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold font-lexend text-gray-900 mb-4">Revenue Over Time</h2>
          {chart.length === 0 ? (
            <p className="text-sm text-gray-400 font-manrope py-10 text-center">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "Manrope" }} />
                <YAxis tick={{ fontSize: 11, fontFamily: "Manrope" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any) => [formatKSh(value), "Revenue"]}
                  labelStyle={{ fontFamily: "Manrope", fontSize: 12 }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#782121" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Low stock */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-yellow-500" />
            <h2 className="font-semibold font-lexend text-gray-900">Low Stock</h2>
            {overview?.low_stock_count > 0 && (
              <span className="ml-auto text-xs font-manrope text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                {overview.low_stock_count} SKUs
              </span>
            )}
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-500 font-manrope">All stock levels are OK.</p>
          ) : (
            <div className="space-y-3">
              {lowStock.slice(0, 7).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-manrope text-gray-900 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500 font-manrope">
                      {item.size} · {item.color_name}
                    </p>
                  </div>
                  <Badge variant={item.stock_quantity <= 3 ? "danger" : "warning"}>
                    {item.stock_quantity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order status breakdown + Payment breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Order status */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold font-lexend text-gray-900 mb-4">Orders by Status</h2>
          {orderStatus.length === 0 ? (
            <p className="text-sm text-gray-400 font-manrope">No orders yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orderStatus} layout="vertical" margin={{ left: 16, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fontFamily: "Manrope" }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fontSize: 11, fontFamily: "Manrope" }}
                  tickFormatter={(v) => ORDER_STATUSES[v as keyof typeof ORDER_STATUSES]?.label ?? v}
                  width={110}
                />
                <Tooltip
                  formatter={(value: any) => [value, "Orders"]}
                  labelFormatter={(v) => ORDER_STATUSES[v as keyof typeof ORDER_STATUSES]?.label ?? v}
                  labelStyle={{ fontFamily: "Manrope", fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {orderStatus.map((entry: any) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] ?? "#9ca3af"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold font-lexend text-gray-900 mb-4">Payment Methods</h2>
          {paymentBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 font-manrope">No paid orders yet.</p>
          ) : (
            <div className="space-y-3">
              {paymentBreakdown.map((item: any) => {
                const totalRevenue = paymentBreakdown.reduce(
                  (sum: number, x: any) => sum + x.revenue,
                  0
                );
                const pct = totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0;
                const color = GATEWAY_COLORS[item.method] ?? "#9ca3af";
                return (
                  <div key={item.method}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-manrope text-gray-800">
                          {GATEWAY_LABELS[item.method] ?? item.method}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-manrope text-gray-500">{item.count} orders</span>
                        <span className="text-sm font-semibold font-manrope text-gray-900">
                          {formatKSh(item.revenue)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders + top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <h2 className="px-5 py-4 font-semibold font-lexend text-gray-900 border-b border-gray-100">
            Recent Orders
          </h2>
          <div className="divide-y divide-gray-50">
            {recentOrders.slice(0, 6).map((order: any) => {
              const statusInfo = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];
              return (
                <div key={order.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-manrope font-semibold text-gray-900">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-gray-500 font-manrope">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={(statusInfo?.color as any) ?? "default"} size="sm">
                      {statusInfo?.label ?? order.status}
                    </Badge>
                    <span className="text-sm font-bold font-manrope text-gray-900">
                      {formatKSh(order.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <h2 className="px-5 py-4 font-semibold font-lexend text-gray-900 border-b border-gray-100">
            Top Products
          </h2>
          <div className="divide-y divide-gray-50">
            {topProducts.slice(0, 6).map((p: any, i: number) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <span className="text-lg font-bold font-lexend text-gray-200 w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-manrope font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 font-manrope">{p.total_sold} sold</p>
                </div>
                <span className="text-sm font-bold font-manrope text-gray-900">
                  {formatKSh(p.revenue)}
                </span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400 font-manrope">No sales data yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent notifications */}
      {adminNotifications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-gray-400" />
              <h2 className="font-semibold font-lexend text-gray-900">Notifications</h2>
              {adminUnreadCount > 0 && (
                <span className="bg-maroon-700 text-white text-xs px-1.5 py-0.5 rounded-full font-manrope leading-none">
                  {adminUnreadCount} new
                </span>
              )}
            </div>
            <Link
              to="/admin/notifications"
              className="text-sm text-maroon-700 font-manrope font-medium flex items-center gap-1 hover:text-maroon-800"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {adminNotifications.slice(0, 5).map((n: any) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-5 py-3 ${!n.is_read ? "bg-maroon-50/40" : ""}`}
              >
                <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${!n.is_read ? "bg-maroon-100 text-maroon-700" : "bg-gray-100 text-gray-400"}`}>
                  <Bell size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-manrope ${!n.is_read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 font-manrope mt-0.5 truncate">{n.message}</p>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-maroon-700 flex-shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Returns summary */}
      {returnsSummary && returnsSummary.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw size={16} className="text-gray-400" />
            <h2 className="font-semibold font-lexend text-gray-900">
              Return Requests
            </h2>
            <span className="ml-auto text-sm font-manrope text-gray-500">
              {returnsSummary.total} total
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {returnsSummary.breakdown
              .filter((b: any) => b.count > 0)
              .map((b: any) => (
                <div
                  key={b.status}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <Badge variant={(RETURN_STATUS_COLORS[b.status] as any) ?? "default"} size="sm">
                    {RETURN_STATUS_LABELS[b.status] ?? b.status}
                  </Badge>
                  <span className="text-sm font-bold font-manrope text-gray-800">{b.count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
