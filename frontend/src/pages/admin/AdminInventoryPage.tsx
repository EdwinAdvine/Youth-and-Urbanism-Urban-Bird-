import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useSEO } from "../../hooks/useSEO";

interface Variant {
  id: string;
  product_name: string;
  sku: string;
  size: string;
  color_name: string;
  stock_quantity: number;
}

interface RestockForm {
  variant_id: string;
  quantity: number;
  note: string;
}

const stockLevel = (qty: number) => {
  if (qty < 5) return 'low';
  if (qty <= 10) return 'medium';
  return 'ok';
};

const stockBadge = (qty: number) => {
  const level = stockLevel(qty);
  if (level === 'low') return 'bg-red-100 text-red-700 border border-red-200';
  if (level === 'medium') return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
  return 'bg-green-100 text-green-700 border border-green-200';
};

export default function AdminInventoryPage() {
  useSEO({ title: "Inventory", noindex: true });
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'medium'>('all');

  // Restock state
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockForm, setRestockForm] = useState<RestockForm>({ variant_id: '', quantity: 1, note: '' });
  const [restocking, setRestocking] = useState(false);

  const [total, setTotal] = useState(0);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/admin/inventory');
      const payload = res.data;
      if (payload && typeof payload === 'object' && 'data' in payload) {
        setVariants(payload.data ?? []);
        setTotal(payload.total ?? 0);
      } else {
        setVariants(Array.isArray(payload) ? payload : []);
        setTotal(Array.isArray(payload) ? payload.length : 0);
      }
    } catch {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, []);

  const openRestock = (v: Variant) => {
    setRestockId(v.id);
    setRestockForm({ variant_id: v.id, quantity: 1, note: '' });
  };

  const submitRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRestocking(true);
      await api.post('/api/v1/admin/inventory/restock', [restockForm]);
      toast.success('Stock updated successfully');
      setRestockId(null);
      fetchInventory();
    } catch {
      toast.error('Failed to restock');
    } finally {
      setRestocking(false);
    }
  };

  const filtered = variants.filter((v) => {
    const matchSearch =
      v.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.sku?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'low' && v.stock_quantity < 5) ||
      (filter === 'medium' && v.stock_quantity >= 5 && v.stock_quantity <= 10);
    return matchSearch && matchFilter;
  });

  const lowCount = variants.filter((v) => v.stock_quantity < 5).length;
  const mediumCount = variants.filter((v) => v.stock_quantity >= 5 && v.stock_quantity <= 10).length;

  return (
    <div className="p-4 sm:p-6 font-manrope min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-lexend text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor stock levels and restock variants</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => setFilter('all')}
          className={`rounded-xl border p-4 cursor-pointer transition-colors ${filter === 'all' ? 'border-[#782121] bg-[#782121]/5' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
        >
          <p className="text-xs text-gray-500 mb-1">Total Variants</p>
          <p className="text-2xl font-bold font-lexend text-gray-900">{total}</p>
        </div>
        <div
          onClick={() => setFilter('low')}
          className={`rounded-xl border p-4 cursor-pointer transition-colors ${filter === 'low' ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
        >
          <p className="text-xs text-red-500 mb-1">Low Stock (&lt; 5)</p>
          <p className="text-2xl font-bold font-lexend text-red-600">{lowCount}</p>
        </div>
        <div
          onClick={() => setFilter('medium')}
          className={`rounded-xl border p-4 cursor-pointer transition-colors ${filter === 'medium' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
        >
          <p className="text-xs text-yellow-600 mb-1">Medium Stock (5-10)</p>
          <p className="text-2xl font-bold font-lexend text-yellow-700">{mediumCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#782121] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">SKU</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Size</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Color</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Stock</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <React.Fragment key={v.id}>
                  <tr className={`border-b border-gray-100 ${stockLevel(v.stock_quantity) === 'low' ? 'bg-red-50/40' : stockLevel(v.stock_quantity) === 'medium' ? 'bg-yellow-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{v.product_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{v.sku}</td>
                    <td className="px-4 py-3 text-gray-600">{v.size || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{v.color_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${stockBadge(v.stock_quantity)}`}>
                        {v.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openRestock(v)}
                        className="text-xs bg-[#782121] text-white px-3 py-1.5 rounded-lg hover:bg-[#5e1a1a] font-medium transition-colors"
                      >
                        Restock
                      </button>
                    </td>
                  </tr>

                  {/* Inline restock form */}
                  {restockId === v.id && (
                    <tr className="bg-blue-50 border-b border-blue-100">
                      <td colSpan={6} className="px-4 py-3">
                        <form onSubmit={submitRestock} className="flex items-end gap-3 flex-wrap">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity to Add</label>
                            <input
                              type="number"
                              min={1}
                              required
                              value={restockForm.quantity}
                              onChange={(e) => setRestockForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-[#782121]"
                            />
                          </div>
                          <div className="flex-1 min-w-[180px]">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                            <input
                              type="text"
                              value={restockForm.note}
                              onChange={(e) => setRestockForm((f) => ({ ...f, note: e.target.value }))}
                              placeholder="e.g. Supplier delivery"
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={restocking}
                              className="bg-[#782121] text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#5e1a1a] disabled:opacity-50"
                            >
                              {restocking ? 'Saving...' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRestockId(null)}
                              className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No variants found
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
