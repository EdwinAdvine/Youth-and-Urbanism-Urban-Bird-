import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { NAV_CATEGORIES, NAV_EXTRAS } from "../../data/navData";
import type { NavItem } from "../../data/navData";
import { useNavCategoryStore } from "../../store/navCategoryStore";

export default function MegaMenu() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { rawCategories, isLoaded, fetchCategories } = useNavCategoryStore();

  useEffect(() => { fetchCategories(); }, []);

  // Merge the original grouped structure with live data from the DB.
  // This preserves the rich TOPS / LAYERS / BOTTOMS / ACCESSORIES groups
  // while reflecting any name changes or subcategory deactivations the admin makes.
  const categories = useMemo(() => {
    if (!isLoaded || rawCategories.length === 0) return NAV_CATEGORIES;
    return NAV_CATEGORIES.map((cat) => {
      const dyn = rawCategories.find((d) => d.slug === cat.slug);
      if (!dyn) return cat;
      const activeSlugs = new Set(
        dyn.subcategories.filter((s) => s.is_active !== false).map((s) => s.slug)
      );
      const nameMap: Record<string, string> = Object.fromEntries(
        dyn.subcategories.map((s) => [s.slug, s.name])
      );
      return {
        ...cat,
        label: dyn.name.toUpperCase(),
        groups: cat.groups
          .map((g) => ({
            ...g,
            items: g.items
              .map((item): NavItem | null => {
                const subSlug = item.href.split("?sub=")[1];
                if (subSlug && !activeSlugs.has(subSlug)) return null;
                return subSlug && nameMap[subSlug] ? { ...item, label: nameMap[subSlug] } : item;
              })
              .filter((x): x is NavItem => x !== null),
          }))
          .filter((g) => g.items.length > 0),
      };
    });
  }, [isLoaded, rawCategories]);

  const open = (slug: string) => {
    clearTimeout(timeoutRef.current);
    setActiveSlug(slug);
  };

  const close = () => {
    timeoutRef.current = setTimeout(() => setActiveSlug(null), 150);
  };

  const keepOpen = () => clearTimeout(timeoutRef.current);

  const activeCategory = categories.find((c) => c.slug === activeSlug) ?? null;

  return (
    <>
      <nav className="hidden lg:flex items-center">
        {/* ── Main category tabs ── */}
        {categories.map((cat) => (
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

      {/* ── Mega dropdown panel (full-width, absolute below sticky header) ── */}
      {activeCategory && activeCategory.groups.length > 0 && (
        <div
          className="absolute left-0 right-0 bg-white border-t-2 border-maroon-700 shadow-2xl z-40"
          style={{ top: "56px" }}
          onMouseEnter={keepOpen}
          onMouseLeave={close}
        >
          <div className="container-custom py-8">
            <div
              className="grid gap-8"
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
              {activeCategory.groups.map((group, gi) => (
                <div key={gi}>
                  {group.title && (
                    <p className="text-[11px] font-bold font-lexend uppercase tracking-widest text-gray-400 mb-3 pb-2 border-b border-gray-100">
                      {group.title}
                    </p>
                  )}
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
