import { Link } from "react-router-dom";
import { formatKSh } from "../../utils/formatPrice";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed";
import { ShoppingBag } from "lucide-react";

interface RecentlyViewedProps {
  excludeId?: string;
}

export default function RecentlyViewed({ excludeId }: RecentlyViewedProps) {
  const { getRecent } = useRecentlyViewed();
  const items = getRecent(excludeId);

  if (items.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold font-lexend text-gray-900 mb-6">Recently Viewed</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.slug}`}
            className="group flex flex-col"
          >
            <div className="aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 mb-2 relative">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag size={24} className="text-gray-300" />
                </div>
              )}
              {product.is_on_sale && product.sale_percentage && (
                <span className="absolute top-1.5 left-1.5 bg-maroon-700 text-white text-xs font-bold px-1.5 py-0.5 rounded font-manrope">
                  -{product.sale_percentage}%
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-800 font-manrope line-clamp-1 group-hover:text-maroon-700 transition-colors">
              {product.name}
            </p>
            <p className="text-xs text-maroon-700 font-manrope font-medium">
              {formatKSh(product.price)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
