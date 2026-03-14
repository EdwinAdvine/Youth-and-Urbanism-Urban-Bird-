import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useSEO } from "../../hooks/useSEO";

type Period = '7d' | '30d' | '90d';

interface SalesData {
  summary: {
    total_revenue: number;
    total_orders: number;
    average_order_value: number;
    revenue_growth: number;
  };
  revenue_by_day: { date: string; revenue: number; orders: number }[];
  top_categories: { category: string; revenue: number; orders: number }[];
  orders_by_status: { status: string; count: number }[];
}

interface CustomerData {
  new_customers: number;
  new_customer_growth: number | null;
  total_customers: number;
  repeat_buyers: number;
  unique_buyers: number;
  repeat_rate: number;
  avg_lifetime_value: number;
  guest_orders: number;
  registered_orders: number;
}

interface ProductRow {
  id: string;
  name: string;
  units_sold: number;
  revenue: number;
  order_count: number;
  avg_order_qty: number;
  price: number;
  total_stock: number;
  margin_pct: number | null;
}

interface GeoRow {
  city: string;
  county: string;
  orders: number;
  revenue: number;
  avg_order: number;
}

interface HeatmapPoint {
  dow: number;
  hour: number;
  count: number;
}

interface FunnelStage {
  stage: string;
  status: string;
  count: number;
  pct: number;
}

interface PaymentMethodRow {
  method: string;
  total_orders: number;
  paid_orders: number;
  revenue: number;
  failed_orders: number;
  pending_orders: number;
  success_rate: number;
  avg_order_value: number;
}

// ─── helpers ───────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    notation: 'compact',
  }).format(v);

