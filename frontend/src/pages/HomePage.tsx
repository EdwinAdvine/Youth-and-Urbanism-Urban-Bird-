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

// ─── Hero slides ──────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  {
    image: "/slides/027.jpg",
    title: "Shop Men",
    subtitle: "Redefining Urban Elegance",
    cta: "Shop Men's",
    link: "/category/men",
  },
  {
    image: "/slides/043.jpg",
    title: "Shop Women",
    subtitle: "Redefining Urban Elegance",
    cta: "Shop Women's",
    link: "/category/women",
  },
  {
    image: "/slides/096.jpg",
    title: "TRENDY URBAN",
    subtitle: "Premium Streetwear",
    cta: "Shop Now",
    link: "/shop",
  },
  {
    image: "/slides/sat26.jpg",
    title: "MADE TO COMMAND",
    subtitle: "New Collection 2025",
    cta: "Explore",
    link: "/shop",
  },
];

// ─── Category data ────────────────────────────────────────────────────────────
const ALL_SLIDES = [
  "/slides/027.jpg", "/slides/033.jpg", "/slides/043.jpg",
  "/slides/046.jpg", "/slides/056.jpg", "/slides/060.jpg",
  "/slides/096.jpg", "/slides/sat26.jpg", "/slides/018 copy.jpg",
];

const CATEGORIES = [
  { slug: "men",   label: "Men",   startIndex: 0 },
  { slug: "women", label: "Women", startIndex: 3 },
  { slug: "kids",  label: "Kids",  startIndex: 6 },
];

function CategoryCard({ slug, label, startIndex }: { slug: string; label: string; startIndex: number }) {
  const categorySlides = ALL_SLIDES.slice(startIndex, startIndex + 3);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % categorySlides.length);
    }, 6000);
    return () => clearInterval(id);
  }, [categorySlides.length]);

  // Only render current and next slide for performance
  const nextIndex = (current + 1) % categorySlides.length;

  return (
    <Link
      to={`/category/${slug}`}
      className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-md"
    >
      <img
        src={categorySlides[nextIndex]}
        alt={label}
        className="absolute inset-0 w-full h-full object-cover opacity-0"
        loading="lazy"
        decoding="async"
      />
      <img
        key={categorySlides[current]}
        src={categorySlides[current]}
        alt={label}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ animation: "fadeIn 2s ease-in-out" }}
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6">
        <h3 className="text-base sm:text-2xl font-bold font-lexend text-white">{label}</h3>
        <span className="text-xs sm:text-sm text-white/80 font-manrope group-hover:text-white transition-colors flex items-center gap-1 mt-0.5 sm:mt-1">
          Shop Now <ArrowRight size={12} className="sm:w-3.5 sm:h-3.5" />
        </span>
      </div>
    </Link>
  );
}

