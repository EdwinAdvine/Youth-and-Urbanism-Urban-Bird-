import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useSEO } from '../../hooks/useSEO';

interface Rate {
  id: string;
  zone_id: string;
  method: string;
  price: number;
  free_above: number | null;
  estimated_days_min: number;
  estimated_days_max: number;
  is_active: boolean;
}

interface Zone {
  id: string;
  name: string;
  counties: string[];
  is_active: boolean;
  rates: Rate[];
}

const emptyRate = { method: 'standard', price: 0, free_above: '', estimated_days_min: 1, estimated_days_max: 3, is_active: true };

export default function AdminShippingRatesPage() {
  useSEO({ title: 'Shipping Rates', noindex: true });
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  // Zone form
  const [zoneModal, setZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [zoneForm, setZoneForm] = useState({ name: '', counties: '', is_active: true });
  const [savingZone, setSavingZone] = useState(false);

  // Rate form
  const [rateModal, setRateModal] = useState<{ zoneId: string; rate?: Rate } | null>(null);
  const [rateForm, setRateForm] = useState<any>(emptyRate);
  const [savingRate, setSavingRate] = useState(false);

  const [deletingZone, setDeletingZone] = useState<string | null>(null);
  const [deletingRate, setDeletingRate] = useState<string | null>(null);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/admin/shipping/zones');
      setZones(res.data?.data ?? res.data ?? []);
    } catch {
      toast.error('Failed to load shipping zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchZones(); }, []);

  const openZoneModal = (zone?: Zone) => {
    setEditingZone(zone ?? null);
    setZoneForm(zone
      ? { name: zone.name, counties: zone.counties.join(', '), is_active: zone.is_active }
      : { name: '', counties: '', is_active: true });
    setZoneModal(true);
  };

  const saveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingZone(true);
      const payload = {
        name: zoneForm.name,
        counties: zoneForm.counties.split(',').map((c) => c.trim()).filter(Boolean),
        is_active: zoneForm.is_active,
      };
      if (editingZone) {
        await api.patch(`/api/v1/admin/shipping/zones/${editingZone.id}`, payload);
        toast.success('Zone updated');
      } else {
        await api.post('/api/v1/admin/shipping/zones', payload);
        toast.success('Zone created');
      }
      setZoneModal(false);
      fetchZones();
    } catch {
      toast.error('Failed to save zone');
    } finally {
      setSavingZone(false);
    }
  };

  const deleteZone = async (zoneId: string) => {
    if (!window.confirm('Delete this zone and all its rates?')) return;
    try {
      setDeletingZone(zoneId);
      await api.delete(`/api/v1/admin/shipping/zones/${zoneId}`);
      toast.success('Zone deleted');
      fetchZones();
    } catch {
      toast.error('Failed to delete zone');
    } finally {
      setDeletingZone(null);
    }
  };

  const openRateModal = (zoneId: string, rate?: Rate) => {
    setRateModal({ zoneId, rate });
    setRateForm(rate
      ? { method: rate.method, price: rate.price, free_above: rate.free_above ?? '', estimated_days_min: rate.estimated_days_min, estimated_days_max: rate.estimated_days_max, is_active: rate.is_active }
      : { ...emptyRate });
  };

  const saveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateModal) return;
    try {
      setSavingRate(true);
      const payload = {
        method: rateForm.method,
        price: Number(rateForm.price),
        free_above: rateForm.free_above !== '' ? Number(rateForm.free_above) : null,
        estimated_days_min: Number(rateForm.estimated_days_min),
        estimated_days_max: Number(rateForm.estimated_days_max),
        is_active: rateForm.is_active,
      };
      if (rateModal.rate) {
        await api.patch(`/api/v1/admin/shipping/rates/${rateModal.rate.id}`, payload);
        toast.success('Rate updated');
      } else {
        await api.post(`/api/v1/admin/shipping/zones/${rateModal.zoneId}/rates`, payload);
        toast.success('Rate added');
      }
      setRateModal(null);
      fetchZones();
    } catch {
      toast.error('Failed to save rate');
    } finally {
      setSavingRate(false);
    }
  };

  const deleteRate = async (rateId: string) => {
    if (!window.confirm('Delete this rate?')) return;
    try {
      setDeletingRate(rateId);
      await api.delete(`/api/v1/admin/shipping/rates/${rateId}`);
      toast.success('Rate deleted');
      fetchZones();
    } catch {
      toast.error('Failed to delete rate');
    } finally {
      setDeletingRate(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 font-manrope min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">Shipping Rates</h1>
          <p className="text-sm text-gray-500 mt-1">Manage delivery zones and rates</p>
        </div>
        <button
          onClick={() => openZoneModal()}
          className="bg-[#782121] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#5e1a1a] transition-colors"
        >
          + Add Zone
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#782121] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : zones.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No shipping zones. Add one to get started.</div>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => (
            <div key={zone.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${zone.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <p className="font-semibold text-gray-900 font-lexend">{zone.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {zone.counties.length > 0 ? zone.counties.join(', ') : 'All counties / Pickup'}
                      {' · '}{zone.rates.length} rate{zone.rates.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openZoneModal(zone)}
                    className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteZone(zone.id)}
                    disabled={deletingZone === zone.id}
                    className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium"
                  >
                    {deletingZone === zone.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>

              {expandedZone === zone.id && (
                <div className="border-t border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700">Rates</p>
                    <button
                      onClick={() => openRateModal(zone.id)}
                      className="text-xs bg-[#782121] text-white px-3 py-1.5 rounded-lg hover:bg-[#5e1a1a] font-medium"
                    >
                      + Add Rate
                    </button>
                  </div>
                  {zone.rates.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No rates. Add one above.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                          <th className="pb-2 font-medium">Method</th>
                          <th className="pb-2 font-medium">Price</th>
                          <th className="pb-2 font-medium">Free above</th>
                          <th className="pb-2 font-medium">Est. days</th>
                          <th className="pb-2 font-medium">Active</th>
                          <th className="pb-2 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zone.rates.map((rate) => (
                          <tr key={rate.id} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 capitalize font-medium text-gray-900">{rate.method}</td>
                            <td className="py-2 text-gray-700">
                              {rate.price === 0 ? <span className="text-green-600 font-medium">Free</span> : `KES ${rate.price}`}
                            </td>
                            <td className="py-2 text-gray-500">{rate.free_above ? `KES ${rate.free_above}` : '—'}</td>
                            <td className="py-2 text-gray-500">{rate.estimated_days_min}–{rate.estimated_days_max} days</td>
                            <td className="py-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${rate.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {rate.is_active ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openRateModal(zone.id, rate)}
                                  className="text-xs border border-gray-200 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteRate(rate.id)}
                                  disabled={deletingRate === rate.id}
                                  className="text-xs border border-red-200 text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingRate === rate.id ? '...' : 'Del'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Zone Modal */}
      {zoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold font-lexend text-gray-900 mb-5">
              {editingZone ? 'Edit Zone' : 'Add Zone'}
            </h2>
            <form onSubmit={saveZone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name</label>
                <input
                  type="text"
                  required
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Nairobi, Upcountry, Shop Pickup"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Counties (comma-separated)</label>
                <input
                  type="text"
                  value={zoneForm.counties}
                  onChange={(e) => setZoneForm((f) => ({ ...f, counties: e.target.value }))}
                  placeholder="e.g. Nairobi, Kiambu (leave empty for pickup zones)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoneForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${zoneForm.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${zoneForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-700">{zoneForm.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setZoneModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={savingZone} className="px-4 py-2 text-sm rounded-lg bg-[#782121] text-white font-semibold hover:bg-[#5e1a1a] disabled:opacity-50">
                  {savingZone ? 'Saving...' : 'Save Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rate Modal */}
      {rateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold font-lexend text-gray-900 mb-5">
              {rateModal.rate ? 'Edit Rate' : 'Add Rate'}
            </h2>
            <form onSubmit={saveRate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <input
                  type="text"
                  required
                  value={rateForm.method}
                  onChange={(e) => setRateForm((f: any) => ({ ...f, method: e.target.value }))}
                  placeholder="e.g. standard, express, pickup"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (KES)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={rateForm.price}
                    onChange={(e) => setRateForm((f: any) => ({ ...f, price: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Free above (KES)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="No threshold"
                    value={rateForm.free_above}
                    onChange={(e) => setRateForm((f: any) => ({ ...f, free_above: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min days</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={rateForm.estimated_days_min}
                    onChange={(e) => setRateForm((f: any) => ({ ...f, estimated_days_min: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max days</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={rateForm.estimated_days_max}
                    onChange={(e) => setRateForm((f: any) => ({ ...f, estimated_days_max: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRateForm((f: any) => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rateForm.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${rateForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-700">{rateForm.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setRateModal(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={savingRate} className="px-4 py-2 text-sm rounded-lg bg-[#782121] text-white font-semibold hover:bg-[#5e1a1a] disabled:opacity-50">
                  {savingRate ? 'Saving...' : 'Save Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
