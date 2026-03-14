import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { useProductStore } from "../store/productStore";
import ProductGrid from "../components/product/ProductGrid";
import Button from "../components/ui/Button";
import ShopSidebar from "../components/product/ShopSidebar";
import { useSEO } from "../hooks/useSEO";

const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "popularity", label: "Most Popular" },
  { value: "rating", label: "Top Rated" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { products, totalCount, isLoading, fetchProducts } = useProductStore();

  const currentSort = searchParams.get("sort") || "latest";
  const currentPage = parseInt(searchParams.get("page") || "1");
  const isOnSale = searchParams.get("on_sale") === "true";

  useSEO({
    title: isOnSale ? "Sale — Up to 70% Off Streetwear" : "Shop Urban Streetwear",
    description: isOnSale
      ? "Massive discounts on Urban Bird streetwear. Hoodies, sweatpants, jackets — while stocks last."
      : "Browse all Urban Bird products. Hoodies, sweatpants, jackets & accessories for men, women and kids in Kenya.",
    url: "https://urbanbird.co.ke/shop",
  });

  useEffect(() => {
    const params: Record<string, any> = { sort: currentSort };
    if (searchParams.get("category")) params.category = searchParams.get("category");
    if (searchParams.get("sub")) params.subcategory = searchParams.get("sub");
    if (searchParams.get("on_sale") === "true") params.on_sale = true;
    if (searchParams.get("in_stock") === "true") params.in_stock = true;
    if (searchParams.get("price_min")) params.min_price = Number(searchParams.get("price_min"));
    if (searchParams.get("price_max")) params.max_price = Number(searchParams.get("price_max"));
    if (searchParams.get("q")) params.search = searchParams.get("q");
    fetchProducts(params, currentPage);
  }, [searchParams.toString()]);

  const handleSort = (sort: string) => {
    setSearchParams((prev) => { prev.set("sort", sort); return prev; });
  };

  const totalPages = Math.ceil(totalCount / 24);

  return (
    <div className="container-custom py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-lexend text-gray-900">
            {searchParams.get("on_sale") === "true" ? "Sale" : "All Products"}
          </h1>
          <p className="text-sm text-gray-500 font-manrope mt-1">
            {isLoading ? "Loading…" : `${totalCount} products`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter toggle (mobile) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden flex items-center gap-2"
          >
            <SlidersHorizontal size={15} />
            Filter
          </Button>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={currentSort}
              onChange={(e) => handleSort(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm font-manrope border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-maroon-700 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <ShopSidebar />
        </aside>

        {/* Mobile sidebar drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-xs bg-white overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="font-semibold font-lexend text-gray-900">Filters</h2>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-500 text-sm font-manrope">
                  Done
                </button>
              </div>
              <ShopSidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Products */}
        <div className="flex-1 min-w-0">
          <ProductGrid products={products} isLoading={isLoading} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setSearchParams((prev) => { prev.set("page", String(p)); return prev; })}
                  className={`w-9 h-9 rounded-lg text-sm font-manrope transition-colors ${
                    p === currentPage
                      ? "bg-maroon-700 text-white"
                      : "border border-gray-200 text-gray-700 hover:border-maroon-700 hover:text-maroon-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
