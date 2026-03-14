import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useSEO } from "../../hooks/useSEO";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  times_used: number;
  usage_limit: number | null;
  per_user_limit: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string | null;
}

interface CouponForm {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  expires_at: string;
  is_active: boolean;
}

const emptyForm: CouponForm = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: 0,
  max_discount_amount: null,
  usage_limit: null,
  expires_at: '',
  is_active: true,
};

export default function AdminCouponsPage() {
  useSEO({ title: "Coupons", noindex: true });
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
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

  const openCreateModal = () => {
    setEditingCoupon(null);
    setForm(emptyForm);
    setModal(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description ?? '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_discount_amount: coupon.max_discount_amount,
      usage_limit: coupon.usage_limit,
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
      is_active: coupon.is_active,
    });
    setModal(true);
  };

  const saveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        description: form.description || null,
        expires_at: form.expires_at ? new Date(form.expires_at + 'T23:59:59Z').toISOString() : undefined,
        usage_limit: form.usage_limit || null,
        max_discount_amount: form.max_discount_amount || null,
      };

      if (editingCoupon) {
        const res = await api.patch(`/api/v1/admin/coupons/${editingCoupon.id}`, payload);
        const updated: Coupon = res.data;
        setCoupons((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success('Coupon updated');
      } else {
        const res = await api.post('/api/v1/admin/coupons', payload);
        const created: Coupon = res.data;
        setCoupons((prev) => [created, ...prev]);
        toast.success('Coupon created');
      }
      setModal(false);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : editingCoupon ? 'Failed to update coupon' : 'Failed to create coupon');
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
          onClick={openCreateModal}
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
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((coupon) => (
                <tr key={coupon.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!coupon.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-gray-900 tracking-widest text-xs">{coupon.code}</span>
                    {coupon.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">{coupon.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${coupon.discount_type === 'percentage' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {coupon.discount_type === 'percentage' ? '%' : 'KES'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `KES ${coupon.discount_value}`}
                    {coupon.max_discount_amount && (
                      <span className="text-xs text-gray-400 ml-1">(max {coupon.max_discount_amount})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {coupon.min_order_amount > 0 ? `KES ${coupon.min_order_amount}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {coupon.times_used}
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(coupon)}
                        className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-medium"
                      >
                        Edit
                      </button>
                      {coupon.is_active && (
                        <button
                          onClick={() => deactivate(coupon)}
                          disabled={deactivatingId === coupon.id}
                          className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium"
                        >
                          {deactivatingId === coupon.id ? '...' : 'Deactivate'}
                        </button>
                      )}
                    </div>
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

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold font-lexend text-gray-900 mb-5">
              {editingCoupon ? `Edit Coupon — ${editingCoupon.code}` : 'Create New Coupon'}
            </h2>
            <form onSubmit={saveCoupon} className="space-y-4">

              {/* Code */}
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
                  {!editingCoupon && (
                    <button
                      type="button"
                      onClick={generateCode}
                      className="px-3 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                    >
                      Generate
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. 20% off for new customers"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                />
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as 'percentage' | 'fixed_amount' }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed (KES)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value {form.discount_type === 'percentage' ? '(%)' : '(KES)'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={form.discount_type === 'percentage' ? 100 : undefined}
                    value={form.discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  />
                </div>
              </div>

              {/* Min Order + Max Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (KES)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.min_order_amount}
                    onChange={(e) => setForm((f) => ({ ...f, min_order_amount: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  />
                </div>
                {form.discount_type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (KES)</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="No cap"
                      value={form.max_discount_amount ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, max_discount_amount: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                    />
                  </div>
                )}
              </div>

              {/* Usage Limit + Expiry */}
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={form.expires_at}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  />
                </div>
              </div>

              {/* Active toggle (edit only) */}
              {editingCoupon && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-gray-700">{form.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              )}

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
                  {saving ? (editingCoupon ? 'Saving...' : 'Creating...') : (editingCoupon ? 'Save Changes' : 'Create Coupon')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
