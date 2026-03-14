import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingBag, Heart, User } from "lucide-react";
import { cn } from "../../utils/cn";
import { useCartStore } from "../../store/cartStore";
import { useWishlistStore } from "../../store/wishlistStore";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/cart", icon: ShoppingBag, label: "Cart" },
  { to: "/wishlist", icon: Heart, label: "Wishlist" },
  { to: "/account", icon: User, label: "Account" },
];

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const itemCount = useCartStore((s) => s.itemCount);
  const wishlistCount = useWishlistStore((s) => s.productIds.length);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center h-14">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const count =
            to === "/cart" ? itemCount : to === "/wishlist" ? wishlistCount : 0;

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-manrope transition-colors",
                isActive ? "text-maroon-700" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <div className="relative">
                <Icon size={22} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-maroon-700 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center leading-none">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
