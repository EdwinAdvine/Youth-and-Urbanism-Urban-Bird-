import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useWishlistStore } from "../store/wishlistStore";
import { useCartStore } from "../store/cartStore";
import type { Product } from "../types";
import api from "../services/api";
import { formatKSh } from "../utils/formatPrice";
import Button from "../components/ui/Button";
import { ProductCardSkeleton } from "../components/ui/Skeleton";
import toast from "react-hot-toast";

export default function WishlistPage() {
  const { productIds, removeItem } = useWishlistStore();
  const { addItem } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!productIds.length) {
      setProducts([]);
      return;
    }
    setIsLoading(true);
    api
      .get<Product[]>("/api/v1/wishlist")
      .then((res) => setProducts(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [productIds.length]);

  const handleRemove = async (productId: string) => {
    await removeItem(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleMoveToCart = async (product: Product) => {
    const firstVariant = product.variants?.[0];
    if (!firstVariant) {
      toast.error("No variant available for this product");
      return;
    }
    try {
      await addItem(firstVariant.id, 1);
      await handleRemove(product.id);
      toast.success("Moved to cart");
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  if (productIds.length === 0) {
    return (
      <div className="container-custom py-20 text-center">
        <Heart size={64} className="mx-auto text-gray-200 mb-4" />
        <h1 className="text-2xl font-bold font-lexend text-gray-900 mb-3">
          Your wishlist is empty
        </h1>
        <p className="text-gray-500 font-manrope mb-8">
          Save items you love and come back to them later.
        </p>
        <Link to="/shop">
          <Button size="lg">Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <h1 className="text-3xl font-bold font-lexend text-gray-900 mb-8">
        Wishlist ({productIds.length})
      </h1>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {productIds.map((id) => (
            <ProductCardSkeleton key={id} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => {
            const image =
              product.primary_image?.url ??
              product.images?.[0]?.url ??
              "/placeholder-product.jpg";
            const isOutOfStock = product.total_stock === 0;

            return (
              <div
                key={product.id}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <Link to={`/products/${product.slug}`} className="block relative">
                  <div className="aspect-[4/5] overflow-hidden bg-gray-50">
                    <img
                      src={image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded">
                          Out of stock
                        </span>
                      </div>
                    )}
                    {product.is_on_sale && product.sale_percentage && (
                      <span className="absolute top-2 left-2 bg-maroon-700 text-white text-xs font-semibold px-2 py-0.5 rounded">
                        -{product.sale_percentage}%
                      </span>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="p-3">
                  <Link to={`/products/${product.slug}`}>
                    <p className="text-sm font-medium font-manrope text-gray-800 line-clamp-2 hover:text-maroon-700 transition-colors">
                      {product.name}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-gray-900 font-lexend text-sm">
                      {formatKSh(product.price)}
                    </span>
                    {product.compare_at_price && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatKSh(product.compare_at_price)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-3 pb-3 flex gap-2">
                  <button
                    onClick={() => handleMoveToCart(product)}
                    disabled={isOutOfStock}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-maroon-700 text-white py-2 rounded-lg hover:bg-maroon-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ShoppingBag size={13} />
                    Move to Cart
                  </button>
                  <button
                    onClick={() => handleRemove(product.id)}
                    className="p-2 text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg hover:border-red-200 transition-colors"
                    title="Remove from wishlist"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
