import { useEffect, useState } from "react";
import { TrendingUp, ShoppingBag, Users, DollarSign, AlertCircle } from "lucide-react";
import api from "../../services/api";
import { formatKSh, formatDate } from "../../utils/formatPrice";
import Badge from "../../components/ui/Badge";
import { ORDER_STATUSES } from "../../utils/constants";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const PERIODS = ["7d", "30d", "90d"] as const;

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState<typeof PERIODS[number]>("30d");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get(`/api/v1/admin/dashboard/overview?period=${period}`),
      api.get(`/api/v1/admin/dashboard/sales-chart?period=${period}`),
      api.get("/api/v1/admin/dashboard/top-products"),
      api.get("/api/v1/admin/dashboard/low-stock"),
      api.get("/api/v1/admin/dashboard/recent-orders"),
    ])
      .then(([ov, ch, tp, ls, ro]) => {
        setOverview(ov.data);
        setChart(ch.data);
        setTopProducts(tp.data);
        setLowStock(ls.data);
        setRecentOrders(ro.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [period]);

  const kpis = overview
    ? [
        { label: "Revenue", value: formatKSh(overview.revenue), icon: <DollarSign size={20} />, trend: overview.revenue_trend },
        { label: "Orders", value: overview.orders, icon: <ShoppingBag size={20} />, trend: overview.orders_trend },
        { label: "Customers", value: overview.customers, icon: <Users size={20} />, trend: null },
        { label: "Avg Order Value", value: formatKSh(overview.avg_order_value), icon: <TrendingUp size={20} />, trend: null },
      ]
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-lexend text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-manrope font-medium rounded-md transition-colors ${
                p === period ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 h-24 animate-pulse bg-gray-50" />
            ))
          : kpis.map(({ label, value, icon, trend }) => (
              <div key={label} className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-manrope text-gray-500">{label}</span>
                  <div className="w-8 h-8 bg-maroon-50 rounded-lg flex items-center justify-center text-maroon-700">
                    {icon}
                  </div>
                </div>
                <p className="text-2xl font-bold font-lexend text-gray-900">{value}</p>
                {trend !== null && trend !== undefined && (
                  <p className={`text-xs font-manrope mt-1 ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% vs prev period
                  </p>
                )}
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sales chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold font-lexend text-gray-900 mb-4">Sales Over Time</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "Manrope" }} />
              <YAxis tick={{ fontSize: 11, fontFamily: "Manrope" }} />
              <Tooltip
                formatter={(value: any) => [formatKSh(value), "Revenue"]}
                labelStyle={{ fontFamily: "Manrope", fontSize: 12 }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#782121" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Low stock alerts */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-yellow-500" />
            <h2 className="font-semibold font-lexend text-gray-900">Low Stock</h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-500 font-manrope">All stock levels are OK.</p>
          ) : (
            <div className="space-y-3">
              {lowStock.slice(0, 6).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-manrope text-gray-900 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500 font-manrope">{item.size} · {item.color_name}</p>
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

      {/* Recent orders + top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <h2 className="px-5 py-4 font-semibold font-lexend text-gray-900 border-b border-gray-100">Recent Orders</h2>
          <div className="divide-y divide-gray-50">
            {recentOrders.slice(0, 5).map((order: any) => {
              const statusInfo = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];
              return (
                <div key={order.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-manrope font-semibold text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-500 font-manrope">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusInfo?.color as any ?? "default"} size="sm">
                      {statusInfo?.label ?? order.status}
                    </Badge>
                    <span className="text-sm font-bold font-manrope text-gray-900">{formatKSh(order.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <h2 className="px-5 py-4 font-semibold font-lexend text-gray-900 border-b border-gray-100">Top Products</h2>
          <div className="divide-y divide-gray-50">
            {topProducts.slice(0, 5).map((p: any, i: number) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <span className="text-lg font-bold font-lexend text-gray-200 w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-manrope font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 font-manrope">{p.total_sold} sold</p>
                </div>
                <span className="text-sm font-bold font-manrope text-gray-900">{formatKSh(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
