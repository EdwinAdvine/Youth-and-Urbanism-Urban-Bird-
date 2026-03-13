import type { Product } from "../../types";
import ProductCard from "./ProductCard";
import { ProductGridSkeleton } from "../ui/Skeleton";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4;
  emptyMessage?: string;
}

const colClasses = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
};

export default function ProductGrid({
  products,
  isLoading = false,
  columns = 4,
  emptyMessage = "No products found.",
}: ProductGridProps) {
  if (isLoading) {
    return <ProductGridSkeleton count={columns * 2} />;
  }

  if (!products.length) {
    return (
      <div className="py-20 text-center text-gray-500 font-manrope">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`grid ${colClasses[columns]} gap-4 md:gap-6`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
