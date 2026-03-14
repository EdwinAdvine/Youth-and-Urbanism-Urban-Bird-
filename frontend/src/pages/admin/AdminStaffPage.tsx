import { useEffect, useState, useCallback } from "react";
import {
  Plus, UserCheck, UserX, Trash2, Shield, Eye, X, Search,
  KeyRound, Pencil, Users, ShieldCheck, ShieldAlert, ChevronLeft, ChevronRight,
} from "lucide-react";
import api from "../../services/api";
import { formatDate } from "../../utils/formatPrice";
import Badge from "../../components/ui/Badge";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import { useSEO } from "../../hooks/useSEO";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: "admin" | "super_admin" | "viewer";
  is_active: boolean;
  is_verified: boolean;
  last_login: string | null;
  created_at: string;
}

interface AuditEntry {
  id: string;
  admin: string;
  admin_email: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}


interface Stats {
  total: number;
  active: number;
  inactive: number;
  by_role: { super_admin: number; admin: number; viewer: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ["admin", "viewer", "super_admin"] as const;
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  viewer: "Viewer",
};
const ROLE_BADGE_VARIANTS: Record<string, "danger" | "info" | "default"> = {
  super_admin: "danger",
  admin: "info",
  viewer: "default",
};
const AUDIT_ACTIONS = [
  "create_staff", "update_staff", "change_role", "toggle_staff_status",
  "delete_staff", "reset_password",
];
const ACTION_LABELS: Record<string, string> = {
  create_staff: "Create Staff",
  update_staff: "Update Staff",
  change_role: "Change Role",
  toggle_staff_status: "Toggle Status",
  delete_staff: "Delete Staff",
  reset_password: "Reset Password",
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function initials(s: StaffMember) {
  return `${s.first_name?.[0] ?? "?"}${s.last_name?.[0] ?? ""}`.toUpperCase();
}

function fullName(s: StaffMember) {
  return `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email;
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="p-5">
          <h3 className="font-bold font-lexend text-gray-900 text-base">{title}</h3>
          <p className="text-sm text-gray-500 font-manrope mt-1">{message}</p>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-700 font-manrope text-sm rounded-lg py-2.5">Cancel</button>
          <button
            onClick={onConfirm}
            className={`flex-1 text-white font-manrope text-sm font-medium rounded-lg py-2.5 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-maroon-700 hover:bg-maroon-800"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Cards ─────────────────────────────────────────────────────────────

function StatsRow({ stats }: { stats: Stats | null }) {
  const cards = [
    { label: "Total Staff", value: stats?.total ?? "—", icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Active", value: stats?.active ?? "—", icon: UserCheck, color: "text-green-600 bg-green-50" },
    { label: "Super Admins", value: stats?.by_role.super_admin ?? "—", icon: ShieldCheck, color: "text-maroon-700 bg-maroon-50" },
    { label: "Admins", value: stats?.by_role.admin ?? "—", icon: Shield, color: "text-blue-600 bg-blue-50" },
    { label: "Viewers", value: stats?.by_role.viewer ?? "—", icon: Eye, color: "text-gray-600 bg-gray-100" },
    { label: "Inactive", value: stats?.inactive ?? "—", icon: ShieldAlert, color: "text-red-500 bg-red-50" },
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col gap-1.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.color}`}>
            <c.icon size={14} />
          </div>
          <p className="text-xl font-bold font-lexend text-gray-900 leading-none">{c.value}</p>
          <p className="text-xs text-gray-500 font-manrope">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Permission Guard ─────────────────────────────────────────────────────────

function NoPermission() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
        <ShieldAlert size={24} className="text-red-500" />
      </div>
      <h2 className="text-lg font-bold font-lexend text-gray-900">Access Restricted</h2>
      <p className="text-sm text-gray-500 font-manrope mt-1 max-w-xs">
        Only Super Admins can manage staff accounts.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = ["Staff Members", "Audit Log"];

export default function AdminStaffPage() {
  useSEO({ title: "Staff", noindex: true });
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [tab, setTab] = useState(0);

  // Staff
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Audit
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState<string>("all");
  const [auditLoading, setAuditLoading] = useState(false);
  const AUDIT_LIMIT = 20;

  // Modals
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel: string; danger?: boolean; action: () => void;
  } | null>(null);

  // Forms
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "", role: "admin" });
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadStaff = useCallback(() => {
    if (!isSuperAdmin) return;
    setIsLoading(true);
    Promise.all([
      api.get("/api/v1/admin/staff"),
      api.get("/api/v1/admin/staff/stats"),
    ])
      .then(([staffRes, statsRes]) => {
        setStaff(staffRes.data);
        setStats(statsRes.data);
      })
      .catch(() => toast.error("Failed to load staff"))
      .finally(() => setIsLoading(false));
  }, [isSuperAdmin]);

  const loadAudit = useCallback(() => {
    if (!isSuperAdmin) return;
    setAuditLoading(true);
    const params = new URLSearchParams({ page: String(auditPage), limit: String(AUDIT_LIMIT) });
    if (auditAction !== "all") params.set("action", auditAction);
    api.get(`/api/v1/admin/staff/audit-log?${params}`)
      .then((r) => {
        setAuditLog(r.data.items);
        setAuditTotal(r.data.total);
      })
      .catch(() => toast.error("Failed to load audit log"))
      .finally(() => setAuditLoading(false));
  }, [isSuperAdmin, auditPage, auditAction]);

  useEffect(() => {
    if (tab === 0) loadStaff();
    else loadAudit();
  }, [tab, loadStaff, loadAudit]);

  // ── Staff actions ─────────────────────────────────────────────────────────

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

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/admin/staff/${editTarget.id}`, editForm);
      toast.success("Profile updated");
      setEditTarget(null);
      loadStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/admin/staff/${resetTarget.id}/reset-password`, { new_password: newPassword });
      toast.success("Password reset successfully");
      setResetTarget(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = (s: StaffMember, role: string) => {
    setConfirmDialog({
      title: "Change Role",
      message: `Change ${fullName(s)}'s role to ${ROLE_LABELS[role]}?`,
      confirmLabel: "Change Role",
      action: async () => {
        try {
          await api.patch(`/api/v1/admin/staff/${s.id}/role`, { role });
          toast.success("Role updated");
          loadStaff();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Failed to update role");
        }
        setConfirmDialog(null);
      },
    });
  };

