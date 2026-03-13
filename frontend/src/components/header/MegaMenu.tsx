import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { NAV_CATEGORIES, NAV_EXTRAS } from "../../data/navData";

export default function MegaMenu() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const open = (slug: string) => {
    clearTimeout(timeoutRef.current);
    setActiveSlug(slug);
  };

  const close = () => {
    timeoutRef.current = setTimeout(() => setActiveSlug(null), 150);
  };

  const keepOpen = () => clearTimeout(timeoutRef.current);

  const activeCategory = NAV_CATEGORIES.find((c) => c.slug === activeSlug) ?? null;

  return (
    <>
      <nav className="hidden lg:flex items-center">
        {/* ── Main category tabs ── */}
        {NAV_CATEGORIES.map((cat) => (
          <div key={cat.slug} className="relative">
            <Link
              to={cat.href}
              onMouseEnter={() => open(cat.slug)}
              onMouseLeave={close}
              className={`flex items-center gap-1 px-4 py-2 text-[13px] font-lexend font-semibold uppercase tracking-wide transition-colors duration-150 whitespace-nowrap ${
                activeSlug === cat.slug
                  ? "text-maroon-700"
                  : "text-gray-800 hover:text-maroon-700"
              }`}
            >
              {cat.label}
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${
                  activeSlug === cat.slug ? "rotate-180" : ""
                }`}
              />
            </Link>
          </div>
        ))}

        {/* ── Standalone extra links ── */}
        {NAV_EXTRAS.map((extra) => (
          <Link
            key={extra.href}
            to={extra.href}
            className={`px-4 py-2 text-[13px] font-lexend font-semibold uppercase tracking-wide transition-colors duration-150 whitespace-nowrap ${
              extra.isAccent
                ? "text-maroon-700 hover:text-maroon-800"
                : "text-gray-800 hover:text-maroon-700"
            }`}
          >
            {extra.label}
          </Link>
        ))}
      </nav>

      {/* ── Mega dropdown panel (full-width, fixed below header) ── */}
      {activeCategory && (
        <div
          className="fixed left-0 right-0 bg-white border-t-2 border-maroon-700 shadow-2xl z-40"
          style={{ top: "88px" }}
          onMouseEnter={keepOpen}
          onMouseLeave={close}
        >
          <div className="container-custom py-8">
            <div
              className={`grid gap-8`}
              style={{ gridTemplateColumns: `260px repeat(${activeCategory.groups.length}, 1fr)` }}
            >
              {/* ── Banner image ── */}
              <div>
                <Link
                  to={activeCategory.href}
                  onClick={() => setActiveSlug(null)}
                  className="block overflow-hidden rounded-xl group"
                >
                  <img
                    src={activeCategory.bannerUrl}
                    alt={activeCategory.label}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <p className="mt-3 text-sm font-semibold font-lexend text-gray-900 group-hover:text-maroon-700 transition-colors">
                    Shop All {activeCategory.label} →
                  </p>
                </Link>
              </div>

              {/* ── Subcategory groups ── */}
              {activeCategory.groups.map((group) => (
                <div key={group.title}>
                  <p className="text-[11px] font-bold font-lexend uppercase tracking-widest text-gray-400 mb-3 pb-2 border-b border-gray-100">
                    {group.title}
                  </p>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          onClick={() => setActiveSlug(null)}
                          className="block text-sm font-manrope text-gray-700 hover:text-maroon-700 py-0.5 transition-colors duration-150"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
