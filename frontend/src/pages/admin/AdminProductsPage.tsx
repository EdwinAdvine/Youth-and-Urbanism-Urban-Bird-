import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import api from "../../services/api";
import { formatKSh } from "../../utils/formatPrice";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import toast from "react-hot-toast";
import { useNavCategoryStore } from "../../store/navCategoryStore";
import { useSEO } from "../../hooks/useSEO";

export default function AdminProductsPage() {
  useSEO({ title: "Products", noindex: true });
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  const { navCategories, rawCategories, isLoaded, fetchCategories } = useNavCategoryStore();
  useEffect(() => { fetchCategories(); }, []);

  // Subcategory items from the dynamic store
  const subcategoryItems = activeCategory
    ? (rawCategories
        .find((c) => c.slug === activeCategory)
        ?.subcategories.filter((s) => s.is_active !== false)
        .sort((a, b) => a.display_order - b.display_order)
        .map((s) => ({ label: s.name, slug: s.slug })) ?? [])
    : [];

  const displayCategories = isLoaded && navCategories.length > 0 ? navCategories : [];

  const handleCategoryClick = (slug: string) => {
    setActiveCategory(slug === activeCategory ? null : slug);
    setActiveSubcategory(null);
  };

  const load = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("q", search);
    if (activeCategory) params.set("category", activeCategory);
    if (activeSubcategory) params.set("subcategory", activeSubcategory);
    api.get(`/api/v1/admin/products?${params}`)
      .then((r) => { setProducts(r.data.items); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, [page, activeCategory, activeSubcategory]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      await api.delete(`/api/v1/admin/products/${id}`);
      toast.success("Product deleted.");
      load();
    } catch {
      toast.error("Failed to delete product.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-lexend text-gray-900">Products</h1>
        <Link to="/admin/products/new">
          <Button size="sm" className="flex items-center gap-2">
            <Plus size={15} /> Add Product
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load(); }}
            placeholder="Search products…"
            className="w-full pl-9 pr-3 py-2 text-sm font-manrope border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-700"
          />
        </div>
        <Button size="sm" variant="outline" onClick={load}>Search</Button>
      </div>

      {/* Category filter — Row 1 */}
      <div className="flex gap-2 mb-2 flex-wrap">
        <button
          onClick={() => { setActiveCategory(null); setActiveSubcategory(null); }}
          className={`px-4 py-1.5 rounded-full text-xs font-manrope font-medium border transition-colors ${
            !activeCategory
              ? "bg-maroon-700 text-white border-maroon-700"
              : "bg-white text-gray-600 border-gray-200 hover:border-maroon-700 hover:text-maroon-700"
          }`}
        >
          All
        </button>
        {displayCategories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => handleCategoryClick(cat.slug)}
            className={`px-4 py-1.5 rounded-full text-xs font-manrope font-medium border transition-colors ${
              activeCategory === cat.slug
                ? "bg-maroon-700 text-white border-maroon-700"
                : "bg-white text-gray-600 border-gray-200 hover:border-maroon-700 hover:text-maroon-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Subcategory filter — Row 2 */}
      {activeCategory && (
        <div className="flex gap-2 mb-4 flex-wrap pl-2 border-l-2 border-maroon-200">
          <button
            onClick={() => setActiveSubcategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-manrope font-medium border transition-colors ${
              !activeSubcategory
                ? "bg-maroon-100 text-maroon-800 border-maroon-300"
                : "bg-white text-gray-500 border-gray-200 hover:border-maroon-300 hover:text-maroon-700"
            }`}
          >
            All {displayCategories.find((c) => c.slug === activeCategory)?.label}
          </button>
          {subcategoryItems.map((sub) => (
            <button
              key={sub.slug}
              onClick={() => setActiveSubcategory(sub.slug === activeSubcategory ? null : sub.slug)}
              className={`px-3 py-1 rounded-full text-xs font-manrope font-medium border transition-colors ${
                activeSubcategory === sub.slug
                  ? "bg-maroon-100 text-maroon-800 border-maroon-300"
                  : "bg-white text-gray-500 border-gray-200 hover:border-maroon-300 hover:text-maroon-700"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[650px]">
          <thead className="bg-gray-50 text-xs text-gray-500 font-manrope uppercase">
            <tr>
              {["Product", "Category", "Price", "Stock", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.primary_image && (
                          <img src={p.primary_image} alt={p.name} className="w-10 h-12 object-cover rounded-md bg-gray-100 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium font-manrope text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400 font-manrope">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-manrope">{p.category?.name}</td>
                    <td className="px-4 py-3 font-bold font-manrope text-gray-900">{formatKSh(p.price)}</td>
                    <td className="px-4 py-3 text-gray-700 font-manrope">
                      <Badge variant={p.total_stock === 0 ? "danger" : p.total_stock < 10 ? "warning" : "success"}>
                        {p.total_stock}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === "active" ? "success" : "default"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/products/${p.id}/edit`} className="text-gray-500 hover:text-maroon-700 transition-colors">
                          <Edit2 size={15} />
                        </Link>
                        <button onClick={() => handleDelete(p.id)} className="text-gray-500 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {products.length === 0 && !isLoading && (
          <p className="text-center text-gray-500 font-manrope py-12">No products found.</p>
        )}
      </div>
    </div>
  );
}