const fmtFull = (v: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

const PAYMENT_LABELS: Record<string, string> = {
  paystack: 'Paystack',
  mpesa: 'M-Pesa',
  cod: 'Cash on Delivery',
  stripe: 'Stripe',
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#8b5cf6',
  shipped: '#06b6d4',
  out_for_delivery: '#f97316',
  delivered: '#10b981',
  cancelled: '#ef4444',
};

const CAT_COLORS = ['#782121', '#a03030', '#c04040', '#e05050', '#f07070', '#f89090'];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  trend,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number | null;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 shadow-sm ${highlight ? 'border-[#782121]/30' : 'border-gray-200'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold font-lexend ${highlight ? 'text-[#782121]' : 'text-gray-900'}`}>{value}</p>
      {trend !== undefined && trend !== null && (
        <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs prev period
        </p>
      )}
      {sub && !trend && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold font-lexend text-gray-700 uppercase tracking-wide mb-4">{children}</h2>;
}

function EmptyState() {
  return <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data for this period</div>;
}

// ─── main component ──────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  useSEO({ title: "Analytics", noindex: true });
  const [period, setPeriod] = useState<Period>('30d');
  const [sales, setSales] = useState<SalesData | null>(null);
  const [customers, setCustomers] = useState<CustomerData | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [geo, setGeo] = useState<GeoRow[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchAll = async (p: Period) => {
    setLoading(true);
    try {
      const [salesRes, custRes, prodRes, geoRes, heatRes, funnelRes, pmRes] = await Promise.all([
        api.get(`/api/v1/admin/reports/sales?period=${p}`),
        api.get(`/api/v1/admin/reports/customers?period=${p}`),
        api.get(`/api/v1/admin/reports/products?period=${p}&limit=10`),
        api.get(`/api/v1/admin/reports/geographic?period=${p}`),
        api.get(`/api/v1/admin/reports/heatmap?period=${p}`),
        api.get(`/api/v1/admin/reports/funnel?period=${p}`),
        api.get(`/api/v1/admin/reports/payment-methods?period=${p}`),
      ]);
      setSales(salesRes.data?.data ?? salesRes.data);
      setCustomers(custRes.data);
      setProducts(prodRes.data ?? []);
      setGeo(geoRes.data ?? []);
      setHeatmap(heatRes.data ?? []);
      setFunnel(funnelRes.data ?? []);
      setPaymentMethods(pmRes.data ?? []);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(period); }, [period]);

  const exportCSV = async () => {
    try {
      setExporting(true);
      const res = await api.get(`/api/v1/admin/reports/export-csv?period=${period}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `urban-bird-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Build heatmap lookup
  const heatmapMap: Record<number, Record<number, number>> = {};
  for (const d of heatmap) {
    if (!heatmapMap[d.dow]) heatmapMap[d.dow] = {};
    heatmapMap[d.dow][d.hour] = d.count;
  }
  const maxHeat = heatmap.reduce((m, d) => Math.max(m, d.count), 0) || 1;

  const periods: { label: string; value: Period }[] = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
  ];

  return (
    <div className="p-6 font-manrope min-h-screen bg-gray-50 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time business intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${period === p.value ? 'bg-[#782121] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            disabled={exporting}
            className="flex items-center gap-2 text-sm border border-[#782121] text-[#782121] px-4 py-2 rounded-lg hover:bg-[#782121]/5 disabled:opacity-50 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-4 border-[#782121] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard
              label="Total Revenue"
              value={fmt(sales?.summary.total_revenue ?? 0)}
              trend={sales?.summary.revenue_growth}
            />
            <KpiCard
              label="Total Orders"
              value={String(sales?.summary.total_orders ?? 0)}
            />
            <KpiCard
              label="Avg Order Value"
              value={fmt(sales?.summary.average_order_value ?? 0)}
            />
            <KpiCard
              label="New Customers"
              value={String(customers?.new_customers ?? 0)}
              trend={customers?.new_customer_growth}
            />
            <KpiCard
              label="Repeat Rate"
              value={`${customers?.repeat_rate ?? 0}%`}
              sub={`${customers?.repeat_buyers ?? 0} of ${customers?.unique_buyers ?? 0} buyers`}
              highlight
            />
            <KpiCard
              label="Avg Lifetime Value"
              value={fmt(customers?.avg_lifetime_value ?? 0)}
              sub="per registered customer"
            />
          </div>

          {/* ── Revenue Chart ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <SectionTitle>Revenue Over Time</SectionTitle>
            {(sales?.revenue_by_day?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={sales!.revenue_by_day} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#782121" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#782121" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="rev"
                    tickFormatter={(v) => fmt(v)}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <YAxis
                    yAxisId="ord"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    formatter={((value: number, name: string) => [
                      name === 'Revenue' ? fmtFull(value) : value,
                      name,
                    ]) as any}
                    labelFormatter={(l) => fmtDate(l)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    yAxisId="rev"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#782121"
                    strokeWidth={2.5}
                    fill="url(#revenueGrad)"
                    dot={false}
                    activeDot={{ r: 4 }}
                    name="Revenue"
                  />
                  <Area
                    yAxisId="ord"
                    type="monotone"
                    dataKey="orders"
                    stroke="#9ca3af"
                    strokeWidth={1.5}
                    fill="none"
                    strokeDasharray="4 4"
                    dot={false}
                    name="Orders"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>

          {/* ── Top Products + Top Categories ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Top Products Table */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <SectionTitle>Top Products by Revenue</SectionTitle>
              {products.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">#</th>
                        <th className="text-left text-xs font-semibold text-gray-400 pb-3">Product</th>
                        <th className="text-right text-xs font-semibold text-gray-400 pb-3 px-3">Units</th>
                        <th className="text-right text-xs font-semibold text-gray-400 pb-3 px-3">Revenue</th>
                        <th className="text-right text-xs font-semibold text-gray-400 pb-3 px-3">Stock</th>
                        <th className="text-right text-xs font-semibold text-gray-400 pb-3 pl-3">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {products.map((p, i) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 pr-4 text-xs text-gray-400 font-mono">{i + 1}</td>
                          <td className="py-3">
                            <p className="font-medium text-gray-800 text-sm leading-tight">{p.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{p.order_count} orders · {fmtFull(p.price)}/unit</p>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-gray-800">{p.units_sold}</td>
                          <td className="py-3 px-3 text-right font-semibold text-gray-900">{fmt(p.revenue)}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.total_stock <= 5 ? 'bg-red-50 text-red-600' : p.total_stock <= 15 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                              {p.total_stock}
                            </span>
                          </td>
                          <td className="py-3 pl-3 text-right text-xs text-gray-500">
                            {p.margin_pct !== null ? `${p.margin_pct}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState />
              )}
            </div>

            {/* Top Categories */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <SectionTitle>Revenue by Category</SectionTitle>
              {(sales?.top_categories?.length ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={sales!.top_categories}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip
                      formatter={((v: number) => [fmtFull(v), 'Revenue']) as any}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {sales!.top_categories.map((_, idx) => (
                        <Cell key={idx} fill={CAT_COLORS[idx % CAT_COLORS.length]} />
                      ))}
                      <LabelList dataKey="orders" position="right" style={{ fontSize: '10px', fill: '#9ca3af' }} formatter={(v: unknown) => `${v} ord`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>

          {/* ── Customer Breakdown + Payment Methods ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Customer Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <SectionTitle>Customer Breakdown</SectionTitle>
              {customers ? (
                <div className="space-y-4">
                  {/* Donut: new vs repeat vs guest */}
                  {(() => {
                    const newB = customers.unique_buyers - customers.repeat_buyers;
                    const repeatB = customers.repeat_buyers;
                    const guestB = customers.guest_orders;
                    const pieData = [
                      { name: 'First-time Buyers', value: Math.max(newB, 0) },
                      { name: 'Repeat Buyers', value: repeatB },
                      { name: 'Guest Orders', value: guestB },
                    ].filter((d) => d.value > 0);
                    const PIE = ['#782121', '#10b981', '#9ca3af'];
                    return (
                      <div className="flex items-center gap-4">
                        <ResponsiveContainer width="45%" height={180}>
                          <PieChart>
                            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                              {pieData.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                            </Pie>
                            <Tooltip
                              formatter={((v: number, n: string) => [v, n]) as any}
                              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2.5">
                          {pieData.map((d, i) => (
                            <div key={d.name} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE[i % PIE.length] }} />
                                <span className="text-gray-600">{d.name}</span>
                              </div>
                              <span className="font-semibold text-gray-900">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Total Customers</p>
                      <p className="text-xl font-bold font-lexend text-gray-900 mt-0.5">{customers.total_customers.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">all-time</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Avg Lifetime Value</p>
                      <p className="text-xl font-bold font-lexend text-[#782121] mt-0.5">{fmtFull(customers.avg_lifetime_value)}</p>
                      <p className="text-xs text-gray-400">per registered customer</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Repeat Rate</p>
                      <p className="text-xl font-bold font-lexend text-gray-900 mt-0.5">{customers.repeat_rate}%</p>
                      <p className="text-xs text-gray-400">{customers.repeat_buyers} repeat in period</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">New Customers</p>
                      <p className="text-xl font-bold font-lexend text-gray-900 mt-0.5">{customers.new_customers}</p>
                      {customers.new_customer_growth !== null && (
                        <p className={`text-xs font-medium mt-0.5 ${(customers.new_customer_growth ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {(customers.new_customer_growth ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(customers.new_customer_growth ?? 0).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState />
              )}
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <SectionTitle>Payment Methods</SectionTitle>
              {paymentMethods.length > 0 ? (
                <div className="space-y-4">
                  {paymentMethods.map((pm) => {
                    const label = PAYMENT_LABELS[pm.method] ?? pm.method;
                    const barWidth = pm.revenue > 0
                      ? Math.round((pm.revenue / paymentMethods[0].revenue) * 100)
                      : 0;
                    return (
                      <div key={pm.method}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                          <span className="text-sm font-bold text-gray-900">{fmtFull(pm.revenue)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#782121]"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                          <span>{pm.paid_orders} paid orders</span>
                          <span>Success: <span className={`font-medium ${pm.success_rate >= 80 ? 'text-green-600' : pm.success_rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{pm.success_rate}%</span></span>
                          <span>AOV: {fmtFull(pm.avg_order_value)}</span>
                          {pm.failed_orders > 0 && <span className="text-red-400">{pm.failed_orders} failed</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>

          {/* ── Order Funnel ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <SectionTitle>Order Status Funnel</SectionTitle>
            {funnel.length > 0 ? (
              <div className="space-y-3">
                {funnel.map((stage) => (
                  <div key={stage.status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700">{stage.stage}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{stage.count} orders</span>
                        <span className="text-xs font-semibold text-gray-800 w-12 text-right">{stage.pct}%</span>
                      </div>
                    </div>
                    <div className="h-6 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full rounded flex items-center px-2 text-xs text-white font-medium transition-all"
                        style={{
                          width: `${Math.max(stage.pct, 4)}%`,
                          backgroundColor: STATUS_COLORS[stage.status] ?? '#782121',
                          minWidth: stage.count > 0 ? '40px' : '0',
                        }}
                      />
                    </div>
                  </div>
                ))}
                {/* cancelled separately */}
                {funnel.find(f => f.status === 'cancelled') && (
                  <p className="text-xs text-gray-400 pt-1">
                    Cancelled orders are excluded from revenue calculations.
                  </p>
                )}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>

          {/* ── Geographic + Orders by Status ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Geographic Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <SectionTitle>Top Locations</SectionTitle>
              {geo.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-400 pb-3">City</th>
                        <th className="text-left text-xs font-semibold text-gray-400 pb-3">County</th>
                        <th className="text-right text-xs font-semibold text-gray-400 pb-3 px-3">Orders</th>
                        <th className="text-right text-xs font-semibold text-gray-400 pb-3 px-3">Revenue</th>
                        <th className="text-right text-xs font-semibold text-gray-400 pb-3">AOV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {geo.map((g, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 font-medium text-gray-800">{g.city}</td>
                          <td className="py-2.5 text-gray-500 text-xs">{g.county}</td>
                          <td className="py-2.5 px-3 text-right text-gray-700">{g.orders}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{fmt(g.revenue)}</td>
                          <td className="py-2.5 text-right text-xs text-gray-400">{fmt(g.avg_order)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState />
              )}
            </div>

            {/* Orders by Status Donut */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <SectionTitle>Orders by Status</SectionTitle>
              {(sales?.orders_by_status?.length ?? 0) > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={220}>
                    <PieChart>
                      <Pie
                        data={sales!.orders_by_status}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {sales!.orders_by_status.map((entry, index) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] ?? CAT_COLORS[index % CAT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={((v: number, n: string) => [v, n]) as any}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {sales!.orders_by_status.map((entry, i) => {
                      const total = sales!.orders_by_status.reduce((s, e) => s + e.count, 0);
                      const pct = total > 0 ? Math.round(entry.count / total * 100) : 0;
                      return (
                        <div key={entry.status} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: STATUS_COLORS[entry.status] ?? CAT_COLORS[i % CAT_COLORS.length] }}
                            />
                            <span className="capitalize text-gray-600">
                              {entry.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{pct}%</span>
                            <span className="font-semibold text-gray-900 w-8 text-right">{entry.count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>

          {/* ── Order Heatmap ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>Order Activity Heatmap</SectionTitle>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Low</span>
                <div className="flex gap-0.5">
                  {[0.1, 0.3, 0.5, 0.7, 0.9].map((o) => (
                    <div key={o} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgba(120, 33, 33, ${o})` }} />
                  ))}
                </div>
                <span>High</span>
              </div>
            </div>
            {heatmap.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="text-xs" style={{ borderSpacing: '2px', borderCollapse: 'separate' }}>
                  <thead>
                    <tr>
                      <th className="w-10 text-left font-normal text-gray-400 pb-1 pr-2" />
                      {Array.from({ length: 24 }, (_, h) => (
                        <th key={h} className="w-7 text-center font-normal text-gray-300 pb-1">
                          {h % 4 === 0 ? `${h}h` : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, dow) => (
                      <tr key={dow}>
                        <td className="text-gray-500 pr-2 py-0.5 text-right whitespace-nowrap">{day}</td>
                        {Array.from({ length: 24 }, (_, h) => {
                          const count = heatmapMap[dow]?.[h] || 0;
                          const intensity = count / maxHeat;
                          return (
                            <td key={h} className="p-0.5">
                              <div
                                className="w-6 h-6 rounded-sm cursor-default"
                                style={{
                                  backgroundColor:
                                    intensity > 0
                                      ? `rgba(120, 33, 33, ${0.08 + intensity * 0.92})`
                                      : '#f3f4f6',
                                }}
                                title={count > 0 ? `${day} ${h}:00 — ${count} order${count !== 1 ? 's' : ''}` : undefined}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </>
      )}
    </div>
  );
}
