import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Upload, X } from "lucide-react";
import api from "../../services/api";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import toast from "react-hot-toast";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const DEFAULT_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Navy Blue", hex: "#1E3A5F" },
  { name: "Maroon", hex: "#782121" },
  { name: "Grey", hex: "#9CA3AF" },
];

export default function AdminProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", price: "", compare_at_price: "",
    category_id: "", subcategory_id: "", status: "active",
    is_featured: false, is_on_sale: false, sale_percentage: "",
  });
  const [variants, setVariants] = useState<{ size: string; color_name: string; color_hex: string; stock_quantity: number; sku: string }[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/api/v1/categories").then((r) => setCategories(r.data)).catch(() => {});
    if (isEdit) {
      setIsLoading(true);
      api.get(`/api/v1/admin/products/${id}`)
        .then((r) => {
          const p = r.data;
          setForm({
            name: p.name, slug: p.slug, description: p.description || "",
            price: String(p.price), compare_at_price: p.compare_at_price ? String(p.compare_at_price) : "",
            category_id: p.category_id || "", subcategory_id: p.subcategory_id || "",
            status: p.status, is_featured: p.is_featured, is_on_sale: p.is_on_sale,
            sale_percentage: p.sale_percentage ? String(p.sale_percentage) : "",
          });
          setVariants(p.variants?.map((v: any) => ({ size: v.size, color_name: v.color_name, color_hex: v.color_hex, stock_quantity: v.stock_quantity, sku: v.sku })) ?? []);
          setExistingImages(p.images ?? []);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const generateVariants = () => {
    const selectedColors = DEFAULT_COLORS.slice(0, 3);
    const newVariants = SIZES.flatMap((size) =>
      selectedColors.map((color) => ({
        size,
        color_name: color.name,
        color_hex: color.hex,
        stock_quantity: 10,
        sku: `${form.slug || "PROD"}-${size}-${color.name.toUpperCase().replace(/\s/g, "-")}`,
      }))
    );
    setVariants(newVariants);
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        sale_percentage: form.sale_percentage ? parseInt(form.sale_percentage) : null,
        category_id: form.category_id || null,
        subcategory_id: form.subcategory_id || null,
        variants,
      };

      let productId = id;
      if (isEdit) {
        await api.patch(`/api/v1/admin/products/${id}`, payload);
      } else {
        const res = await api.post("/api/v1/admin/products", payload);
        productId = res.data.id;
      }

      // Upload images
      for (const img of images) {
        const fd = new FormData();
        fd.append("file", img);
        await api.post(`/api/v1/admin/products/${productId}/images`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success(isEdit ? "Product updated!" : "Product created!");
      navigate("/admin/products");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save product.");
    } finally {
      setIsSaving(false);
    }
  };

  const safeCategories = Array.isArray(categories) ? categories : [];
  const subcategories = safeCategories.find((c) => c.id === form.category_id)?.subcategories ?? [];
  const setf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  if (isLoading) return <div className="text-center text-gray-500 py-16">Loading…</div>;

  return (
    <form onSubmit={handleSave}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-lexend text-gray-900">{isEdit ? "Edit Product" : "New Product"}</h1>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/products")}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>Save Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold font-lexend text-gray-900">Basic Information</h2>
            <Input label="Product Name" value={form.name} onChange={setf("name")} required />
            <Input label="Slug (URL)" value={form.slug} onChange={setf("slug")} hint="Auto-generated from name if left empty" />
            <div>
              <label className="text-sm font-medium text-gray-700 font-manrope block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={setf("description")}
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                placeholder="Product description…"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold font-lexend text-gray-900">Pricing</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Price (KSh)" type="number" value={form.price} onChange={setf("price")} required min="0" step="0.01" />
              <Input label="Compare At Price (KSh)" type="number" value={form.compare_at_price} onChange={setf("compare_at_price")} min="0" step="0.01" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_on_sale} onChange={setf("is_on_sale")} className="rounded text-maroon-700" />
                <span className="text-sm font-manrope text-gray-700">On Sale</span>
              </label>
              {form.is_on_sale && (
                <Input label="Sale %" type="number" value={form.sale_percentage} onChange={setf("sale_percentage")} min="1" max="99" className="w-24" />
              )}
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold font-lexend text-gray-900 mb-4">Images</h2>
            <div className="grid grid-cols-4 gap-3">
              {existingImages.map((img) => (
                <div key={img.id} className="aspect-[4/5] rounded-lg overflow-hidden bg-gray-100">
                  <img src={img.thumbnail_url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {images.map((img, i) => (
                <div key={i} className="relative aspect-[4/5] rounded-lg overflow-hidden bg-gray-100">
                  <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[4/5] rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-maroon-700 hover:text-maroon-700 transition-colors"
              >
                <Upload size={20} />
                <span className="text-xs font-manrope">Add</span>
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
          </div>

          {/* Variants */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold font-lexend text-gray-900">Variants</h2>
              {variants.length === 0 && (
                <Button type="button" size="sm" variant="outline" onClick={generateVariants}>
                  Auto-generate (6 sizes × 3 colors)
                </Button>
              )}
            </div>
            {variants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 font-manrope">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-left">SKU</th>
                      <th className="py-2 text-left">Size</th>
                      <th className="py-2 text-left">Color</th>
                      <th className="py-2 text-left">Stock</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {variants.map((v, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-3">
                          <input
                            value={v.sku}
                            onChange={(e) => setVariants((prev) => prev.map((pv, j) => j === i ? { ...pv, sku: e.target.value } : pv))}
                            className="border border-gray-200 rounded px-2 py-1 text-xs font-manrope w-36 focus:outline-none focus:ring-1 focus:ring-maroon-700"
                          />
                        </td>
                        <td className="py-1.5 pr-3 text-sm font-manrope">{v.size}</td>
                        <td className="py-1.5 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: v.color_hex }} />
                            <span className="text-sm font-manrope">{v.color_name}</span>
                          </div>
                        </td>
                        <td className="py-1.5 pr-3">
                          <input
                            type="number"
                            value={v.stock_quantity}
                            onChange={(e) => setVariants((prev) => prev.map((pv, j) => j === i ? { ...pv, stock_quantity: parseInt(e.target.value) || 0 } : pv))}
                            className="border border-gray-200 rounded px-2 py-1 text-xs font-manrope w-16 focus:outline-none focus:ring-1 focus:ring-maroon-700"
                          />
                        </td>
                        <td className="py-1.5">
                          <button type="button" onClick={() => setVariants((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 font-manrope">No variants added yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold font-lexend text-gray-900">Organization</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 font-manrope block mb-1">Status</label>
              <select value={form.status} onChange={setf("status")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 font-manrope block mb-1">Category</label>
              <select value={form.category_id} onChange={setf("category_id")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700">
                <option value="">Select category</option>
                {safeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {subcategories.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 font-manrope block mb-1">Subcategory</label>
                <select value={form.subcategory_id} onChange={setf("subcategory_id")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700">
                  <option value="">Select subcategory</option>
                  {subcategories.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={setf("is_featured")} className="rounded text-maroon-700" />
              <span className="text-sm font-manrope text-gray-700">Featured Product</span>
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
