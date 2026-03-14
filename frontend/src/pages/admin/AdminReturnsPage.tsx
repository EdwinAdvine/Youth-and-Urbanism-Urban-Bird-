import { useEffect, useState } from "react";
import { X, CheckCircle, XCircle, Package, RotateCcw, RefreshCw } from "lucide-react";
import api from "../../services/api";
import { formatKSh, formatDate } from "../../utils/formatPrice";
import Badge from "../../components/ui/Badge";
import toast from "react-hot-toast";
import { useSEO } from "../../hooks/useSEO";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "item_received", label: "Item Received" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_COLORS: Record<string, string> = {
  requested: "warning",
  approved: "info",
  item_received: "info",
  completed: "success",
  rejected: "danger",
};

const RESOLUTION_TYPES = [
  { value: "refund", label: "Refund" },
  { value: "exchange", label: "Exchange" },
  { value: "store_credit", label: "Store Credit" },
];

const REASON_LABELS: Record<string, string> = {
  wrong_size: "Wrong Size",
  doesnt_fit: "Doesn't Fit",
  defective: "Defective / Damaged",
  not_as_described: "Not as Described",
  changed_mind: "Changed Mind",
  other: "Other",
};

interface Stats {
  total: number;
  requested: number;
  approved: number;
  item_received: number;
  completed: number;
  rejected: number;
}

