import { useEffect, useRef, useState } from "react";
import { Plus, GripVertical, Edit2, Trash2, X, Eye, EyeOff, ImagePlus, ExternalLink, Monitor } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useSEO } from "../../hooks/useSEO";

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

function getBannerStatus(b: any) {
  if (!b.is_active) return { label: "Inactive", color: "bg-gray-100 text-gray-500" };
  const now = new Date();
  if (b.starts_at && new Date(b.starts_at) > now)
    return { label: "Scheduled", color: "bg-blue-50 text-blue-600" };
  if (b.ends_at && new Date(b.ends_at) < now)
    return { label: "Expired", color: "bg-red-50 text-red-500" };
  return { label: "Active", color: "bg-green-50 text-green-600" };
}

/** Live banner preview */
function BannerPreview({ form }: { form: typeof EMPTY_FORM }) {
  return (
    <div className="relative w-full aspect-[16/6] rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
      {form.image_url ? (
        <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-1">
          <ImagePlus size={28} />
          <span className="text-xs font-manrope">No image</span>
        </div>
      )}
      {/* overlay */}
      <div className="absolute inset-0" style={{ background: form.overlay_color || "rgba(0,0,0,0)" }} />
      {/* text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        {form.title && (
          <p className="text-white font-bold text-lg leading-tight drop-shadow-md line-clamp-2">{form.title}</p>
        )}
        {form.subtitle && (
          <p className="text-white/80 text-sm mt-1 drop-shadow-sm line-clamp-2">{form.subtitle}</p>
        )}
        {form.cta_text && (
          <span className="mt-3 inline-block bg-white text-gray-900 text-xs font-semibold rounded-full px-4 py-1.5">
            {form.cta_text}
          </span>
        )}
      </div>
    </div>
  );
}

/** Full-screen banner preview overlay */
function BannerFullPreview({ banner, onClose }: { banner: any; onClose: () => void }) {
  const form = {
    image_url: banner.image_url ?? "",
    title: banner.title ?? "",
    subtitle: banner.subtitle ?? "",
    cta_text: banner.cta_text ?? "",
    overlay_color: banner.overlay_color ?? "rgba(0,0,0,0.35)",
  };
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-white font-manrope font-semibold text-sm">{banner.title}</span>
          {!banner.is_active && (
            <span className="text-[10px] font-manrope font-semibold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
              Inactive — not visible to customers
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white p-1">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: "16/7" }}>
          {form.image_url ? (
            <img src={form.image_url} alt={form.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
              <ImagePlus size={40} />
            </div>
          )}
          <div className="absolute inset-0" style={{ background: form.overlay_color }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            {form.subtitle && (
              <p className="text-white/70 text-sm uppercase tracking-widest mb-2 drop-shadow">{form.subtitle}</p>
            )}
            {form.title && (
              <p className="text-white font-bold text-3xl leading-tight drop-shadow-lg">{form.title}</p>
            )}
            {form.cta_text && (
              <span className="mt-5 inline-block bg-white text-gray-900 text-sm font-semibold rounded-full px-6 py-2 shadow-lg">
                {form.cta_text}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-center text-white/30 text-xs font-manrope pb-4">Click anywhere outside to close</p>
    </div>
  );
}

export default function AdminBannersPage() {
  useSEO({ title: "Banners", noindex: true });
  const [banners, setBanners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewBanner, setPreviewBanner] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setIsLoading(true);
    api.get("/api/v1/admin/banners")
      .then((r) => setBanners(r.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const set = (key: string, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

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
        mobile_image_url: form.mobile_image_url || null,
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
    if (!confirm("Delete this banner? This cannot be undone.")) return;
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

  const uploadImage = async (file: File, isMobile = false) => {
    const setter = isMobile ? setUploadingMobile : setUploading;
    setter(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/api/v1/admin/banners/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      set(isMobile ? "mobile_image_url" : "image_url", r.data.url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setter(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isMobile = false) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, isMobile);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) uploadImage(file);
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
          {banners.map((b) => {
            const status = getBannerStatus(b);
            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 flex items-center gap-4 p-4">
                <GripVertical size={16} className="text-gray-300 cursor-grab flex-shrink-0" />
                {/* thumbnail */}
                <div className="w-28 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImagePlus size={18} />
                    </div>
                  )}
                  <div className="absolute inset-0" style={{ background: b.overlay_color || "transparent" }} />
                </div>
                {/* info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium font-manrope text-gray-900 truncate">{b.title}</p>
                    <span className={`text-[10px] font-manrope font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  {b.subtitle && <p className="text-xs text-gray-500 font-manrope truncate mt-0.5">{b.subtitle}</p>}
                  {b.cta_text && (
                    <p className="text-xs text-maroon-600 font-manrope mt-0.5 flex items-center gap-1">
                      {b.cta_text}
                      {b.cta_link && <ExternalLink size={10} className="opacity-60" />}
                    </p>
                  )}
                  {(b.starts_at || b.ends_at) && (
                    <p className="text-[10px] text-gray-400 font-manrope mt-0.5">
                      {b.starts_at && `From ${new Date(b.starts_at).toLocaleDateString()}`}
                      {b.starts_at && b.ends_at && " → "}
                      {b.ends_at && `Until ${new Date(b.ends_at).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
                <span className="text-xs font-manrope text-gray-400 flex-shrink-0">#{b.display_order}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewBanner(b)}
                    title="Full preview"
                    className="p-1.5 text-gray-400 hover:text-maroon-700 rounded"
                  >
                    <Monitor size={15} />
                  </button>
                  <button
                    onClick={() => handleToggle(b)}
                    title={b.is_active ? "Deactivate" : "Activate"}
                    className={`p-1.5 rounded ${b.is_active ? "text-green-500 hover:text-gray-400" : "text-gray-300 hover:text-green-500"}`}
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
            );
          })}
        </div>
      )}

      {/* ── Full-screen preview ── */}
      {previewBanner && (
        <BannerFullPreview banner={previewBanner} onClose={() => setPreviewBanner(null)} />
      )}

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-bold font-lexend text-gray-900">{editTarget ? "Edit Banner" : "New Banner"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSave} id="banner-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">

                  {/* ── Left: fields ── */}
                  <div className="p-6 space-y-4">

                    {/* title */}
                    <div>
                      <label className="block text-xs font-manrope font-medium text-gray-500 mb-1">Title *</label>
                      <input
                        value={form.title}
                        onChange={(e) => set("title", e.target.value)}
                        required
                        placeholder="e.g. New Season Sale"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                      />
                    </div>

                    {/* subtitle */}
                    <div>
                      <label className="block text-xs font-manrope font-medium text-gray-500 mb-1">Subtitle</label>
                      <input
                        value={form.subtitle}
                        onChange={(e) => set("subtitle", e.target.value)}
                        placeholder="Supporting headline…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                      />
                    </div>

                    {/* CTA */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-manrope font-medium text-gray-500 mb-1">Button text</label>
                        <input
                          value={form.cta_text}
                          onChange={(e) => set("cta_text", e.target.value)}
                          placeholder="Shop Now"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-manrope font-medium text-gray-500 mb-1">Button link</label>
                        <input
                          value={form.cta_link}
                          onChange={(e) => set("cta_link", e.target.value)}
                          placeholder="/shop"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                        />
                      </div>
                    </div>

                    {/* Overlay colour */}
                    <div>
                      <label className="block text-xs font-manrope font-medium text-gray-500 mb-1">Overlay colour</label>
                      <div className="flex items-center gap-2">
                        <input
                          value={form.overlay_color}
                          onChange={(e) => set("overlay_color", e.target.value)}
                          placeholder="rgba(0,0,0,0.35)"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope font-mono focus:outline-none focus:ring-2 focus:ring-maroon-700"
                        />
                        {/* quick presets */}
                        {["rgba(0,0,0,0)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.65)"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => set("overlay_color", c)}
                            title={c}
                            className={`w-6 h-6 rounded border border-gray-200 flex-shrink-0 ${form.overlay_color === c ? "ring-2 ring-maroon-700 ring-offset-1" : ""}`}
                            style={{ background: c === "rgba(0,0,0,0)" ? "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px" : `rgba(0,0,0,${parseFloat(c.split(",")[3])})` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* order + active */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-manrope font-medium text-gray-500 mb-1">Display order</label>
                        <input
                          type="number"
                          value={form.display_order}
                          onChange={(e) => set("display_order", parseInt(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-5">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(e) => set("is_active", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-maroon-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-maroon-700" />
                          <span className="ml-2 text-xs font-manrope text-gray-600">Active</span>
                        </label>
                      </div>
                    </div>

                    {/* scheduling */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-manrope font-medium text-gray-500 mb-1">Start date</label>
                        <input
                          type="datetime-local"
                          value={form.starts_at}
                          onChange={(e) => set("starts_at", e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-manrope font-medium text-gray-500 mb-1">End date</label>
                        <input
                          type="datetime-local"
                          value={form.ends_at}
                          onChange={(e) => set("ends_at", e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Right: images + preview ── */}
                  <div className="p-6 space-y-4">

                    {/* Live preview */}
                    <div>
                      <label className="block text-xs font-manrope font-medium text-gray-500 mb-2">Live preview</label>
                      <BannerPreview form={form} />
                    </div>

                    {/* Desktop image */}
                    <div>
                      <label className="block text-xs font-manrope font-medium text-gray-500 mb-1">Desktop image *</label>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer transition-colors text-center ${dragOver ? "border-maroon-700 bg-maroon-50" : "border-gray-200 hover:border-gray-300"}`}
                      >
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e)} className="hidden" disabled={uploading} />
                        {uploading ? (
                          <p className="text-xs font-manrope text-gray-400">Uploading…</p>
                        ) : form.image_url ? (
                          <p className="text-xs font-manrope text-gray-500 truncate">
                            ✓ <span className="text-maroon-700">Image set</span> — click or drag to replace
                          </p>
                        ) : (
                          <p className="text-xs font-manrope text-gray-400">
                            <span className="text-maroon-700 font-medium">Click to upload</span> or drag & drop
                          </p>
                        )}
                      </div>
                      <input
                        value={form.image_url}
                        onChange={(e) => set("image_url", e.target.value)}
                        placeholder="Or paste image URL…"
                        className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-manrope font-mono focus:outline-none focus:ring-2 focus:ring-maroon-700"
                      />
                    </div>

                    {/* Mobile image */}
                    <div>
                      <label className="block text-xs font-manrope font-medium text-gray-500 mb-1">
                        Mobile image <span className="text-gray-400">(optional)</span>
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          value={form.mobile_image_url}
                          onChange={(e) => set("mobile_image_url", e.target.value)}
                          placeholder="Paste mobile image URL…"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs font-manrope font-mono focus:outline-none focus:ring-2 focus:ring-maroon-700"
                        />
                        <label className="flex-shrink-0 cursor-pointer text-xs font-manrope text-maroon-700 hover:text-maroon-800 font-medium whitespace-nowrap">
                          {uploadingMobile ? "Uploading…" : "Upload"}
                          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, true)} className="hidden" disabled={uploadingMobile} />
                        </label>
                      </div>
                      {form.mobile_image_url && (
                        <img src={form.mobile_image_url} alt="mobile preview" className="mt-2 w-16 h-10 object-cover rounded" />
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 border border-gray-200 text-gray-700 font-manrope text-sm rounded-lg py-2.5">
                Cancel
              </button>
              <button type="submit" form="banner-form" disabled={saving} className="flex-1 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-60 text-white font-manrope text-sm font-medium rounded-lg py-2.5">
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Banner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
