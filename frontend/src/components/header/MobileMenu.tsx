import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import Drawer from "../ui/Drawer";
import Logo from "./Logo";
import { NAV_CATEGORIES, NAV_EXTRAS } from "../../data/navData";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const toggleCat = (slug: string) =>
    setExpandedCat((v) => (v === slug ? null : slug));

  return (
    <Drawer isOpen={isOpen} onClose={onClose} side="left" width="w-72">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <Logo className="text-xl" />
      </div>

      <nav className="py-2 overflow-y-auto flex-1">
        {/* ── Category accordion ── */}
        {NAV_CATEGORIES.map((cat) => (
          <div key={cat.slug}>
            {/* Category toggle button */}
            <button
              onClick={() => toggleCat(cat.slug)}
              className="w-full flex items-center justify-between px-5 py-3 text-[13px] font-lexend font-semibold uppercase tracking-wide text-gray-800 hover:text-maroon-700 hover:bg-gray-50 transition-colors"
            >
              {cat.label}
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  expandedCat === cat.slug ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Expanded: groups + items */}
            {expandedCat === cat.slug && (
              <div className="bg-gray-50 pb-3">
                {/* Shop all link */}
                <Link
                  to={cat.href}
                  onClick={onClose}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold font-lexend text-maroon-700 hover:text-maroon-800 transition-colors"
                >
                  Shop All {cat.label} →
                </Link>

                {cat.groups.map((group) => (
                  <div key={group.title} className="px-5 pt-3">
                    {/* Group heading */}
                    <p className="text-[10px] font-bold font-lexend uppercase tracking-widest text-gray-400 mb-1.5">
                      {group.title}
                    </p>
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={onClose}
                        className="flex items-center gap-2 py-1.5 text-sm font-manrope text-gray-600 hover:text-maroon-700 transition-colors"
                      >
                        <ChevronRight size={13} className="text-gray-300" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* ── Extra standalone links ── */}
        <div className="border-t border-gray-100 mt-2 pt-2">
          {NAV_EXTRAS.map((extra) => (
            <Link
              key={extra.href}
              to={extra.href}
              onClick={onClose}
              className={`block px-5 py-3 text-[13px] font-lexend font-semibold uppercase tracking-wide transition-colors ${
                extra.isAccent
                  ? "text-maroon-700 hover:text-maroon-800"
                  : "text-gray-800 hover:text-maroon-700"
              }`}
            >
              {extra.label}
            </Link>
          ))}
        </div>

        {/* ── Utility links ── */}
        <div className="border-t border-gray-100 mt-2 pt-2 px-5 flex flex-col gap-1">
          <Link
            to="/shop"
            onClick={onClose}
            className="text-sm font-manrope text-gray-600 hover:text-maroon-700 py-2 transition-colors"
          >
            All Products
          </Link>
          <Link
            to="/wishlist"
            onClick={onClose}
            className="text-sm font-manrope text-gray-600 hover:text-maroon-700 py-2 transition-colors"
          >
            Wishlist
          </Link>
          <Link
            to="/account"
            onClick={onClose}
            className="text-sm font-manrope text-gray-600 hover:text-maroon-700 py-2 transition-colors"
          >
            My Account
          </Link>
        </div>
      </nav>
    </Drawer>
  );
}
