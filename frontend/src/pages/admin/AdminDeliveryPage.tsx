import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface DeliveryOverview {
  pending_dispatch: number;
  in_transit: number;
  delivered_today: number;
}

interface DeliveryOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_address: string;
  status: string;
  items_count: number;
  total: number;
  created_at: string;
}

export default function AdminDeliveryPage() {
  const [overview, setOverview] = useState<DeliveryOverview>({ pending_dispatch: 0, in_transit: 0, delivered_today: 0 });
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState<Record<number, string>>({});
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ovRes, ordRes] = await Promise.all([
        api.get('/api/v1/admin/delivery/overview'),
        api.get('/api/v1/admin/delivery/orders'),
      ]);
      setOverview(ovRes.data?.data ?? ovRes.data ?? { pending_dispatch: 0, in_transit: 0, delivered_today: 0 });
      setOrders(ordRes.data?.data ?? ordRes.data ?? []);
    } catch {
      toast.error('Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const dispatch = async (orderId: number) => {
    const tracking = trackingInputs[orderId]?.trim();
    if (!tracking) {
      toast.error('Please enter a tracking number');
      return;
    }
    try {
      setDispatchingId(orderId);
      await api.patch(`/api/v1/admin/delivery/orders/${orderId}/dispatch`, { tracking_number: tracking });
      toast.success('Order dispatched successfully');
      setTrackingInputs((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
      fetchData();
    } catch {
      toast.error('Failed to dispatch order');
    } finally {
      setDispatchingId(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'confirmed') return 'bg-blue-100 text-blue-700';
    if (status === 'processing') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(v);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="p-6 font-manrope min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">Delivery Management</h1>
          <p className="text-sm text-gray-500 mt-1">Dispatch orders and track shipments</p>
        </div>
        <button
          onClick={fetchData}
          className="text-sm text-[#782121] border border-[#782121] px-3 py-1.5 rounded-lg hover:bg-[#782121]/5 transition-colors font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-lg">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">Pending Dispatch</p>
          </div>
          <p className="text-3xl font-bold font-lexend text-orange-600">{overview.pending_dispatch}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">In Transit</p>
          </div>
          <p className="text-3xl font-bold font-lexend text-blue-600">{overview.in_transit}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">Delivered Today</p>
          </div>
          <p className="text-3xl font-bold font-lexend text-green-600">{overview.delivered_today}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="mb-4">
        <h2 className="text-base font-semibold font-lexend text-gray-800">Ready to Dispatch</h2>
        <p className="text-xs text-gray-400 mt-0.5">Orders with status: confirmed or processing</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#782121] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Address</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Items</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Dispatch</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-[#782121]">
                    #{order.order_number}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{order.customer_name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate" title={order.customer_address}>
                    {order.customer_address}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order.items_count}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="text"
                        placeholder="Tracking no."
                        value={trackingInputs[order.id] ?? ''}
                        onChange={(e) => setTrackingInputs((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-[#782121]"
                      />
                      <button
                        onClick={() => dispatch(order.id)}
                        disabled={dispatchingId === order.id}
                        className="text-xs bg-[#782121] text-white px-3 py-1.5 rounded-lg hover:bg-[#5e1a1a] disabled:opacity-50 font-medium whitespace-nowrap"
                      >
                        {dispatchingId === order.id ? '...' : 'Dispatch'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No orders ready to dispatch
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
