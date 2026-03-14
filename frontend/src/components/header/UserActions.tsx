import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Heart, User, LogOut, Package, MapPin, Settings } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { useWishlistStore } from "../../store/wishlistStore";
import { useUIStore } from "../../store/uiStore";

export default function UserActions() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.itemCount);
  const wishlistCount = useWishlistStore((s) => s.productIds.length);
  const openCartDrawer = useUIStore((s) => s.openCartDrawer);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <div className="flex items-center gap-1">
      {/* Wishlist */}
      <Link
        to="/wishlist"
        className="relative p-2 text-gray-600 hover:text-maroon-700 transition-colors rounded-lg hover:bg-gray-50"
        title="Wishlist"
      >
        <Heart size={22} />
        {wishlistCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-maroon-700 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-manrope leading-none">
            {wishlistCount > 9 ? "9+" : wishlistCount}
          </span>
        )}
      </Link>

      {/* Cart */}
      <button
        onClick={openCartDrawer}
        className="relative p-2 text-gray-600 hover:text-maroon-700 transition-colors rounded-lg hover:bg-gray-50"
        title="Cart"
      >
        <ShoppingBag size={22} />
        {itemCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-maroon-700 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-manrope leading-none">
            {itemCount > 9 ? "9+" : itemCount}
          </span>
        )}
      </button>

      {/* Account */}
      {isAuthenticated ? (
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 p-2 text-gray-600 hover:text-maroon-700 transition-colors rounded-lg hover:bg-gray-50"
          >
            <User size={22} />
            <span className="hidden md:block text-sm font-manrope font-medium text-gray-700 max-w-[100px] truncate">
              {user?.first_name}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 font-manrope truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 font-manrope truncate">{user?.email}</p>
              </div>
              <nav className="py-1">
                {[
                  { to: "/account", icon: <User size={16} />, label: "Dashboard" },
                  { to: "/account/orders", icon: <Package size={16} />, label: "My Orders" },
                  { to: "/account/addresses", icon: <MapPin size={16} />, label: "Addresses" },
                  { to: "/account/settings", icon: <Settings size={16} />, label: "Settings" },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-maroon-700 transition-colors font-manrope"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
                {["admin", "super_admin"].includes(user?.role || "") && (
                  <Link
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-maroon-700 font-medium hover:bg-maroon-50 transition-colors font-manrope border-t border-gray-100"
                  >
                    <Settings size={16} />
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-manrope border-t border-gray-100"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </nav>
            </div>
          )}
        </div>
      ) : (
        <Link
          to="/account/login"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium font-manrope text-gray-700 hover:text-maroon-700 transition-colors rounded-lg hover:bg-gray-50"
        >
          <User size={22} />
          <span className="hidden sm:block">Sign In</span>
        </Link>
      )}
    </div>
  );
}
