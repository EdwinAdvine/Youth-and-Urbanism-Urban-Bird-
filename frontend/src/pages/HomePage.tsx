import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useProductStore } from "../store/productStore";
import ProductGrid from "../components/product/ProductGrid";
import Button from "../components/ui/Button";
import api from "../services/api";
import toast from "react-hot-toast";
import { useSEO } from "../hooks/useSEO";

// ─── Hero slides (images from urbanbird.co.ke) ───────────────────────────────
const HERO_SLIDES = [
  {
    image: "https://urbanbird.co.ke/wp-content/uploads/2026/01/Hero-slide-1.webp",
    title: "Shop Men",
    subtitle: "Redefining Urban Elegance",
    cta: "Shop Men's",
    link: "/category/men",
  },
  {
    image: "https://urbanbird.co.ke/wp-content/uploads/2026/01/Hero-slide-3.webp",
    title: "Shop Women",
    subtitle: "Redefining Urban Elegance",
    cta: "Shop Women's",
    link: "/category/women",
  },
  {
    image: "https://urbanbird.co.ke/wp-content/uploads/2026/01/Hero-slide-2.webp",
    title: "TRENDY URBAN",
    subtitle: "Premium Streetwear",
    cta: "Shop Now",
    link: "/shop",
  },
  {
    image: "https://urbanbird.co.ke/wp-content/uploads/2026/01/Hero-slide-4.jpg",
    title: "MADE TO COMMAND",
    subtitle: "New Collection 2025",
    cta: "Explore",
    link: "/shop",
  },
];

// ─── Category data ────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    slug: "men",
    label: "Men",
    image: "https://urbanbird.co.ke/wp-content/uploads/2025/11/Side-Mocha-Dapper-Jacket-ws.webp",
    fallback: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=600",
  },
  {
    slug: "women",
    label: "Women",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600",
    fallback: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600",
  },
  {
    slug: "kids",
    label: "Kids",
    image: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600",
    fallback: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600",
  },
];

