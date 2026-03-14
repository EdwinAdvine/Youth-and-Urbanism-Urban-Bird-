import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Eye, ArrowRightLeft } from "lucide-react";
import type { Product } from "../../types";
import { formatKSh } from "../../utils/formatPrice";
import { useWishlistStore } from "../../store/wishlistStore";
import { useCartStore } from "../../store/cartStore";
import { useUIStore } from "../../store/uiStore";
import { useCompareStore } from "../../store/compareStore";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { isInWishlist, toggleItem: toggleWishlist } = useWishlistStore();
  const { addItem, isLoading: cartLoading } = useCartStore();
  const { openQuickView } = useUIStore();
  const { toggleProduct, isInCompare } = useCompareStore();

  const inWishlist = isInWishlist(product.id);
  const inCompare = isInCompare(product.id);
  const images = product.images ?? [];
  const primaryImage =
    images.find((i) => i.is_primary)?.thumbnail_url ??
    images[0]?.thumbnail_url ??
    product.primary_image?.thumbnail_url ??
    product.primary_image?.url;
  const hoverImage = images[1]?.thumbnail_url;

  const defaultVariant = product.variants?.find((v) => v.stock_quantity > 0) ?? product.variants?.[0];

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!defaultVariant) return;
    try {
      await addItem(defaultVariant.id);
      toast.success(`${product.name} added to cart`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add to cart");
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
    toast.success(inWishlist ? "Removed from wishlist" : "Added to wishlist");
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickView(product);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleProduct(product);
  };

  return (
    <div
      className="group relative flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/products/${product.slug}`} className="block">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gray-100">
          {primaryImage ? (
            <img
              src={isHovered && hoverImage ? hoverImage : primaryImage}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <ShoppingBag size={32} className="text-gray-400" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.is_on_sale && product.sale_percentage && (
              <span className="bg-maroon-700 text-white text-xs font-bold px-2 py-0.5 rounded font-manrope">
                -{product.sale_percentage}%
              </span>
            )}
            {product.is_new_arrival && !product.is_on_sale && (
              <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded font-manrope">
                New
              </span>
            )}
            {product.total_stock === 0 && (
              <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded font-manrope">
                Sold Out
              </span>
            )}
          </div>

          {/* Action buttons — always visible on mobile, hover-reveal on desktop */}
          <div
            className={cn(
              "absolute top-2 right-2 flex flex-col gap-2 transition-all duration-200",
              "opacity-100 translate-x-0 md:opacity-0 md:translate-x-4",
              isHovered && "md:opacity-100 md:translate-x-0"
            )}
          >
            <button
              onClick={handleWishlist}
              className={cn(
                "w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center transition-colors",
                inWishlist ? "text-maroon-700" : "text-gray-600 hover:text-maroon-700"
              )}
              title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart size={15} fill={inWishlist ? "currentColor" : "none"} />
            </button>
            <button
              onClick={handleQuickView}
              className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-600 hover:text-maroon-700 transition-colors"
              title="Quick view"
            >
              <Eye size={15} />
            </button>
            <button
              onClick={handleCompare}
              className={cn(
                "w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center transition-colors",
                inCompare ? "text-maroon-700" : "text-gray-600 hover:text-maroon-700"
              )}
              title={inCompare ? "Remove from compare" : "Add to compare"}
            >
              <ArrowRightLeft size={15} />
            </button>
          </div>

          {/* Add to cart button — always visible on mobile */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 transition-all duration-200",
              "opacity-100 translate-y-0 md:opacity-0 md:translate-y-4",
              isHovered && "md:opacity-100 md:translate-y-0"
            )}
          >
            <button
              onClick={handleAddToCart}
              disabled={cartLoading || product.total_stock === 0}
              className="w-full bg-gray-900/90 backdrop-blur-sm text-white text-sm font-manrope font-medium py-2.5 hover:bg-maroon-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {product.total_stock === 0 ? "Sold Out" : "Add to Cart"}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-3 space-y-1">
          <p className="text-xs text-gray-500 font-manrope">{product.subcategory?.name}</p>
          <h3 className="text-sm font-semibold text-gray-900 font-manrope line-clamp-1 group-hover:text-maroon-700 transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 font-manrope">
              {formatKSh(product.price)}
            </span>
            {product.compare_at_price && (
              <span className="text-xs text-gray-400 line-through font-manrope">
                {formatKSh(product.compare_at_price)}
              </span>
            )}
          </div>

          {/* Color swatches */}
          {product.variants && product.variants.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1">
              {[...new Map(product.variants.map((v) => [v.color_hex, v])).values()]
                .slice(0, 4)
                .map((v) => (
                  <span
                    key={v.color_hex}
                    className="w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 border-white ring-1 ring-gray-200"
                    style={{ backgroundColor: v.color_hex }}
                    title={v.color_name}
                  />
                ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
