import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import api from "../../services/api";
import { formatKSh, formatDate } from "../../utils/formatPrice";
import Badge from "../../components/ui/Badge";
import { ORDER_STATUSES } from "../../utils/constants";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("q", search);
    if (statusFilter) params.set("status", statusFilter);
    api.get(`/api/v1/admin/orders?${params}`)
      .then((r) => { setOrders(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-lexend text-gray-900">Orders</h1>
        <span className="text-sm text-gray-500 font-manrope">{total} orders</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load(); }}
            placeholder="Search order number or customer…"
            className="w-full pl-9 pr-3 py-2 text-sm font-manrope border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-700"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
        >
          <option value="">All Statuses</option>
          {Object.entries(ORDER_STATUSES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 font-manrope uppercase">
            <tr>
              {["Order", "Customer", "Date", "Items", "Total", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : orders.map((o) => {
                  const statusInfo = ORDER_STATUSES[o.status as keyof typeof ORDER_STATUSES];
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium font-manrope text-gray-900">{o.order_number}</td>
                      <td className="px-4 py-3 text-gray-700 font-manrope">{o.user?.first_name} {o.user?.last_name}</td>
                      <td className="px-4 py-3 text-gray-500 font-manrope">{formatDate(o.created_at)}</td>
                      <td className="px-4 py-3 text-gray-700 font-manrope">{o.item_count}</td>
                      <td className="px-4 py-3 font-bold font-manrope text-gray-900">{formatKSh(o.total)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo?.color as any ?? "default"}>
                          {statusInfo?.label ?? o.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/orders/${o.id}`} className="text-maroon-700 hover:text-maroon-800">
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {orders.length === 0 && !isLoading && (
          <p className="text-center text-gray-500 font-manrope py-12">No orders found.</p>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => i + 1).slice(0, 10).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-sm font-manrope ${p === page ? "bg-maroon-700 text-white" : "border border-gray-200 text-gray-700"}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
