import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useProductStore } from "../store/productStore";
import ProductGrid from "../components/product/ProductGrid";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { products, totalCount, isLoading, fetchProducts } = useProductStore();

  useEffect(() => {
    if (query) fetchProducts({ search: query, sort: "relevance" as any }, 1);
  }, [query]);

  return (
    <div className="container-custom py-8">
      <h1 className="text-2xl font-bold font-lexend text-gray-900 mb-2">
        {query ? `Search results for "${query}"` : "Search"}
      </h1>
      {!isLoading && (
        <p className="text-sm text-gray-500 font-manrope mb-6">
          {totalCount} {totalCount === 1 ? "product" : "products"} found
        </p>
      )}
      <ProductGrid
        products={products}
        isLoading={isLoading}
        emptyMessage={query ? `No products found for "${query}"` : "Enter a search term to find products."}
      />
    </div>
  );
}
