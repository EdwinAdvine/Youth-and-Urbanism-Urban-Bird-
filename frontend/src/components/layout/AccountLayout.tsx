import { Outlet, Link, useLocation } from "react-router-dom";
import { User, Package, MapPin, Settings, ChevronRight } from "lucide-react";
import Header from "../header/Header";
import Footer from "../footer/Footer";
import { useAuthStore } from "../../store/authStore";

const navItems = [
  { to: "/account", icon: User, label: "Dashboard", exact: true },
  { to: "/account/orders", icon: Package, label: "My Orders" },
  { to: "/account/addresses", icon: MapPin, label: "Addresses" },
  { to: "/account/settings", icon: Settings, label: "Settings" },
];

export default function AccountLayout() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="container-custom">
          <div className="flex gap-8">
            {/* Sidebar */}
            <aside className="hidden md:block w-64 flex-shrink-0">
              {/* User info */}
              <div className="bg-white rounded-xl p-5 mb-4 border border-gray-100">
                <div className="w-12 h-12 bg-maroon-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-maroon-700 font-lexend">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 font-lexend">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-sm text-gray-500 font-manrope truncate">{user?.email}</p>
              </div>

              {/* Nav */}
              <nav className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {navItems.map(({ to, icon: Icon, label, exact }) => {
                  const isActive = exact ? pathname === to : pathname.startsWith(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-manrope transition-colors border-b border-gray-50 last:border-0 ${
                        isActive
                          ? "text-maroon-700 bg-maroon-50 font-semibold"
                          : "text-gray-700 hover:bg-gray-50 hover:text-maroon-700"
                      }`}
                    >
                      <Icon size={17} />
                      {label}
                      {isActive && <ChevronRight size={15} className="ml-auto" />}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
