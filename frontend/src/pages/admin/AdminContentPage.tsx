import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2, ArrowLeft,
} from "lucide-react";
import api from "../../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FAQItem { q: string; a: string }
interface FAQCategory { category: string; items: FAQItem[] }
interface FAQContent { categories: FAQCategory[] }

interface PolicySection { title: string; body: string[] }
interface PolicyContent { sections: PolicySection[] }

interface ShippingHighlight { title: string; desc: string }
interface ShippingContent {
  highlights: ShippingHighlight[];
  important_info: string[];
  cod_text: string;
}

interface SizeRow { size: string; chest: string; waist: string; hip: string; height: string }
interface SizeTip { label: string; text: string }
interface SizeGuideContent {
  unit_note: string;
  sizes: SizeRow[];
  tips: SizeTip[];
  tip_note: string;
}

// ─── Page meta ────────────────────────────────────────────────────────────────

const PAGE_META: Record<string, { label: string; apiKey: string }> = {
  faq: { label: "FAQ", apiKey: "faq" },
  privacy: { label: "Privacy Policy", apiKey: "privacy" },
  terms: { label: "Terms of Service", apiKey: "terms" },
  shipping: { label: "Shipping Info", apiKey: "shipping" },
  "size-guide": { label: "Size Guide", apiKey: "size-guide" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ─── Sub-editors ──────────────────────────────────────────────────────────────

function FAQEditor({ data, onChange }: { data: FAQContent; onChange: (d: FAQContent) => void }) {
  const cats = data.categories;

  const addCategory = () =>
    onChange({ categories: [...cats, { category: "New Category", items: [] }] });

  const removeCategory = (ci: number) =>
    onChange({ categories: cats.filter((_, i) => i !== ci) });

  const updateCategoryName = (ci: number, name: string) => {
    const next = [...cats];
    next[ci] = { ...next[ci], category: name };
    onChange({ categories: next });
  };

  const addItem = (ci: number) => {
    const next = [...cats];
    next[ci] = { ...next[ci], items: [...next[ci].items, { q: "", a: "" }] };
    onChange({ categories: next });
  };

  const removeItem = (ci: number, ii: number) => {
    const next = [...cats];
    next[ci] = { ...next[ci], items: next[ci].items.filter((_, i) => i !== ii) };
    onChange({ categories: next });
  };

  const updateItem = (ci: number, ii: number, field: "q" | "a", val: string) => {
    const next = [...cats];
    const items = [...next[ci].items];
    items[ii] = { ...items[ii], [field]: val };
    next[ci] = { ...next[ci], items };
    onChange({ categories: next });
  };

  const moveCategory = (ci: number, dir: -1 | 1) =>
    onChange({ categories: move(cats, ci, ci + dir) });

  return (
    <div className="space-y-5">
      {cats.map((cat, ci) => (
        <div key={ci} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Category header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <input
              value={cat.category}
              onChange={(e) => updateCategoryName(ci, e.target.value)}
              className="flex-1 text-sm font-semibold font-manrope bg-transparent border-none outline-none text-gray-900"
              placeholder="Category name"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => moveCategory(ci, -1)}
                disabled={ci === 0}
                className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronUp size={15} />
              </button>
              <button
                onClick={() => moveCategory(ci, 1)}
                disabled={ci === cats.length - 1}
                className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronDown size={15} />
              </button>
              <button
                onClick={() => removeCategory(ci)}
                className="p-1 rounded text-red-400 hover:text-red-600"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="divide-y divide-gray-100">
            {cat.items.map((item, ii) => (
              <div key={ii} className="px-4 py-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={item.q}
                    onChange={(e) => updateItem(ci, ii, "q", e.target.value)}
                    placeholder="Question"
                    className="flex-1 text-sm font-manrope border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-maroon-400"
                  />
                  <button
                    onClick={() => removeItem(ci, ii)}
                    className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <textarea
                  value={item.a}
                  onChange={(e) => updateItem(ci, ii, "a", e.target.value)}
                  placeholder="Answer"
                  rows={2}
                  className="w-full text-sm font-manrope border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-maroon-400"
                />
              </div>
            ))}
          </div>

          {/* Add item */}
          <div className="px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => addItem(ci)}
              className="inline-flex items-center gap-1.5 text-xs font-manrope font-semibold text-maroon-700 hover:text-maroon-800"
            >
              <Plus size={13} /> Add Question
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addCategory}
        className="inline-flex items-center gap-2 text-sm font-manrope font-semibold text-maroon-700 bg-maroon-50 border border-maroon-200 px-4 py-2 rounded-lg hover:bg-maroon-100 transition-colors"
      >
        <Plus size={15} /> Add Category
      </button>
    </div>
  );
}

function PolicyEditor({
  data,
  onChange,
}: {
  data: PolicyContent;
  onChange: (d: PolicyContent) => void;
}) {
  const secs = data.sections;

  const addSection = () =>
    onChange({ sections: [...secs, { title: "New Section", body: [""] }] });

  const removeSection = (si: number) =>
    onChange({ sections: secs.filter((_, i) => i !== si) });

  const updateTitle = (si: number, val: string) => {
    const next = [...secs];
    next[si] = { ...next[si], title: val };
    onChange({ sections: next });
  };

  const addBullet = (si: number) => {
    const next = [...secs];
    next[si] = { ...next[si], body: [...next[si].body, ""] };
    onChange({ sections: next });
  };

  const removeBullet = (si: number, bi: number) => {
    const next = [...secs];
    next[si] = { ...next[si], body: next[si].body.filter((_, i) => i !== bi) };
    onChange({ sections: next });
  };

  const updateBullet = (si: number, bi: number, val: string) => {
    const next = [...secs];
    const body = [...next[si].body];
    body[bi] = val;
    next[si] = { ...next[si], body };
    onChange({ sections: next });
  };

  const moveSection = (si: number, dir: -1 | 1) =>
    onChange({ sections: move(secs, si, si + dir) });

  return (
    <div className="space-y-5">
      {secs.map((sec, si) => (
        <div key={si} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Section header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <input
              value={sec.title}
              onChange={(e) => updateTitle(si, e.target.value)}
              className="flex-1 text-sm font-semibold font-manrope bg-transparent border-none outline-none text-gray-900"
              placeholder="Section title"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => moveSection(si, -1)}
                disabled={si === 0}
                className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronUp size={15} />
              </button>
              <button
                onClick={() => moveSection(si, 1)}
                disabled={si === secs.length - 1}
                className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronDown size={15} />
              </button>
              <button
                onClick={() => removeSection(si)}
                className="p-1 rounded text-red-400 hover:text-red-600"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Bullets */}
          <div className="px-4 py-3 space-y-2">
            {sec.body.map((bullet, bi) => (
              <div key={bi} className="flex gap-2">
                <textarea
                  value={bullet}
                  onChange={(e) => updateBullet(si, bi, e.target.value)}
                  placeholder="Bullet point"
                  rows={2}
                  className="flex-1 text-sm font-manrope border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-maroon-400"
                />
                <button
                  onClick={() => removeBullet(si, bi)}
                  className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 self-start mt-0.5"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addBullet(si)}
              className="inline-flex items-center gap-1.5 text-xs font-manrope font-semibold text-maroon-700 hover:text-maroon-800"
            >
              <Plus size={13} /> Add Bullet
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addSection}
        className="inline-flex items-center gap-2 text-sm font-manrope font-semibold text-maroon-700 bg-maroon-50 border border-maroon-200 px-4 py-2 rounded-lg hover:bg-maroon-100 transition-colors"
      >
        <Plus size={15} /> Add Section
      </button>
    </div>
  );
}

function ShippingEditor({
  data,
  onChange,
}: {
  data: ShippingContent;
  onChange: (d: ShippingContent) => void;
}) {
  const updateHighlight = (i: number, field: "title" | "desc", val: string) => {
    const highlights = [...data.highlights];
    highlights[i] = { ...highlights[i], [field]: val };
    onChange({ ...data, highlights });
  };

  const updateInfoBullet = (i: number, val: string) => {
    const important_info = [...data.important_info];
    important_info[i] = val;
    onChange({ ...data, important_info });
  };

  const addInfoBullet = () =>
    onChange({ ...data, important_info: [...data.important_info, ""] });

  const removeInfoBullet = (i: number) =>
    onChange({ ...data, important_info: data.important_info.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">
      {/* Highlights */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold font-manrope text-gray-900">Highlight Cards (3 cards)</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {data.highlights.map((h, i) => (
            <div key={i} className="px-4 py-3 space-y-2">
              <input
                value={h.title}
                onChange={(e) => updateHighlight(i, "title", e.target.value)}
                placeholder="Title"
                className="w-full text-sm font-manrope border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-maroon-400"
              />
              <input
                value={h.desc}
                onChange={(e) => updateHighlight(i, "desc", e.target.value)}
                placeholder="Description"
                className="w-full text-sm font-manrope border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-maroon-400"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Important info */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold font-manrope text-gray-900">Important Information</h3>
        </div>
        <div className="px-4 py-3 space-y-2">
          {data.important_info.map((text, i) => (
            <div key={i} className="flex gap-2">
              <textarea
                value={text}
                onChange={(e) => updateInfoBullet(i, e.target.value)}
                placeholder="Bullet point"
                rows={2}
                className="flex-1 text-sm font-manrope border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-maroon-400"
              />
              <button
                onClick={() => removeInfoBullet(i)}
                className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 self-start mt-0.5"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            onClick={addInfoBullet}
            className="inline-flex items-center gap-1.5 text-xs font-manrope font-semibold text-maroon-700 hover:text-maroon-800"
          >
            <Plus size={13} /> Add Bullet
          </button>
        </div>
      </div>

      {/* COD text */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold font-manrope text-gray-900">Cash on Delivery Description</h3>
        </div>
        <div className="px-4 py-3">
          <textarea
            value={data.cod_text}
            onChange={(e) => onChange({ ...data, cod_text: e.target.value })}
            rows={4}
            className="w-full text-sm font-manrope border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-maroon-400"
          />
        </div>
      </div>
    </div>
  );
}

function SizeGuideEditor({
  data,
  onChange,
}: {
  data: SizeGuideContent;
  onChange: (d: SizeGuideContent) => void;
}) {
  const updateRow = (i: number, field: keyof SizeRow, val: string) => {
    const sizes = [...data.sizes];
    sizes[i] = { ...sizes[i], [field]: val };
    onChange({ ...data, sizes });
  };

  const addRow = () =>
    onChange({
      ...data,
      sizes: [...data.sizes, { size: "", chest: "", waist: "", hip: "", height: "" }],
    });

  const removeRow = (i: number) =>
    onChange({ ...data, sizes: data.sizes.filter((_, idx) => idx !== i) });

  const moveRow = (i: number, dir: -1 | 1) =>
    onChange({ ...data, sizes: move(data.sizes, i, i + dir) });

  const updateTip = (i: number, field: "label" | "text", val: string) => {
    const tips = [...data.tips];
    tips[i] = { ...tips[i], [field]: val };
    onChange({ ...data, tips });
  };

  const addTip = () =>
    onChange({ ...data, tips: [...data.tips, { label: "", text: "" }] });

  const removeTip = (i: number) =>
    onChange({ ...data, tips: data.tips.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">
      {/* Unit note */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold font-manrope text-gray-900">Introductory Note</h3>
        </div>
        <div className="px-4 py-3">
          <textarea
            value={data.unit_note}
            onChange={(e) => onChange({ ...data, unit_note: e.target.value })}
            rows={2}
            className="w-full text-sm font-manrope border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-maroon-400"
          />
        </div>
      </div>

      {/* Size table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold font-manrope text-gray-900">Size Chart Rows</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-manrope">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Size</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Chest</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Waist</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Hip</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Height (cm)</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.sizes.map((row, i) => (
                <tr key={i}>
                  {(["size", "chest", "waist", "hip", "height"] as (keyof SizeRow)[]).map((field) => (
                    <td key={field} className="px-3 py-2">
                      <input
                        value={row[field]}
                        onChange={(e) => updateRow(i, field, e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-maroon-400"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveRow(i, -1)}
                        disabled={i === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveRow(i, 1)}
                        disabled={i === data.sizes.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={() => removeRow(i)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 text-xs font-manrope font-semibold text-maroon-700 hover:text-maroon-800"
          >
            <Plus size={13} /> Add Size Row
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold font-manrope text-gray-900">How to Measure Tips</h3>
        </div>
        <div className="px-4 py-3 space-y-3">
          {data.tips.map((tip, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={tip.label}
                onChange={(e) => updateTip(i, "label", e.target.value)}
                placeholder="Label (e.g. Chest)"
                className="w-28 text-sm font-manrope border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-maroon-400"
              />
              <input
                value={tip.text}
                onChange={(e) => updateTip(i, "text", e.target.value)}
                placeholder="Description"
                className="flex-1 text-sm font-manrope border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-maroon-400"
              />
              <button
                onClick={() => removeTip(i)}
                className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            onClick={addTip}
            className="inline-flex items-center gap-1.5 text-xs font-manrope font-semibold text-maroon-700 hover:text-maroon-800"
          >
            <Plus size={13} /> Add Tip
          </button>
        </div>
      </div>

      {/* Tip note */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold font-manrope text-gray-900">Sizing Tip Note</h3>
        </div>
        <div className="px-4 py-3">
          <textarea
            value={data.tip_note}
            onChange={(e) => onChange({ ...data, tip_note: e.target.value })}
            rows={2}
            className="w-full text-sm font-manrope border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-maroon-400"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminContentPage() {
  const { page = "faq" } = useParams<{ page: string }>();
  const navigate = useNavigate();
  const meta = PAGE_META[page];

  const [content, setContent] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (!meta) return;
    setContent(null);
    setLoading(true);
    api
      .get(`/api/v1/admin/content/${meta.apiKey}`)
      .then((r) => setContent(r.data.content))
      .catch(() => setToast({ type: "error", msg: "Failed to load content." }))
      .finally(() => setLoading(false));
  }, [page]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async () => {
    if (!meta) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/admin/content/${meta.apiKey}`, { content });
      showToast("success", `${meta.label} saved successfully.`);
    } catch {
      showToast("error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!meta) {
    return (
      <div className="p-8 text-center text-gray-500 font-manrope">
        Unknown content page. Go back and try again.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs font-manrope text-gray-400">Edit Content</p>
            <h1 className="text-xl font-bold font-lexend text-gray-900">{meta.label}</h1>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 bg-maroon-700 text-white text-sm font-manrope font-semibold px-5 py-2.5 rounded-lg hover:bg-maroon-800 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-5 px-4 py-3 rounded-xl text-sm font-manrope font-medium ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Editor */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : (
        <>
          {page === "faq" && content && (
            <FAQEditor data={content as FAQContent} onChange={setContent} />
          )}
          {(page === "privacy" || page === "terms") && content && (
            <PolicyEditor data={content as PolicyContent} onChange={setContent} />
          )}
          {page === "shipping" && content && (
            <ShippingEditor data={content as ShippingContent} onChange={setContent} />
          )}
          {page === "size-guide" && content && (
            <SizeGuideEditor data={content as SizeGuideContent} onChange={setContent} />
          )}
        </>
      )}

      {/* Bottom save */}
      {!loading && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-maroon-700 text-white text-sm font-manrope font-semibold px-5 py-2.5 rounded-lg hover:bg-maroon-800 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
