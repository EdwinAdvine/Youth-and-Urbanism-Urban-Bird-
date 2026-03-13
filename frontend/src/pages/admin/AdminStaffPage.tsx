import { useEffect, useState } from "react";
import { Plus, UserCheck, UserX, Trash2, Shield, Eye, X } from "lucide-react";
import api from "../../services/api";
import { formatDate } from "../../utils/formatPrice";
import Badge from "../../components/ui/Badge";
import toast from "react-hot-toast";

const TABS = ["Staff Members", "Audit Log"];
const ROLES = ["admin", "viewer", "super_admin"];
const ROLE_COLORS: Record<string, string> = {
  super_admin: "danger",
  admin: "info",
  viewer: "default",
};

export default function AdminStaffPage() {
  const [tab, setTab] = useState(0);
  const [staff, setStaff] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditPage, setAuditPage] = useState(1);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "", role: "admin" });
  const [saving, setSaving] = useState(false);

  const loadStaff = () => {
    setIsLoading(true);
    api.get("/api/v1/admin/staff")
      .then((r) => setStaff(r.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  const loadAudit = () => {
    setIsLoading(true);
    api.get(`/api/v1/admin/staff/audit-log?page=${auditPage}&limit=50`)
      .then((r) => setAuditLog(r.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (tab === 0) loadStaff();
    else loadAudit();
  }, [tab, auditPage]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/v1/admin/staff", form);
      toast.success("Staff account created");
      setInviteOpen(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", password: "", role: "admin" });
      loadStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create staff");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await api.patch(`/api/v1/admin/staff/${id}/role`, { role });
      toast.success("Role updated");
      loadStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update role");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const r = await api.patch(`/api/v1/admin/staff/${id}/toggle-status`);
      toast.success(r.data.message);
      loadStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Delete staff account ${email}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/v1/admin/staff/${id}`);
      toast.success("Staff account removed");
      loadStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 font-manrope mt-0.5">Manage admin accounts and permissions</p>
        </div>
        {tab === 0 && (
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 bg-maroon-700 hover:bg-maroon-800 text-white text-sm font-manrope font-medium rounded-lg px-4 py-2.5"
          >
            <Plus size={16} /> Add Staff
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-4 py-1.5 text-xs font-manrope font-medium rounded-md transition-colors ${
              tab === i ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 font-manrope uppercase">
              <tr>
                {["Name", "Email", "Role", "Status", "Last Active", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array(4).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                : staff.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-maroon-100 flex items-center justify-center text-xs font-bold font-lexend text-maroon-700">
                            {s.first_name[0]}{s.last_name[0]}
                          </div>
                          <span className="font-manrope font-medium text-gray-900">{s.first_name} {s.last_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-manrope">{s.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={s.role}
                          onChange={(e) => handleRoleChange(s.id, e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.is_active ? "success" : "danger"} size="sm">
                          {s.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-manrope text-xs">
                        {s.last_login ? formatDate(s.last_login) : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggle(s.id)}
                            title={s.is_active ? "Deactivate" : "Activate"}
                            className="p-1.5 text-gray-400 hover:text-maroon-700 rounded"
                          >
                            {s.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.email)}
                            title="Delete"
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {staff.length === 0 && !isLoading && (
            <p className="text-center text-gray-500 font-manrope py-12">No staff accounts found.</p>
          )}
        </div>
      )}

      {tab === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 font-manrope uppercase">
              <tr>
                {["Admin", "Action", "Description", "IP", "Time"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                : auditLog.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-manrope">
                        <p className="font-medium text-gray-900">{entry.admin}</p>
                        <p className="text-xs text-gray-400">{entry.admin_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 rounded px-1.5 py-0.5">{entry.action}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-manrope text-xs max-w-xs truncate">{entry.description}</td>
                      <td className="px-4 py-3 text-gray-500 font-manrope text-xs">{entry.ip_address || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 font-manrope text-xs">{formatDate(entry.created_at)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {auditLog.length === 0 && !isLoading && (
            <p className="text-center text-gray-500 font-manrope py-12">No audit log entries.</p>
          )}
          {auditLog.length === 50 && (
            <div className="flex justify-center p-4 border-t border-gray-100">
              <button
                onClick={() => setAuditPage((p) => p + 1)}
                className="text-sm text-maroon-700 font-manrope hover:text-maroon-800"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-maroon-700" />
                <h2 className="font-bold font-lexend text-gray-900">Add Staff Account</h2>
              </div>
              <button onClick={() => setInviteOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-manrope text-gray-500 mb-1">First Name *</label>
                  <input
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-manrope text-gray-500 mb-1">Last Name *</label>
                  <input
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
              </div>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+254…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
              </div>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
              </div>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setInviteOpen(false)} className="flex-1 border border-gray-200 text-gray-700 font-manrope text-sm rounded-lg py-2.5">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-60 text-white font-manrope text-sm font-medium rounded-lg py-2.5">
                  {saving ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
