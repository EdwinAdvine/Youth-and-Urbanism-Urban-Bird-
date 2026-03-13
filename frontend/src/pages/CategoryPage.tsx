import { useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useProductStore } from "../store/productStore";
import { categoryService } from "../services/categoryService";
import { useState } from "react";
import type { Category } from "../types";
import ProductGrid from "../components/product/ProductGrid";
import ShopSidebar from "../components/product/ShopSidebar";
import { ChevronRight } from "lucide-react";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState<Category | null>(null);
  const { products, totalCount, isLoading, fetchProducts } = useProductStore();

  useEffect(() => {
    if (!slug) return;
    categoryService.getCategoryBySlug(slug).then(setCategory).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const params: Record<string, any> = { category_slug: slug, sort: searchParams.get("sort") || "latest" };
    if (searchParams.get("sub")) params.subcategory_slug = searchParams.get("sub");
    if (searchParams.get("on_sale") === "true") params.on_sale = true;
    fetchProducts(params, 1);
  }, [slug, searchParams.toString()]);

  const activeSub = searchParams.get("sub");

  return (
    <div>
      {/* Category banner */}
      {category?.banner_url && (
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img src={category.banner_url} alt={category.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center">
            <div className="container-custom">
              <h1 className="text-4xl font-bold font-lexend text-white">{category.name}</h1>
            </div>
          </div>
        </div>
      )}

      <div className="container-custom py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm font-manrope text-gray-500 mb-6">
          <Link to="/" className="hover:text-maroon-700">Home</Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">{category?.name ?? slug}</span>
        </nav>

        {/* Subcategory pills */}
        {category?.subcategories && category.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
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

        <div className="flex gap-8">
          <aside className="hidden lg:block w-60 flex-shrink-0">
            <ShopSidebar />
          </aside>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 font-manrope mb-4">
              {isLoading ? "Loading…" : `${totalCount} products`}
            </p>
            <ProductGrid products={products} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
