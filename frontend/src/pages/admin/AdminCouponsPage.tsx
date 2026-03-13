import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order: number;
  usage_count: number;
  usage_limit: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface CouponForm {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order: number;
  usage_limit: number | null;
  expires_at: string;
}

const emptyForm: CouponForm = {
  code: '',
  type: 'percentage',
  value: 10,
  min_order: 0,
  usage_limit: null,
  expires_at: '',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/admin/coupons');
      setCoupons(res.data?.data ?? res.data ?? []);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openModal = () => {
    setForm(emptyForm);
    setModal(true);
  };

  const saveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        expires_at: form.expires_at || null,
        usage_limit: form.usage_limit || null,
      };
      await api.post('/api/v1/admin/coupons', payload);
      toast.success('Coupon created');
      setModal(false);
      fetchCoupons();
    } catch {
      toast.error('Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (coupon: Coupon) => {
    if (!window.confirm(`Deactivate coupon "${coupon.code}"?`)) return;
    try {
      setDeactivatingId(coupon.id);
      await api.patch(`/api/v1/admin/coupons/${coupon.id}/deactivate`);
      toast.success('Coupon deactivated');
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, is_active: false } : c)));
    } catch {
      toast.error('Failed to deactivate coupon');
    } finally {
      setDeactivatingId(null);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm((f) => ({ ...f, code }));
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false;

  const filtered = coupons.filter((c) => {
    if (filterActive === 'active') return c.is_active;
    if (filterActive === 'inactive') return !c.is_active;
    return true;
  });

  return (
    <div className="p-6 font-manrope min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage discount codes</p>
        </div>
        <button
          onClick={openModal}
          className="bg-[#782121] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#5e1a1a] transition-colors"
        >
          + New Coupon
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => setFilterActive('all')}
          className={`rounded-xl border p-4 cursor-pointer transition-colors ${filterActive === 'all' ? 'border-[#782121] bg-[#782121]/5' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-xs text-gray-500 mb-1">Total Coupons</p>
          <p className="text-2xl font-bold font-lexend text-gray-900">{coupons.length}</p>
        </div>
        <div
          onClick={() => setFilterActive('active')}
          className={`rounded-xl border p-4 cursor-pointer transition-colors ${filterActive === 'active' ? 'border-green-400 bg-green-50' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-xs text-green-600 mb-1">Active</p>
          <p className="text-2xl font-bold font-lexend text-green-700">{coupons.filter((c) => c.is_active).length}</p>
        </div>
        <div
          onClick={() => setFilterActive('inactive')}
          className={`rounded-xl border p-4 cursor-pointer transition-colors ${filterActive === 'inactive' ? 'border-gray-400 bg-gray-100' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-xs text-gray-500 mb-1">Inactive / Expired</p>
          <p className="text-2xl font-bold font-lexend text-gray-500">{coupons.filter((c) => !c.is_active).length}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#782121] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Value</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Min Order</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Used</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Expires</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((coupon) => (
                <tr key={coupon.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!coupon.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono font-bold text-gray-900 tracking-widest text-xs">
                    {coupon.code}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${coupon.type === 'percentage' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {coupon.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {coupon.type === 'percentage' ? `${coupon.value}%` : `KES ${coupon.value}`}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {coupon.min_order > 0 ? `KES ${coupon.min_order}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {coupon.usage_count}
                    {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}
                  </td>
                  <td className={`px-4 py-3 text-xs ${isExpired(coupon.expires_at) ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    {formatDate(coupon.expires_at)}
                    {isExpired(coupon.expires_at) && ' (expired)'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {coupon.is_active && (
                      <button
                        onClick={() => deactivate(coupon)}
                        disabled={deactivatingId === coupon.id}
                        className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium"
                      >
                        {deactivatingId === coupon.id ? '...' : 'Deactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No coupons found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Coupon Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold font-lexend text-gray-900 mb-5">Create New Coupon</h2>
            <form onSubmit={saveCoupon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SAVE20"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="px-3 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'percentage' | 'fixed' }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (KES)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value {form.type === 'percentage' ? '(%)' : '(KES)'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={form.type === 'percentage' ? 100 : undefined}
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (KES)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.min_order}
                    onChange={(e) => setForm((f) => ({ ...f, min_order: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={form.usage_limit ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={form.expires_at}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-[#782121] text-white font-semibold hover:bg-[#5e1a1a] disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
