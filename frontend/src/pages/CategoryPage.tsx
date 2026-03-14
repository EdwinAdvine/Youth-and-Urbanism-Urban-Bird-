import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useProductStore } from "../store/productStore";
import { categoryService } from "../services/categoryService";
import type { Category } from "../types";
import ProductGrid from "../components/product/ProductGrid";
import ShopSidebar from "../components/product/ShopSidebar";
import Button from "../components/ui/Button";
import { ChevronRight, Clock, SlidersHorizontal } from "lucide-react";
import { useSEO } from "../hooks/useSEO";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { products, totalCount, isLoading, fetchProducts } = useProductStore();

  useEffect(() => {
    if (!slug) return;
    categoryService.getCategoryBySlug(slug).then(setCategory).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const params: Record<string, any> = { category: slug, sort: searchParams.get("sort") || "latest" };
    if (searchParams.get("sub")) params.subcategory = searchParams.get("sub");
    if (searchParams.get("on_sale") === "true") params.on_sale = true;
    if (searchParams.get("in_stock") === "true") params.in_stock = true;
    if (searchParams.get("price_min")) params.min_price = Number(searchParams.get("price_min"));
    if (searchParams.get("price_max")) params.max_price = Number(searchParams.get("price_max"));
    fetchProducts(params, 1);
  }, [slug, searchParams.toString()]);

  const activeSub = searchParams.get("sub");

  useSEO({
    title: category ? `${category.name} Collection` : undefined,
    description: category
      ? `Shop the latest ${category.name.toLowerCase()} collection from Urban Bird. Premium urban streetwear — hoodies, sweatpants, jackets & accessories delivered across Kenya.`
      : undefined,
    image: category?.banner_url,
    url: `https://urbanbird.co.ke/category/${slug}`,
    jsonLd: category
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://urbanbird.co.ke/" },
            { "@type": "ListItem", position: 2, name: category.name, item: `https://urbanbird.co.ke/category/${slug}` },
          ],
        }
      : null,
  });

  return (
    <div>
      {/* Category banner */}
      {category?.banner_url && (
        <div className="relative h-36 sm:h-48 md:h-64 overflow-hidden">
          <img src={category.banner_url} alt={category.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center">
            <div className="container-custom">
              <h1 className="text-2xl sm:text-4xl font-bold font-lexend text-white">{category.name}</h1>
            </div>
          </div>
        </div>
      )}

      <div className="container-custom py-6 sm:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm font-manrope text-gray-500 mb-4 sm:mb-6">
          <Link to="/" className="hover:text-maroon-700">Home</Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">{category?.name ?? slug}</span>
        </nav>

        {/* Subcategory pills */}
        {category?.subcategories && category.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            <Link
              to={`/category/${slug}`}
              className={`px-4 py-1.5 text-sm rounded-full font-manrope transition-colors ${
                !activeSub ? "bg-maroon-700 text-white" : "border border-gray-200 text-gray-700 hover:border-maroon-700"
              }`}
            >
              All
            </Link>
            {category.subcategories.map((sub) => (
              <Link
                key={sub.id}
                to={`/category/${slug}?sub=${sub.slug}`}
                className={`px-4 py-1.5 text-sm rounded-full font-manrope transition-colors ${
                  activeSub === sub.slug
                    ? "bg-maroon-700 text-white"
                    : "border border-gray-200 text-gray-700 hover:border-maroon-700"
                }`}
              >
                {sub.name}
              </Link>
            ))}
          </div>
        )}

        {/* Mobile filter button */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <p className="text-sm text-gray-500 font-manrope">
            {isLoading ? "Loading…" : `${totalCount} products`}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal size={15} />
            Filter
          </Button>
        </div>

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
              <ShopSidebar
                onClose={() => setSidebarOpen(false)}
                activeCategory={slug}
                onCategoryNavigate={(s) => { navigate(`/category/${s}`); setSidebarOpen(false); }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-8">
          <aside className="hidden lg:block w-60 flex-shrink-0">
            <ShopSidebar
              activeCategory={slug}
              onCategoryNavigate={(s) => navigate(`/category/${s}`)}
            />
          </aside>
          <div className="flex-1 min-w-0">
            {!isLoading && totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Clock size={48} className="text-maroon-700 mb-4 opacity-70" />
                <h2 className="text-2xl font-bold font-lexend text-gray-900 mb-2">Coming Soon</h2>
                <p className="text-gray-500 font-manrope max-w-sm">
                  We're working on something great for this category. Check back soon!
                </p>
                <Link
                  to="/shop"
                  className="mt-6 px-6 py-2.5 bg-maroon-700 text-white text-sm font-semibold font-lexend rounded-full hover:bg-maroon-800 transition-colors"
                >
                  Browse All Products
                </Link>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 font-manrope mb-4">
                  {isLoading ? "Loading…" : `${totalCount} products`}
                </p>
                <ProductGrid products={products} isLoading={isLoading} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
