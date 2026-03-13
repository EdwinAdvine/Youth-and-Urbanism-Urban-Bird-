import { useEffect, useState } from "react";
import { Mail, Download, Trash2, Users } from "lucide-react";
import api from "../../services/api";
import { formatDate } from "../../utils/formatPrice";
import Badge from "../../components/ui/Badge";
import toast from "react-hot-toast";

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (search) params.set("q", search);
    api.get(`/api/v1/newsletter/admin/subscribers?${params}`)
      .then((r) => {
        setSubscribers(r.data.items ?? r.data);
        setTotal(r.data.total ?? r.data.length);
        setActiveCount(r.data.active_count ?? 0);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await api.get("/api/v1/newsletter/admin/subscribers/export-csv", { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "newsletter_subscribers.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from the newsletter?`)) return;
    try {
      await api.delete(`/api/v1/newsletter/admin/subscribers/${id}`);
      toast.success("Subscriber removed");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to remove subscriber");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">Newsletter</h1>
          <p className="text-sm text-gray-500 font-manrope mt-0.5">Manage subscribers and send campaigns</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-manrope font-medium rounded-lg px-4 py-2.5"
        >
          <Download size={15} />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-manrope text-gray-500">Total Subscribers</span>
            <Users size={16} className="text-maroon-700" />
          </div>
          <p className="text-2xl font-bold font-lexend text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-manrope text-gray-500">Active</span>
            <Mail size={16} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold font-lexend text-gray-900">{activeCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(); } }}
          placeholder="Search by email…"
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 font-manrope uppercase">
            <tr>
              {["Email", "Name", "Status", "Subscribed", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-manrope text-gray-900">{s.email}</td>
                    <td className="px-4 py-3 font-manrope text-gray-600">{s.first_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.is_active ? "success" : "danger"} size="sm">
                        {s.is_active ? "Active" : "Unsubscribed"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-manrope text-xs">{formatDate(s.subscribed_at ?? s.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(s.id, s.email)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                        title="Remove subscriber"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {subscribers.length === 0 && !isLoading && (
          <p className="text-center text-gray-500 font-manrope py-12">No subscribers yet.</p>
        )}
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: Math.min(Math.ceil(total / 25), 10) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-sm font-manrope ${p === page ? "bg-maroon-700 text-white" : "border border-gray-200 text-gray-700"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
