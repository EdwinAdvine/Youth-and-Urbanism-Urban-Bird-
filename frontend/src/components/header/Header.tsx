import { useState, useEffect } from "react";
import { Menu, X, Search } from "lucide-react";
import Logo from "./Logo";
import MegaMenu from "./MegaMenu";
import UserActions from "./UserActions";
import SearchBar from "./SearchBar";
import AnnouncementBar from "./AnnouncementBar";
import { useUIStore } from "../../store/uiStore";
import MobileMenu from "./MobileMenu";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { isMobileMenuOpen, openMobileMenu, closeMobileMenu } = useUIStore();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <AnnouncementBar />

      {/* Sticky header — 56px tall → combined with bar = 88px (matches mega menu top offset) */}
      <header
        className={`sticky top-0 z-30 bg-white transition-shadow duration-200 ${
          isScrolled ? "shadow-md" : "border-b border-gray-100"
        }`}
      >
        <div className="container-custom">
          <div className="flex items-center h-14 gap-4">
            {/* Mobile menu button */}
            <button
              onClick={openMobileMenu}
              className="lg:hidden p-2 text-gray-600 hover:text-maroon-700 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>

            {/* Logo */}
            <Logo className="text-2xl" />

            {/* Desktop nav — centred */}
            <div className="hidden lg:flex flex-1 items-center justify-center">
              <MegaMenu />
            </div>

            {/* Desktop search */}
            <div className="hidden md:flex flex-1 max-w-sm">
              <SearchBar />
            </div>

            {/* Mobile search toggle */}
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="md:hidden p-2 text-gray-600 hover:text-maroon-700 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Search"
            >
              {showSearch ? <X size={22} /> : <Search size={22} />}
            </button>

            {/* Cart / Wishlist / Account */}
            <UserActions />
          </div>

          {/* Mobile search bar (expandable) */}
          {showSearch && (
            <div className="pb-3 md:hidden">
              <SearchBar onClose={() => setShowSearch(false)} />
            </div>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
    </>
  );
}