  const handleToggle = (s: StaffMember) => {
    const action = s.is_active ? "Deactivate" : "Activate";
    setConfirmDialog({
      title: `${action} Staff Account`,
      message: `${action} ${fullName(s)} (${s.email})?`,
      confirmLabel: action,
      danger: s.is_active,
      action: async () => {
        try {
          const r = await api.patch(`/api/v1/admin/staff/${s.id}/toggle-status`);
          toast.success(r.data.message);
          loadStaff();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Failed");
        }
        setConfirmDialog(null);
      },
    });
  };

  const handleDelete = (s: StaffMember) => {
    setConfirmDialog({
      title: "Delete Staff Account",
      message: `Permanently remove ${fullName(s)} (${s.email})? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      action: async () => {
        try {
          await api.delete(`/api/v1/admin/staff/${s.id}`);
          toast.success("Staff account removed");
          loadStaff();
        } catch (err: any) {
          toast.error(err.response?.data?.detail || "Failed to delete");
        }
        setConfirmDialog(null);
      },
    });
  };

  // ── Filtered staff list ───────────────────────────────────────────────────

  const filteredStaff = staff.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || fullName(s).toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.phone ?? "").includes(q);
    const matchRole = roleFilter === "all" || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  // ── Audit pagination ──────────────────────────────────────────────────────

  const totalAuditPages = Math.ceil(auditTotal / AUDIT_LIMIT);

  if (!isSuperAdmin) return <NoPermission />;

  return (
    <div>
      {/* Header */}
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

      {/* Stats */}
      <StatsRow stats={stats} />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-5">
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

      {/* ── Staff Tab ── */}
      {tab === 0 && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, phone…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700 bg-white"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 text-xs text-gray-500 font-manrope uppercase">
                  <tr>
                    {["Staff Member", "Email / Phone", "Role", "Status", "Last Active", "Joined", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading
                    ? Array(4).fill(0).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={7} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        </tr>
                      ))
                    : filteredStaff.map((s) => {
                        const isMe = currentUser?.id === s.id;
                        return (
                          <tr key={s.id} className={`hover:bg-gray-50 ${isMe ? "bg-blue-50/30" : ""}`}>
                            {/* Name */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-maroon-100 flex items-center justify-center text-xs font-bold font-lexend text-maroon-700 shrink-0">
                                  {initials(s)}
                                </div>
                                <div>
                                  <p className="font-manrope font-medium text-gray-900 leading-none">
                                    {fullName(s)}
                                    {isMe && <span className="ml-1.5 text-xs text-blue-500 font-normal">(you)</span>}
                                  </p>
                                </div>
                              </div>
                            </td>
                            {/* Email / Phone */}
                            <td className="px-4 py-3">
                              <p className="text-gray-700 font-manrope text-xs">{s.email}</p>
                              {s.phone && <p className="text-gray-400 font-manrope text-xs mt-0.5">{s.phone}</p>}
                            </td>
                            {/* Role */}
                            <td className="px-4 py-3">
                              {isMe ? (
                                <Badge variant={ROLE_BADGE_VARIANTS[s.role]} size="sm">{ROLE_LABELS[s.role]}</Badge>
                              ) : (
                                <select
                                  value={s.role}
                                  onChange={(e) => handleRoleChange(s, e.target.value)}
                                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700 bg-white"
                                >
                                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                </select>
                              )}
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3">
                              <Badge variant={s.is_active ? "success" : "danger"} size="sm">
                                {s.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            {/* Last Login */}
                            <td className="px-4 py-3 text-gray-500 font-manrope text-xs">
                              {s.last_login ? formatDate(s.last_login) : "Never"}
                            </td>
                            {/* Joined */}
                            <td className="px-4 py-3 text-gray-500 font-manrope text-xs">
                              {formatDate(s.created_at)}
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setEditTarget(s); setEditForm({ first_name: s.first_name ?? "", last_name: s.last_name ?? "", phone: s.phone ?? "" }); }}
                                  title="Edit profile"
                                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => { setResetTarget(s); setNewPassword(""); }}
                                  title="Reset password"
                                  className="p-1.5 text-gray-400 hover:text-amber-600 rounded hover:bg-amber-50"
                                >
                                  <KeyRound size={14} />
                                </button>
                                {!isMe && (
                                  <>
                                    <button
                                      onClick={() => handleToggle(s)}
                                      title={s.is_active ? "Deactivate" : "Activate"}
                                      className="p-1.5 text-gray-400 hover:text-maroon-700 rounded hover:bg-maroon-50"
                                    >
                                      {s.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                                    </button>
                                    <button
                                      onClick={() => handleDelete(s)}
                                      title="Delete"
                                      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
            {filteredStaff.length === 0 && !isLoading && (
              <p className="text-center text-gray-500 font-manrope py-12 text-sm">
                {search || roleFilter !== "all" ? "No staff match your filters." : "No staff accounts found."}
              </p>
            )}
            {!isLoading && filteredStaff.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400 font-manrope">
                Showing {filteredStaff.length} of {staff.length} staff members
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Audit Log Tab ── */}
      {tab === 1 && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              value={auditAction}
              onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700 bg-white"
            >
              <option value="all">All Actions</option>
              {AUDIT_ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
            </select>
            {auditTotal > 0 && (
              <span className="self-center text-xs text-gray-400 font-manrope">{auditTotal} total entries</span>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50 text-xs text-gray-500 font-manrope uppercase">
                  <tr>
                    {["Admin", "Action", "Description", "IP", "Time"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {auditLoading
                    ? Array(5).fill(0).map((_, i) => (
                        <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                      ))
                    : auditLog.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-manrope">
                            <p className="font-medium text-gray-900 text-xs">{entry.admin}</p>
                            <p className="text-xs text-gray-400">{entry.admin_email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-gray-100 text-gray-700 rounded px-1.5 py-0.5">
                              {ACTION_LABELS[entry.action] ?? entry.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-manrope text-xs max-w-xs">{entry.description ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-500 font-manrope text-xs">{entry.ip_address ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-500 font-manrope text-xs whitespace-nowrap">{formatDate(entry.created_at)}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {auditLog.length === 0 && !auditLoading && (
              <p className="text-center text-gray-500 font-manrope py-12 text-sm">No audit log entries.</p>
            )}

            {/* Pagination */}
            {totalAuditPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-manrope">
                  Page {auditPage} of {totalAuditPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => p - 1)}
                    className="p-1.5 rounded text-gray-500 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={auditPage >= totalAuditPages}
                    onClick={() => setAuditPage((p) => p + 1)}
                    className="p-1.5 rounded text-gray-500 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Add Staff Modal ── */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-maroon-700" />
                <h2 className="font-bold font-lexend text-gray-900">Add Staff Account</h2>
              </div>
              <button onClick={() => setInviteOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
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
                <p className="text-xs text-gray-400 font-manrope mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <p className="text-xs text-gray-400 font-manrope mt-1">
                  {form.role === "viewer" && "Read-only access to admin dashboard."}
                  {form.role === "admin" && "Can manage orders, products, and customers."}
                  {form.role === "super_admin" && "Full access including staff management."}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setInviteOpen(false)} className="flex-1 border border-gray-200 text-gray-700 font-manrope text-sm rounded-lg py-2.5">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-60 text-white font-manrope text-sm font-medium rounded-lg py-2.5">
                  {saving ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Staff Modal ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold font-lexend text-gray-900">Edit Profile</h2>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-manrope text-gray-500 mb-1">First Name</label>
                  <input
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-manrope text-gray-500 mb-1">Last Name</label>
                  <input
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+254…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 border border-gray-200 text-gray-700 font-manrope text-sm rounded-lg py-2.5">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-60 text-white font-manrope text-sm font-medium rounded-lg py-2.5">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-amber-600" />
                <h2 className="font-bold font-lexend text-gray-900">Reset Password</h2>
              </div>
              <button onClick={() => setResetTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <p className="text-sm text-gray-500 font-manrope">
                Set a new password for <span className="font-medium text-gray-800">{fullName(resetTarget)}</span>.
              </p>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">New Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
                <p className="text-xs text-gray-400 font-manrope mt-1">Minimum 8 characters</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setResetTarget(null)} className="flex-1 border border-gray-200 text-gray-700 font-manrope text-sm rounded-lg py-2.5">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-manrope text-sm font-medium rounded-lg py-2.5">
                  {saving ? "Resetting…" : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Dialog ── */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          danger={confirmDialog.danger}
          onConfirm={confirmDialog.action}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