// ─── Hero Carousel ────────────────────────────────────────────────────────────
function HeroCarousel() {
  const [slides, setSlides] = useState(HERO_SLIDES);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start", slidesToScroll: 1 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Fetch banners from API; fall back to hardcoded HERO_SLIDES if none exist
  useEffect(() => {
    api
      .get("/api/v1/admin/banners/public")
      .then((r) => {
        const banners = r.data;
        if (Array.isArray(banners) && banners.length > 0) {
          setSlides(
            banners.map((b: any) => ({
              image: b.image_url,
              title: b.title,
              subtitle: b.subtitle ?? "",
              cta: b.cta_text ?? "Shop Now",
              link: b.cta_link ?? "/shop",
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setSlidesLoading(false));
  }, []);

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
      startAutoplay();
    };
    emblaApi.on("select", onSelect);
    startAutoplay();
    return () => {
      emblaApi.off("select", onSelect);
      if (autoplayRef.current) clearTimeout(autoplayRef.current);
    };
  }, [emblaApi, startAutoplay]);

  // Skeleton while fetching
  if (slidesLoading) {
    return (
      <section className="relative overflow-hidden bg-black" style={{ height: "clamp(400px, 80vh, 92vh)", minHeight: 400 }}>
        <div className="w-full h-full animate-pulse bg-gray-800" />
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-black" style={{ height: "clamp(400px, 80vh, 92vh)", minHeight: 400 }}>
      {/* Embla viewport */}
      <div className="h-full" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((s, i) => (
            <div key={i} className="relative flex-none w-full sm:w-1/2 lg:w-1/3 h-full overflow-hidden">
              <img
                src={s.image}
                alt={s.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
                decoding={i === 0 ? "sync" : "async"}
                fetchPriority={i === 0 ? "high" : "low"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-5 sm:bottom-8 left-4 sm:left-5 right-4 sm:right-5">
                <p className="text-white/70 font-manrope text-[10px] sm:text-xs uppercase tracking-widest mb-1">
                  {s.subtitle}
                </p>
                <h2 className="font-lexend font-bold text-white leading-tight mb-3 text-lg sm:text-2xl lg:text-[1.75rem]">
                  {s.title}
                </h2>
                <Link to={s.link}>
                  <Button size="sm" className="shadow-lg text-xs sm:text-sm">{s.cta}</Button>
                </Link>
              </div>
            </div>
          ))}
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
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
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
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://urbanbird.co.ke/#organization",
          name: "Urban Bird",
          url: "https://urbanbird.co.ke",
          logo: "https://urbanbird.co.ke/og-image.jpg",
          sameAs: [
            "https://instagram.com/urbanbird_ke",
            "https://facebook.com/urbanbird",
            "https://tiktok.com/@urbanbird_ke",
            "https://twitter.com/urbanbird_ke",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+254799075061",
            contactType: "customer service",
            areaServed: "KE",
            availableLanguage: "English",
          },
        },
        {
          "@type": "WebSite",
          "@id": "https://urbanbird.co.ke/#website",
          url: "https://urbanbird.co.ke",
          name: "Urban Bird",
          description: "Kenya's premier urban streetwear brand",
          publisher: { "@id": "https://urbanbird.co.ke/#organization" },
          potentialAction: {
            "@type": "SearchAction",
            target: "https://urbanbird.co.ke/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        },
      ],
    },
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
      <section className="container-custom py-10 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold font-lexend text-gray-900 mb-2 text-center">
          Shop by Category
        </h2>
        <p className="text-gray-500 font-manrope text-center mb-8 sm:mb-10 text-sm sm:text-base">
          Discover our curated collections for every style
        </p>
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          {CATEGORIES.map(({ slug, label, startIndex }) => (
            <CategoryCard key={slug} slug={slug} label={label} startIndex={startIndex} />
          ))}
        </div>
      </section>

      {/* Group Photo Banner */}
      <section className="container-custom pb-10 sm:pb-16">
        <img
          src="/066.jpg"
          alt="Urban Bird Collection"
          className="w-full object-cover rounded-2xl"
          loading="lazy"
          decoding="async"
        />
      </section>

      {/* Trending Now */}
      <section className="bg-gray-50 py-10 sm:py-16">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-lexend text-gray-900">Trending Now</h2>
              <p className="text-gray-500 font-manrope text-sm mt-1">Our most loved pieces this season</p>
            </div>
            <Link
              to="/shop?sort=popularity"
              className="text-sm text-maroon-700 font-manrope font-medium hover:text-maroon-800 flex items-center gap-1"
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
      <section className="bg-maroon-700 py-8 sm:py-10">
        <div className="container-custom flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
          <div className="text-white text-center sm:text-left">
            <p className="text-sm font-manrope uppercase tracking-widest text-maroon-200 mb-1">
              Limited Time
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold font-lexend leading-tight">
              One-Time Only Deals
            </h2>
            <p className="text-maroon-100 font-manrope mt-2 text-sm">
              Exclusive discounts on selected styles. While stocks last.
            </p>
          </div>
          <Link to="/shop?on_sale=true" className="flex-shrink-0">
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
        <section className="container-custom py-10 sm:py-16">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold font-lexend text-gray-900">New Arrivals</h2>
              <p className="text-gray-500 font-manrope text-sm mt-1">Fresh drops every week</p>
            </div>
            <Link
              to="/shop?sort=latest"
              className="text-sm text-maroon-700 font-manrope font-medium hover:text-maroon-800 flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <ProductGrid products={newArrivals.slice(0, 4)} columns={4} />
        </section>
      )}

      {/* On Sale Collection */}
      {saleProducts.length > 0 && (
        <section className="bg-gray-50 py-10 sm:py-16">
          <div className="container-custom">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <span className="text-xs font-bold text-maroon-700 uppercase tracking-widest font-manrope">Limited Time</span>
                <h2 className="text-2xl sm:text-3xl font-bold font-lexend text-gray-900 mt-1">On Sale Now</h2>
                <p className="text-gray-500 font-manrope text-sm mt-1">Grab these deals before they're gone</p>
              </div>
              <Link
                to="/shop?on_sale=true"
                className="text-sm text-maroon-700 font-manrope font-medium hover:text-maroon-800 flex items-center gap-1"
              >
                View All Deals <ArrowRight size={14} />
              </Link>
            </div>
            <ProductGrid products={saleProducts} columns={4} />
          </div>
        </section>
      )}

      {/* Newsletter with real background */}
      <section className="relative py-20 overflow-hidden">
        {/* Lazy-loaded background image */}
        <img
          src="/slides/060.jpg"
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative container-custom text-center max-w-xl mx-auto">
          <p className="text-maroon-300 font-manrope text-sm uppercase tracking-widest mb-3">
            Stay Connected
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold font-lexend text-white mb-3">Stay in the Loop</h2>
          <p className="text-gray-300 font-manrope mb-6 sm:mb-8 text-sm sm:text-base">
            Get exclusive deals, new arrivals, and style inspiration delivered to your inbox.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto w-full">
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