// ─── Hero Carousel ────────────────────────────────────────────────────────────
function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slideKey, setSlideKey] = useState(0);
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearTimeout(autoplayRef.current);
    autoplayRef.current = setTimeout(() => emblaApi?.scrollNext(), 5000);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setSlideKey((k) => k + 1);
      startAutoplay();
    };
    emblaApi.on("select", onSelect);
    startAutoplay();
    return () => {
      emblaApi.off("select", onSelect);
      if (autoplayRef.current) clearTimeout(autoplayRef.current);
    };
  }, [emblaApi, startAutoplay]);

  const slide = HERO_SLIDES[selectedIndex];

  return (
    <section className="relative overflow-hidden" style={{ height: "92vh", minHeight: 500 }}>
      {/* Embla viewport */}
      <div className="h-full" ref={emblaRef}>
        <div className="flex h-full">
          {HERO_SLIDES.map((s, i) => (
            <div key={i} className="relative flex-none w-full h-full">
              <img
                src={s.image}
                alt={s.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Animated text overlay (key changes on each slide to re-trigger animation) */}
      <div className="absolute inset-0 pointer-events-none flex items-center">
        <div className="container-custom w-full">
          <div key={slideKey} className="max-w-lg pointer-events-auto">
            <p
              className="animate-hero-text text-white/80 font-manrope text-sm uppercase tracking-[0.2em] mb-3"
              style={{ animationDelay: "0ms" }}
            >
              {slide.subtitle}
            </p>
            <h1
              className="animate-hero-text font-lexend font-bold text-white leading-none mb-6"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 5rem)",
                animationDelay: "120ms",
              }}
            >
              {slide.title}
            </h1>
            <div className="animate-hero-text" style={{ animationDelay: "240ms" }}>
              <Link to={slide.link}>
                <Button size="lg" className="shadow-xl">
                  {slide.cta}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full p-2.5 transition-all duration-200"
        aria-label="Previous slide"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full p-2.5 transition-all duration-200"
        aria-label="Next slide"
      >
        <ChevronRight size={22} />
      </button>

      {/* Dot navigation */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === selectedIndex
                ? "w-8 h-2 bg-white"
                : "w-2 h-2 bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { featuredProducts, newArrivals, fetchFeatured, fetchNewArrivals } = useProductStore();
  const [saleProducts, setSaleProducts] = useState<any[]>([]);
  const [newsEmail, setNewsEmail] = useState("");
  const [newsLoading, setNewsLoading] = useState(false);

  useSEO({
    title: "Premium Urban Streetwear Kenya",
    description: "Kenya's premier urban streetwear brand. Hoodies, sweatpants, jackets & accessories. Free delivery on orders above KSh 5,000.",
    url: "https://urbanbird.co.ke/",
  });

  useEffect(() => {
    fetchFeatured();
    fetchNewArrivals();
    api.get("/api/v1/products/on-sale?limit=4").then((r) => setSaleProducts(r.data)).catch(() => {});
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsEmail) return;
    setNewsLoading(true);
    try {
      const res = await api.post("/api/v1/newsletter/subscribe", { email: newsEmail, source: "footer" });
      toast.success(res.data.message || "Subscribed! Check your inbox.");
      setNewsEmail("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Something went wrong.");
    } finally {
      setNewsLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Category Showcase */}
      <section className="container-custom py-16">
        <h2 className="text-3xl font-bold font-lexend text-gray-900 mb-2 text-center">
          Shop by Category
        </h2>
        <p className="text-gray-500 font-manrope text-center mb-10">
          Discover our curated collections for every style
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CATEGORIES.map(({ slug, label, image, fallback }) => (
            <Link
              key={slug}
              to={`/category/${slug}`}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-md"
            >
              <img
                src={image}
                alt={label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = fallback;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-2xl font-bold font-lexend text-white">{label}</h3>
                <span className="text-sm text-white/80 font-manrope group-hover:text-white transition-colors flex items-center gap-1 mt-1">
                  Shop Now <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Now */}
      <section className="bg-gray-50 py-16">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold font-lexend text-gray-900">Trending Now</h2>
              <p className="text-gray-500 font-manrope text-sm mt-1">Our most loved pieces this season</p>
            </div>
            <Link
              to="/shop?sort=popular"
              className="text-sm text-maroon-700 font-manrope font-medium hover:text-maroon-800 items-center gap-1 hidden sm:flex"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {featuredProducts.length > 0 ? (
            <ProductGrid products={featuredProducts.slice(0, 8)} />
          ) : (
            <p className="text-center text-gray-400 font-manrope py-16">
              Products coming soon — check back shortly.
            </p>
          )}
        </div>
      </section>

      {/* One-Time Only Deals Banner */}
      <section className="bg-maroon-700 py-10">
        <div className="container-custom flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-white text-center sm:text-left">
            <p className="text-sm font-manrope uppercase tracking-widest text-maroon-200 mb-1">
              Limited Time
            </p>
            <h2 className="text-3xl font-bold font-lexend leading-tight">
              One-Time Only Deals
            </h2>
            <p className="text-maroon-100 font-manrope mt-2 text-sm">
              Exclusive discounts on selected styles. While stocks last.
            </p>
          </div>
          <Link to="/shop?filter=on_sale" className="flex-shrink-0">
            <Button
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white hover:text-maroon-700 transition-colors font-semibold"
            >
              Shop Deals <ArrowRight size={16} className="ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="container-custom py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold font-lexend text-gray-900">New Arrivals</h2>
              <p className="text-gray-500 font-manrope text-sm mt-1">Fresh drops every week</p>
            </div>
            <Link
              to="/shop?sort=latest"
              className="text-sm text-maroon-700 font-manrope font-medium hover:text-maroon-800 items-center gap-1 hidden sm:flex"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <ProductGrid products={newArrivals.slice(0, 4)} columns={4} />
        </section>
      )}

      {/* On Sale Collection */}
      {saleProducts.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="container-custom">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-xs font-bold text-maroon-700 uppercase tracking-widest font-manrope">Limited Time</span>
                <h2 className="text-3xl font-bold font-lexend text-gray-900 mt-1">On Sale Now</h2>
                <p className="text-gray-500 font-manrope text-sm mt-1">Grab these deals before they're gone</p>
              </div>
              <Link
                to="/shop?on_sale=true"
                className="text-sm text-maroon-700 font-manrope font-medium hover:text-maroon-800 items-center gap-1 hidden sm:flex"
              >
                View All Deals <ArrowRight size={14} />
              </Link>
            </div>
            <ProductGrid products={saleProducts} columns={4} />
          </div>
        </section>
      )}

      {/* Newsletter with real background */}
      <section
        className="relative py-20 overflow-hidden"
        style={{
          backgroundImage:
            "url('https://urbanbird.co.ke/wp-content/uploads/2024/07/bg-newletter.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative container-custom text-center max-w-xl mx-auto">
          <p className="text-maroon-300 font-manrope text-sm uppercase tracking-widest mb-3">
            Stay Connected
          </p>
          <h2 className="text-3xl font-bold font-lexend text-white mb-3">Stay in the Loop</h2>
          <p className="text-gray-300 font-manrope mb-8">
            Get exclusive deals, new arrivals, and style inspiration delivered to your inbox.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={newsEmail}
              onChange={(e) => setNewsEmail(e.target.value)}
              className="flex-1 rounded-lg px-4 py-3 text-sm font-manrope text-gray-900 outline-none focus:ring-2 focus:ring-maroon-400"
            />
            <Button type="submit" disabled={newsLoading} className="flex-shrink-0 px-5 flex items-center gap-1.5">
              {newsLoading && <Loader2 size={14} className="animate-spin" />}
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
