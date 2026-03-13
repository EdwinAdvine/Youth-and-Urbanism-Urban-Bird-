import { useEffect, useState } from "react";
import { X, CheckCircle, XCircle, Package } from "lucide-react";
import api from "../../services/api";
import { formatKSh, formatDate } from "../../utils/formatPrice";
import Badge from "../../components/ui/Badge";
import toast from "react-hot-toast";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_COLORS: Record<string, string> = {
  requested: "warning",
  approved: "info",
  completed: "success",
  rejected: "danger",
};

const RESOLUTION_TYPES = ["refund", "exchange", "store_credit"];

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
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

  const load = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter) params.set("status", statusFilter);
    api.get(`/api/v1/admin/returns?${params}`)
      .then((r) => setReturns(r.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

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
      toast.success("Return approved");
      setApproveOpen(false);
      setDetailOpen(false);
      load();
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
      toast.success("Return rejected");
      setRejectOpen(false);
      setDetailOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to reject");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/admin/returns/${selected.id}/complete`);
      toast.success("Return completed — inventory restocked");
      setDetailOpen(false);
      load();
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

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
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
                    <td className="px-4 py-3 text-gray-600 font-manrope capitalize">{r.reason.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_COLORS[r.status] as any ?? "default"}>
                        {r.status}
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
                  <p className="text-sm font-manrope font-medium text-gray-900 capitalize">{selected.reason.replace(/_/g, " ")}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-manrope mb-1">Status</p>
                  <Badge variant={STATUS_COLORS[selected.status] as any ?? "default"}>{selected.status}</Badge>
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
                  <p className="text-xs text-gray-500 font-manrope mb-2">Items</p>
                  <div className="space-y-2">
                    {selected.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-manrope text-gray-700 bg-gray-50 rounded-lg p-3">
                        <Package size={14} className="text-gray-400 flex-shrink-0" />
                        <span>Variant ID: {item.variant_id}</span>
                        <span className="ml-auto font-medium">Qty: {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.resolution_type && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-manrope font-medium mb-1">Resolution</p>
                  <p className="text-sm font-manrope text-green-800 capitalize">{selected.resolution_type.replace(/_/g, " ")}</p>
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

              {/* Actions */}
              {selected.status === "requested" && (
                <div className="flex gap-3 pt-2">
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
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="w-full bg-maroon-700 hover:bg-maroon-800 disabled:opacity-60 text-white text-sm font-manrope font-medium rounded-lg py-2.5"
                >
                  {saving ? "Processing…" : "Mark as Completed (Restock & Update Order)"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
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
                    <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
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
                <label className="block text-xs font-manrope text-gray-500 mb-1">Admin Note (optional)</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
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
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
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
