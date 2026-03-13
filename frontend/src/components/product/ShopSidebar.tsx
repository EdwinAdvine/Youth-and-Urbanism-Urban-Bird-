import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { categoryService } from "../../services/categoryService";
import type { Category } from "../../types";
import { SIZE_OPTIONS } from "../../utils/constants";
import Button from "../ui/Button";

const COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Navy Blue", hex: "#1E3A5F" },
  { name: "Maroon", hex: "#782121" },
  { name: "Grey", hex: "#9CA3AF" },
  { name: "Olive", hex: "#6B7C42" },
];

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 pb-4 mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 font-lexend mb-3"
      >
        {title}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && children}
    </div>
  );
}

interface ShopSidebarProps {
  onClose?: () => void;
}

export default function ShopSidebar({ onClose }: ShopSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceMin, setPriceMin] = useState(searchParams.get("price_min") || "");
  const [priceMax, setPriceMax] = useState(searchParams.get("price_max") || "");

  useEffect(() => {
    categoryService.listCategories().then(setCategories).catch(() => {});
  }, []);

  const update = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      if (value === null || value === "") prev.delete(key);
      else prev.set(key, value);
      prev.delete("page");
      return prev;
    });
    onClose?.();
  };

  const toggleMulti = (key: string, value: string) => {
    const current = searchParams.get(key)?.split(",").filter(Boolean) || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update(key, next.length ? next.join(",") : null);
  };

  const applyPrice = () => {
    setSearchParams((prev) => {
      if (priceMin) prev.set("price_min", priceMin); else prev.delete("price_min");
      if (priceMax) prev.set("price_max", priceMax); else prev.delete("price_max");
      prev.delete("page");
      return prev;
    });
    onClose?.();
  };

  const clearAll = () => {
    setSearchParams({});
    setPriceMin("");
    setPriceMax("");
    onClose?.();
  };

  const activeSizes = searchParams.get("sizes")?.split(",").filter(Boolean) || [];
  const activeColors = searchParams.get("colors")?.split(",").filter(Boolean) || [];

  return (
    <div className="p-4 text-sm">
      {/* Clear all */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500 font-manrope">Filters</span>
        <button onClick={clearAll} className="text-xs text-maroon-700 font-manrope hover:underline">
          Clear all
        </button>
      </div>

      {/* Categories */}
      <Section title="Category">
        {(Array.isArray(categories) ? categories : []).map((cat) => (
          <div key={cat.id} className="mb-2">
            <button
              onClick={() => update("category", cat.slug)}
              className={`text-sm font-manrope font-semibold w-full text-left py-1 transition-colors ${
                searchParams.get("category") === cat.slug
                  ? "text-maroon-700"
                  : "text-gray-800 hover:text-maroon-700"
              }`}
            >
              {cat.name}
            </button>
            {cat.subcategories?.map((sub) => (
              <button
                key={sub.id}
                onClick={() => update("sub", sub.slug)}
                className={`block text-sm font-manrope pl-4 py-1 w-full text-left transition-colors ${
                  searchParams.get("sub") === sub.slug
                    ? "text-maroon-700 font-medium"
                    : "text-gray-600 hover:text-maroon-700"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        ))}
      </Section>

      {/* Availability */}
      <Section title="Availability">
        <label className="flex items-center gap-2 cursor-pointer font-manrope text-sm text-gray-700">
          <input
            type="checkbox"
            checked={searchParams.get("in_stock") === "true"}
            onChange={(e) => update("in_stock", e.target.checked ? "true" : null)}
            className="rounded border-gray-300 text-maroon-700 focus:ring-maroon-700"
          />
          In Stock Only
        </label>
        <label className="flex items-center gap-2 cursor-pointer font-manrope text-sm text-gray-700 mt-2">
          <input
            type="checkbox"
            checked={searchParams.get("on_sale") === "true"}
            onChange={(e) => update("on_sale", e.target.checked ? "true" : null)}
            className="rounded border-gray-300 text-maroon-700 focus:ring-maroon-700"
          />
          On Sale
        </label>
      </Section>

      {/* Price Range */}
      <Section title="Price (KSh)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm font-manrope focus:outline-none focus:ring-1 focus:ring-maroon-700"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm font-manrope focus:outline-none focus:ring-1 focus:ring-maroon-700"
          />
        </div>
        <Button onClick={applyPrice} size="sm" variant="outline" className="mt-2 w-full">
          Apply
        </Button>
      </Section>

      {/* Sizes */}
      <Section title="Size">
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              onClick={() => toggleMulti("sizes", size)}
              className={`px-3 py-1.5 text-xs font-manrope rounded-md border transition-colors ${
                activeSizes.includes(size)
                  ? "bg-maroon-700 text-white border-maroon-700"
                  : "border-gray-200 text-gray-700 hover:border-maroon-700"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </Section>

      {/* Colors */}
      <Section title="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map(({ name, hex }) => (
            <button
              key={name}
              onClick={() => toggleMulti("colors", name)}
              title={name}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                activeColors.includes(name)
                  ? "border-maroon-700 ring-2 ring-maroon-700 ring-offset-1"
                  : "border-white ring-1 ring-gray-200 hover:ring-gray-400"
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
