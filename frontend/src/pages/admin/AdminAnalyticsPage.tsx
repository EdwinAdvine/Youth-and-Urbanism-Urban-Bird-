import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

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

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  processing: '#8b5cf6',
  shipped: '#06b6d4',
  delivered: '#10b981',
  cancelled: '#ef4444',
};

const PIE_COLORS = ['#782121', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, notation: 'compact' }).format(v);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = async (p: Period) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/admin/reports/sales?period=${p}`);
      setData(res.data?.data ?? res.data ?? null);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(period); }, [period]);

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
      toast.success('CSV exported successfully');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const periods: { label: string; value: Period }[] = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
  ];

  return (
    <div className="p-6 font-manrope min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Sales performance and business insights</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
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
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 border-4 border-[#782121] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center py-24 text-gray-400">No data available</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold font-lexend text-gray-900">
                {formatCurrency(data.summary.total_revenue)}
              </p>
              {typeof data.summary.revenue_growth === 'number' && (
                <p className={`text-xs mt-1 font-medium ${data.summary.revenue_growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {data.summary.revenue_growth >= 0 ? '+' : ''}{data.summary.revenue_growth.toFixed(1)}% vs previous period
                </p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total Orders</p>
              <p className="text-2xl font-bold font-lexend text-gray-900">{data.summary.total_orders}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Avg. Order Value</p>
              <p className="text-2xl font-bold font-lexend text-gray-900">
                {formatCurrency(data.summary.average_order_value)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Period</p>
              <p className="text-2xl font-bold font-lexend text-[#782121]">{period}</p>
              <p className="text-xs text-gray-400 mt-1">selected window</p>
            </div>
          </div>

          {/* Revenue Line Chart */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold font-lexend text-gray-800 mb-4">Revenue Over Time</h2>
            {data.revenue_by_day?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.revenue_by_day} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCurrency(v)}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <Tooltip
                    formatter={((value: number | undefined, name: string | undefined) => {
                      if (value === undefined) return ['', ''];
                      return [
                        name === 'revenue' ? formatCurrency(value) : value,
                        name === 'revenue' ? 'Revenue' : 'Orders',
                      ] as [string | number, string];
                    }) as any}
                    labelFormatter={(label) => formatDate(label)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#782121"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#9ca3af"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 4"
                    name="Orders"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data for this period</div>
            )}
          </div>

          {/* Bottom row: Bar + Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Categories Bar Chart */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold font-lexend text-gray-800 mb-4">Top Selling Categories</h2>
              {data.top_categories?.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={data.top_categories}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatCurrency(v)}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fontSize: 11, fill: '#374151' }}
                      tickLine={false}
                      axisLine={false}
                      width={100}
                    />
                    <Tooltip
                      formatter={((value: number | undefined) => {
                        if (value === undefined) return ['', 'Revenue'];
                        return [formatCurrency(value), 'Revenue'] as [string, string];
                      }) as any}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    />
                    <Bar dataKey="revenue" fill="#782121" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data available</div>
              )}
            </div>

            {/* Orders by Status Pie Chart */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold font-lexend text-gray-800 mb-4">Orders by Status</h2>
              {data.orders_by_status?.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={240}>
                    <PieChart>
                      <Pie
                        data={data.orders_by_status}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={100}
                        paddingAngle={2}
                      >
                        {data.orders_by_status.map((entry, index) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] ?? PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={((value: number | undefined, name: string | undefined) => {
                          if (value === undefined) return ['', name ?? ''];
                          return [value, name ?? ''] as [number, string];
                        }) as any}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {data.orders_by_status.map((entry, index) => (
                      <div key={entry.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: STATUS_COLORS[entry.status] ?? PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <span className="capitalize text-gray-700">{entry.status}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data available</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
