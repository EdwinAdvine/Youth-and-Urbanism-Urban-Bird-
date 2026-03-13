import { useEffect, useState } from "react";
import { Plus, GripVertical, Edit2, Trash2, X, Eye, EyeOff } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  cta_text: "",
  cta_link: "",
  image_url: "",
  mobile_image_url: "",
  overlay_color: "rgba(0,0,0,0.35)",
  display_order: 0,
  is_active: true,
  starts_at: "",
  ends_at: "",
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setIsLoading(true);
    api.get("/api/v1/admin/banners")
      .then((r) => setBanners(r.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, display_order: banners.length });
    setModalOpen(true);
  };

  const openEdit = (b: any) => {
    setEditTarget(b);
    setForm({
      title: b.title ?? "",
      subtitle: b.subtitle ?? "",
      cta_text: b.cta_text ?? "",
      cta_link: b.cta_link ?? "",
      image_url: b.image_url ?? "",
      mobile_image_url: b.mobile_image_url ?? "",
      overlay_color: b.overlay_color ?? "rgba(0,0,0,0.35)",
      display_order: b.display_order ?? 0,
      is_active: b.is_active ?? true,
      starts_at: b.starts_at ? b.starts_at.slice(0, 16) : "",
      ends_at: b.ends_at ? b.ends_at.slice(0, 16) : "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };
      if (editTarget) {
        await api.patch(`/api/v1/admin/banners/${editTarget.id}`, payload);
        toast.success("Banner updated");
      } else {
        await api.post("/api/v1/admin/banners", payload);
        toast.success("Banner created");
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await api.delete(`/api/v1/admin/banners/${id}`);
      toast.success("Banner deleted");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleToggle = async (b: any) => {
    try {
      await api.patch(`/api/v1/admin/banners/${b.id}`, { is_active: !b.is_active });
      load();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/api/v1/admin/banners/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({ ...prev, image_url: r.data.url }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500 font-manrope mt-0.5">Manage homepage hero slides and promotional banners</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-maroon-700 hover:bg-maroon-800 text-white text-sm font-manrope font-medium rounded-lg px-4 py-2.5"
        >
          <Plus size={16} /> New Banner
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
          <p className="text-gray-500 font-manrope mb-3">No banners yet.</p>
          <button onClick={openCreate} className="text-sm text-maroon-700 font-manrope font-medium hover:text-maroon-800">
            Create your first banner
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 flex items-center gap-4 p-4">
              <GripVertical size={16} className="text-gray-300 cursor-grab flex-shrink-0" />
              {/* Preview */}
              <div className="w-24 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {b.image_url ? (
                  <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-manrope">No image</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium font-manrope text-gray-900 truncate">{b.title}</p>
                {b.subtitle && <p className="text-xs text-gray-500 font-manrope truncate">{b.subtitle}</p>}
                {b.cta_text && <p className="text-xs text-maroon-600 font-manrope mt-0.5">{b.cta_text} → {b.cta_link}</p>}
              </div>
              <div className="flex items-center gap-1 text-xs font-manrope text-gray-400">
                Order: {b.display_order}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(b)}
                  title={b.is_active ? "Deactivate" : "Activate"}
                  className={`p-1.5 rounded ${b.is_active ? "text-green-600 hover:text-gray-400" : "text-gray-300 hover:text-green-600"}`}
                >
                  {b.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-maroon-700 rounded">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold font-lexend text-gray-900">{editTarget ? "Edit Banner" : "New Banner"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
              </div>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">Subtitle</label>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-manrope text-gray-500 mb-1">CTA Text</label>
                  <input
                    value={form.cta_text}
                    onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                    placeholder="Shop Now"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-manrope text-gray-500 mb-1">CTA Link</label>
                  <input
                    value={form.cta_link}
                    onChange={(e) => setForm({ ...form, cta_link: e.target.value })}
                    placeholder="/shop"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1">Banner Image</label>
                <div className="space-y-2">
                  {form.image_url && (
                    <img src={form.image_url} alt="preview" className="w-full h-32 object-cover rounded-lg" />
                  )}
                  <input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="Paste image URL…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-manrope">
                    <span>or</span>
                    <label className="text-maroon-700 hover:text-maroon-800 cursor-pointer font-medium">
                      {uploading ? "Uploading…" : "Upload image"}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-manrope text-gray-500 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-maroon-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-maroon-700" />
                    <span className="ml-2 text-xs font-manrope text-gray-600">Active</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-manrope text-gray-500 mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-manrope text-gray-500 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 border border-gray-200 text-gray-700 font-manrope text-sm rounded-lg py-2.5">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-60 text-white font-manrope text-sm font-medium rounded-lg py-2.5">
                  {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