export default function AdminReturnsPage() {
  useSEO({ title: "Returns", noindex: true });
  const [returns, setReturns] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const [resolution, setResolution] = useState("refund");
  const [refundAmt, setRefundAmt] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadStats = () => {
    api.get("/api/v1/admin/returns/stats").then((r) => setStats(r.data)).catch(() => {});
  };

  const load = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter) params.set("status", statusFilter);
    api.get(`/api/v1/admin/returns?${params}`)
      .then((r) => setReturns(r.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => { load(); }, [page, statusFilter]);

  const openDetail = async (id: string) => {
    const r = await api.get(`/api/v1/admin/returns/${id}`);
    setSelected(r.data);
    setDetailOpen(true);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/admin/returns/${selected.id}/approve`, {
        resolution_type: resolution,
        refund_amount: refundAmt ? parseFloat(refundAmt) : null,
        admin_note: adminNote || null,
      });
      toast.success("Return approved — customer notified by email");
      setApproveOpen(false);
      setDetailOpen(false);
      load();
      loadStats();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to approve");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selected || !adminNote.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/api/v1/admin/returns/${selected.id}/reject`, { admin_note: adminNote });
      toast.success("Return rejected — customer notified by email");
      setRejectOpen(false);
      setDetailOpen(false);
      load();
      loadStats();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to reject");
    } finally {
      setSaving(false);
    }
  };

  const handleItemReceived = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/admin/returns/${selected.id}/item-received`);
      toast.success("Item marked as received");
      setDetailOpen(false);
      load();
      loadStats();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/admin/returns/${selected.id}/complete`);
      toast.success("Return completed — inventory restocked, customer notified");
      setDetailOpen(false);
      load();
      loadStats();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to complete");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-lexend text-gray-900">Returns & Refunds</h1>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total, color: "text-gray-900" },
            { label: "Requested", value: stats.requested, color: "text-amber-600" },
            { label: "Approved", value: stats.approved, color: "text-blue-600" },
            { label: "Item Received", value: stats.item_received, color: "text-indigo-600" },
            { label: "Completed", value: stats.completed, color: "text-green-600" },
            { label: "Rejected", value: stats.rejected, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className={`text-2xl font-bold font-lexend ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 font-manrope mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatusFilter(t.value); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-manrope font-medium rounded-md transition-colors ${
              statusFilter === t.value ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 font-manrope uppercase">
            <tr>
              {["Order", "Customer", "Reason", "Status", "Submitted", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : returns.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium font-manrope text-gray-900">{r.order_number}</td>
                    <td className="px-4 py-3 font-manrope text-gray-700">
                      <div>{r.customer_name}</div>
                      <div className="text-xs text-gray-400">{r.customer_email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-manrope">
                      {REASON_LABELS[r.reason] ?? r.reason.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[r.status] as any ?? "default"}>
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-manrope">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(r.id)}
                        className="text-xs text-maroon-700 hover:text-maroon-800 font-manrope font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {returns.length === 0 && !isLoading && (
          <p className="text-center text-gray-500 font-manrope py-12">No return requests found.</p>
        )}
      </div>

      {/* Pagination */}
      {returns.length === 20 && (
        <div className="flex gap-2 mt-4 justify-end">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-xs font-manrope border border-gray-200 rounded-lg disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-xs font-manrope border border-gray-200 rounded-lg"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {detailOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold font-lexend text-gray-900">Return #{selected.order_number}</h2>
                <p className="text-xs text-gray-500 font-manrope mt-0.5">{selected.customer_name} · {selected.customer_email}</p>
              </div>
              <button onClick={() => setDetailOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-manrope mb-1">Reason</p>
                  <p className="text-sm font-manrope font-medium text-gray-900">
                    {REASON_LABELS[selected.reason] ?? selected.reason.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-manrope mb-1">Status</p>
                  <Badge variant={STATUS_COLORS[selected.status] as any ?? "default"}>
                    {selected.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>

              {selected.customer_note && (
                <div>
                  <p className="text-xs text-gray-500 font-manrope mb-1">Customer Note</p>
                  <p className="text-sm text-gray-700 font-manrope bg-gray-50 rounded-lg p-3">{selected.customer_note}</p>
                </div>
              )}

              {selected.items && selected.items.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-manrope mb-2">Items to Return</p>
                  <div className="space-y-2">
                    {selected.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        {item.product_image && (
                          <img src={item.product_image} alt={item.product_name} className="w-10 h-12 object-cover rounded flex-shrink-0 bg-gray-200" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-manrope font-medium text-gray-900 truncate">
                            {item.product_name ?? `Variant ${item.variant_id?.slice(0, 8)}`}
                          </p>
                          {(item.size || item.color_name) && (
                            <p className="text-xs text-gray-500 font-manrope">{item.size} · {item.color_name}</p>
                          )}
                        </div>
                        <span className="text-xs font-medium font-manrope text-gray-700 flex-shrink-0">Qty: {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.resolution_type && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-manrope font-medium mb-1">Resolution</p>
                  <p className="text-sm font-manrope text-green-800 capitalize">
                    {RESOLUTION_TYPES.find((t) => t.value === selected.resolution_type)?.label ?? selected.resolution_type}
                  </p>
                  {selected.refund_amount && (
                    <p className="text-sm font-bold font-manrope text-green-900 mt-1">{formatKSh(selected.refund_amount)}</p>
                  )}
                </div>
              )}

              {selected.admin_note && (
                <div>
                  <p className="text-xs text-gray-500 font-manrope mb-1">Admin Note</p>
                  <p className="text-sm text-gray-700 font-manrope bg-yellow-50 border border-yellow-100 rounded-lg p-3">{selected.admin_note}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-400 font-manrope space-y-0.5">
                <p>Submitted: {formatDate(selected.created_at)}</p>
                {selected.resolved_at && <p>Resolved: {formatDate(selected.resolved_at)}</p>}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                {selected.status === "requested" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setAdminNote(""); setRefundAmt(""); setResolution("refund"); setApproveOpen(true); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-manrope font-medium rounded-lg py-2.5"
                    >
                      <CheckCircle size={15} /> Approve
                    </button>
                    <button
                      onClick={() => { setAdminNote(""); setRejectOpen(true); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-manrope font-medium rounded-lg py-2.5"
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                )}

                {selected.status === "approved" && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleItemReceived}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-manrope font-medium rounded-lg py-2.5"
                    >
                      <Package size={15} /> Mark Item Received
                    </button>
                    <button
                      onClick={() => { setAdminNote(""); setRejectOpen(true); }}
                      className="flex items-center justify-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-manrope rounded-lg px-4 py-2.5"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}

                {selected.status === "item_received" && (
                  <button
                    onClick={handleComplete}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-60 text-white text-sm font-manrope font-medium rounded-lg py-2.5"
                  >
                    <RotateCcw size={15} />
                    {saving ? "Processing…" : "Complete Return (Restock & Notify Customer)"}
                  </button>
                )}

                {selected.status === "approved" && (
                  <button
                    onClick={handleComplete}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 border border-maroon-200 text-maroon-700 hover:bg-maroon-50 disabled:opacity-60 text-sm font-manrope font-medium rounded-lg py-2.5"
                  >
                    <RefreshCw size={14} />
                    {saving ? "Processing…" : "Complete Without Item Received"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-bold font-lexend text-gray-900 mb-4">Approve Return</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">Resolution Type</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                >
                  {RESOLUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {resolution === "refund" && (
                <div>
                  <label className="block text-xs font-manrope text-gray-500 mb-1">Refund Amount (KSh)</label>
                  <input
                    type="number"
                    value={refundAmt}
                    onChange={(e) => setRefundAmt(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">Note to Customer (optional)</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Please pack items securely and attach your order number."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setApproveOpen(false)} className="flex-1 border border-gray-200 text-gray-700 font-manrope text-sm rounded-lg py-2">Cancel</button>
              <button onClick={handleApprove} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-manrope text-sm font-medium rounded-lg py-2">
                {saving ? "Saving…" : "Confirm Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-bold font-lexend text-gray-900 mb-4">Reject Return</h3>
            <div>
              <label className="block text-xs font-manrope text-gray-500 mb-1">Reason for Rejection *</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder="Explain why this return is being rejected…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectOpen(false)} className="flex-1 border border-gray-200 text-gray-700 font-manrope text-sm rounded-lg py-2">Cancel</button>
              <button onClick={handleReject} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-manrope text-sm font-medium rounded-lg py-2">
                {saving ? "Saving…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
