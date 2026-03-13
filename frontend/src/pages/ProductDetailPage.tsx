import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingBag, Heart, ChevronRight, Star, Minus, Plus, ArrowRightLeft, ZoomIn, Ruler, Camera, Loader2, X, CheckCircle } from "lucide-react";
import { useProductStore } from "../store/productStore";
import { useCartStore } from "../store/cartStore";
import { useWishlistStore } from "../store/wishlistStore";
import { useCompareStore } from "../store/compareStore";
import { useAuthStore } from "../store/authStore";
import { formatKSh } from "../utils/formatPrice";
import Button from "../components/ui/Button";
import { ProductGridSkeleton } from "../components/ui/Skeleton";
import SizeGuideModal from "../components/ui/SizeGuideModal";
import RecentlyViewed from "../components/product/RecentlyViewed";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import toast from "react-hot-toast";
import api from "../services/api";
import { useSEO } from "../hooks/useSEO";
import type { ProductVariant } from "../types";

// ─── Star Picker ─────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            size={24}
            className={(hover || value) >= s ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Review Form ─────────────────────────────────────────────────────────────
function ReviewForm({ slug, onSuccess }: { slug: string; onSuccess: () => void }) {
  const { user } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <p className="text-gray-600 font-manrope text-sm">
          <Link to="/login" className="text-maroon-700 font-semibold hover:underline">Sign in</Link>
          {" "}to leave a review
        </p>
      </div>
    );
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (imageUrls.length + files.length > 3) {
      toast.error("You can upload a maximum of 3 photos");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          const res = await api.post<{ url: string }>("/api/v1/products/upload-review-image", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return res.data.url;
        })
      );
      setImageUrls((prev) => [...prev, ...uploaded]);
    } catch {
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return toast.error("Please select a star rating");
    setSubmitting(true);
    try {
      await api.post(`/api/v1/products/${slug}/reviews`, { rating, title, body, images: imageUrls });
      toast.success("Review submitted! Thank you.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-6 space-y-5">
      <h3 className="font-semibold font-lexend text-gray-900 text-lg">Write a Review</h3>

      {/* Rating */}
      <div>
        <label className="text-sm font-semibold text-gray-700 font-manrope mb-2 block">
          Your Rating *
        </label>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-semibold text-gray-700 font-manrope mb-1.5 block">
          Review Title
        </label>
        <input
          type="text"
          maxLength={100}
          placeholder="e.g. Great quality hoodie"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-400 bg-white"
        />
      </div>

      {/* Body */}
      <div>
        <label className="text-sm font-semibold text-gray-700 font-manrope mb-1.5 block">
          Your Review
        </label>
        <textarea
          rows={4}
          maxLength={1000}
          placeholder="Tell others what you think about this product…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-400 bg-white resize-none"
        />
      </div>

      {/* Photos */}
      <div>
        <label className="text-sm font-semibold text-gray-700 font-manrope mb-2 block">
          Add Photos <span className="text-gray-400 font-normal">(up to 3)</span>
        </label>
        <div className="flex gap-2 flex-wrap items-center">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {imageUrls.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-maroon-400 flex items-center justify-center text-gray-400 hover:text-maroon-500 transition-colors"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
        </div>
      </div>

      <Button type="submit" isLoading={submitting} disabled={submitting || rating === 0}>
        Submit Review
      </Button>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { currentProduct, isLoading, fetchProduct } = useProductStore();
  const { addItem, isLoading: cartLoading } = useCartStore();
  const { isInWishlist, toggleItem: toggleWishlist } = useWishlistStore();
  const { toggleProduct, isInCompare } = useCompareStore();
  const { trackView } = useRecentlyViewed();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "reviews">("description");
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const primaryImg = currentProduct?.images?.find((i) => i.is_primary) ?? currentProduct?.images?.[0];
  useSEO({
    title: currentProduct?.seo_title ?? currentProduct?.name,
    description: currentProduct?.seo_description ?? currentProduct?.short_description ?? undefined,
    image: primaryImg?.url,
    type: "product",
  });

  useEffect(() => {
    if (slug) fetchProduct(slug);
  }, [slug]);

  useEffect(() => {
    if (!currentProduct) return;
    const primary = currentProduct.images?.find((i) => i.is_primary) ?? currentProduct.images?.[0];
    trackView({
      id: currentProduct.id,
      name: currentProduct.name,
      slug: currentProduct.slug,
      price: currentProduct.price,
      image: primary?.thumbnail_url ?? primary?.url,
      is_on_sale: currentProduct.is_on_sale,
      sale_percentage: currentProduct.sale_percentage,
    });
    if (currentProduct.variants?.length) {
      const v = currentProduct.variants[0];
      setSelectedSize(v.size);
      setSelectedColor(v.color_name);
      setSelectedVariant(v);
    }
  }, [currentProduct]);

  const handleVariantSelect = (size: string, color: string) => {
    setSelectedSize(size);
    setSelectedColor(color);
    const v = currentProduct?.variants?.find((v) => v.size === size && v.color_name === color);
    setSelectedVariant(v || null);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return toast.error("Please select a size and color");
    if (selectedVariant.stock_quantity === 0) return toast.error("This variant is out of stock");
    try {
      await addItem(selectedVariant.id, quantity);
      toast.success(`${currentProduct?.name} added to cart`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add to cart");
    }
  };

  if (isLoading) return <div className="container-custom py-10"><ProductGridSkeleton count={1} /></div>;
  if (!currentProduct) return <div className="container-custom py-10 text-center text-gray-500">Product not found.</div>;

  const p = currentProduct;
  const images = p.images ?? [];
  const inWishlist = isInWishlist(p.id);
  const sizes = [...new Set(p.variants?.map((v) => v.size) ?? [])];
  const colors = [...new Map(p.variants?.map((v) => [v.color_name, v])).values()];

  return (
    <div className="container-custom py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm font-manrope text-gray-500 mb-8">
        <Link to="/" className="hover:text-maroon-700">Home</Link>
        <ChevronRight size={14} />
        {p.category && <Link to={`/category/${p.category.slug}`} className="hover:text-maroon-700">{p.category.name}</Link>}
        <ChevronRight size={14} />
        <span className="text-gray-900">{p.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
        {/* Images */}
        <div className="flex flex-col gap-4">
          <div
            ref={imageContainerRef}
            className="aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100 relative group"
            style={{ cursor: isZoomed ? "zoom-out" : "zoom-in" }}
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => { setIsZoomed(false); setZoomPos({ x: 50, y: 50 }); }}
            onMouseMove={(e) => {
              if (!imageContainerRef.current) return;
              const rect = imageContainerRef.current.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              setZoomPos({ x, y });
            }}
          >
            {images[activeImage] ? (
              <img
                src={images[activeImage].url}
                alt={p.name}
                className="w-full h-full object-cover transition-transform duration-200 ease-out"
                style={{
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  transform: isZoomed ? "scale(2)" : "scale(1)",
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-200" />
            )}
            {/* Zoom hint */}
            {!isZoomed && images[activeImage] && (
              <div className="absolute bottom-3 right-3 bg-black/40 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 pointer-events-none">
                <ZoomIn size={12} />
                Hover to zoom
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImage ? "border-maroon-700" : "border-transparent"
                  }`}
                >
                  <img src={img.thumbnail_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          {p.subcategory && (
            <p className="text-sm text-gray-500 font-manrope mb-1">{p.subcategory.name}</p>
          )}
          <h1 className="text-3xl font-bold font-lexend text-gray-900 mb-3">{p.name}</h1>

          {/* Rating */}
          {p.review_count > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={16}
                    className={s <= Math.round(p.average_rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500 font-manrope">
                {p.average_rating.toFixed(1)} ({p.review_count} reviews)
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-bold text-gray-900 font-lexend">{formatKSh(p.price)}</span>
            {p.compare_at_price && (
              <>
                <span className="text-lg text-gray-400 line-through font-manrope">{formatKSh(p.compare_at_price)}</span>
                {p.sale_percentage && (
                  <span className="bg-maroon-700 text-white text-xs font-bold px-2 py-1 rounded font-manrope">
                    -{p.sale_percentage}%
                  </span>
                )}
              </>
            )}
          </div>

          {/* Color selector */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-900 font-manrope mb-2">
              Color: <span className="font-normal text-gray-600">{selectedColor}</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {colors.map((v) => (
                <button
                  key={v.color_name}
                  onClick={() => handleVariantSelect(selectedSize, v.color_name)}
                  title={v.color_name}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === v.color_name
                      ? "border-maroon-700 ring-2 ring-maroon-700 ring-offset-1"
                      : "border-white ring-1 ring-gray-200 hover:ring-gray-400"
                  }`}
                  style={{ backgroundColor: v.color_hex }}
                />
              ))}
            </div>
          </div>

          {/* Size selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900 font-manrope">
                Size: <span className="font-normal text-gray-600">{selectedSize}</span>
              </p>
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="text-xs text-maroon-700 hover:text-maroon-800 font-manrope font-medium flex items-center gap-1 transition-colors"
              >
                <Ruler size={12} />
                Size Guide
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {sizes.map((size) => {
                const v = p.variants?.find((v) => v.size === size && v.color_name === selectedColor);
                const inStock = v ? v.stock_quantity > 0 : false;
                return (
                  <button
                    key={size}
                    onClick={() => handleVariantSelect(size, selectedColor)}
                    disabled={!inStock}
                    className={`px-4 py-2 text-sm font-manrope rounded-lg border transition-colors ${
                      selectedSize === size
                        ? "bg-maroon-700 text-white border-maroon-700"
                        : inStock
                        ? "border-gray-200 text-gray-700 hover:border-maroon-700"
                        : "border-gray-100 text-gray-300 cursor-not-allowed line-through"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-gray-600 hover:text-maroon-700 transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="px-4 py-2 text-sm font-manrope font-medium w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-2 text-gray-600 hover:text-maroon-700 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            {selectedVariant && (
              <span className="text-sm text-gray-500 font-manrope">
                {selectedVariant.stock_quantity} in stock
              </span>
            )}
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3 mb-6">
            <Button
              onClick={handleAddToCart}
              isLoading={cartLoading}
              disabled={!selectedVariant || selectedVariant?.stock_quantity === 0}
              fullWidth
              size="lg"
              className="flex items-center gap-2"
            >
              <ShoppingBag size={18} />
              {selectedVariant?.stock_quantity === 0 ? "Out of Stock" : "Add to Cart"}
            </Button>
            <button
              onClick={() => { toggleWishlist(p.id); toast.success(inWishlist ? "Removed from wishlist" : "Added to wishlist"); }}
              className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                inWishlist ? "border-maroon-700 text-maroon-700 bg-maroon-50" : "border-gray-200 text-gray-600 hover:border-maroon-700 hover:text-maroon-700"
              }`}
            >
              <Heart size={20} fill={inWishlist ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => toggleProduct(p)}
              className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                isInCompare(p.id) ? "border-maroon-700 text-maroon-700 bg-maroon-50" : "border-gray-200 text-gray-600 hover:border-maroon-700 hover:text-maroon-700"
              }`}
              title="Compare"
            >
              <ArrowRightLeft size={20} />
            </button>
          </div>

          {/* SKU */}
          {selectedVariant && (
            <p className="text-xs text-gray-400 font-manrope">SKU: {selectedVariant.sku}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-16">
        <div className="flex border-b border-gray-200 mb-6">
          {(["description", "reviews"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-manrope font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-maroon-700 text-maroon-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab} {tab === "reviews" && p.review_count > 0 && `(${p.review_count})`}
            </button>
          ))}
        </div>

        {activeTab === "description" && (
          <div
            className="prose max-w-none text-gray-700 font-manrope text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: p.description ?? "<p>No description available.</p>" }}
          />
        )}

        {activeTab === "reviews" && (
          <div className="space-y-8">
            {/* Existing reviews */}
            {p.reviews && p.reviews.length > 0 ? (
              <div className="space-y-4">
                {p.reviews.map((r) => (
                  <div key={r.id} className="border border-gray-100 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={14}
                                className={s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}
                              />
                            ))}
                          </div>
                          {r.is_verified_purchase && (
                            <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-manrope">
                              <CheckCircle size={11} /> Verified
                            </span>
                          )}
                        </div>
                        {r.title && (
                          <span className="text-sm font-semibold text-gray-900 font-manrope mt-1 block">{r.title}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-manrope flex-shrink-0 ml-4">{r.user_name}</span>
                    </div>
                    {r.body && <p className="text-sm text-gray-600 font-manrope">{r.body}</p>}
                    {/* Review photos */}
                    {(r as any).images?.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {((r as any).images as string[]).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt="Review photo"
                            className="w-16 h-16 object-cover rounded-lg border border-gray-100 cursor-pointer hover:opacity-90"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 font-manrope text-sm">No reviews yet. Be the first to review this product.</p>
            )}

            {/* Review form */}
            <div className="border-t border-gray-100 pt-8">
              {reviewSubmitted ? (
                <div className="bg-emerald-50 rounded-xl p-6 flex items-center gap-3 text-emerald-700">
                  <CheckCircle size={20} />
                  <p className="font-manrope text-sm font-medium">Your review has been submitted. Thank you!</p>
                </div>
              ) : (
                <ReviewForm slug={slug!} onSuccess={() => setReviewSubmitted(true)} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recently Viewed */}
      <RecentlyViewed excludeId={p.id} />

      {/* Size Guide Modal */}
      <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </div>
  );
}
