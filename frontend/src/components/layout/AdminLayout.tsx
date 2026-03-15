import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FolderOpen,
  Warehouse,
  Truck,
  Users,
  Tag,
  BarChart2,
  LogOut,
  Menu,
  ChevronRight,
  RotateCcw,
  UserCog,
  Settings,
  Image,
  Mail,
  Bell,
  MessageSquare,
  FileText,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import Logo from "../header/Logo";
import api from "../../services/api";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/products", icon: Package, label: "Products" },
  { to: "/admin/categories", icon: FolderOpen, label: "Categories" },
  { to: "/admin/inventory", icon: Warehouse, label: "Inventory" },
  { to: "/admin/delivery", icon: Truck, label: "Delivery" },
  { to: "/admin/customers", icon: Users, label: "Customers" },
  { to: "/admin/coupons", icon: Tag, label: "Coupons" },
  { to: "/admin/analytics", icon: BarChart2, label: "Analytics" },
  { to: "/admin/returns", icon: RotateCcw, label: "Returns" },
  { to: "/admin/reviews", icon: MessageSquare, label: "Reviews" },
  { to: "/admin/newsletter", icon: Mail, label: "Newsletter" },
  { to: "/admin/banners", icon: Image, label: "Banners" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin/content/faq", icon: FileText, label: "Content" },
];

const superAdminItems = [
  { to: "/admin/staff", icon: UserCog, label: "Staff" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, setUser } = useAuthStore();
  const adminUnreadCount = useNotificationStore((s) => s.adminUnreadCount);

  const isSuperAdmin = user?.role === "super_admin";

  // Verify admin role against live backend on every layout mount
  useEffect(() => {
    api.get("/api/v1/users/me").then((res) => {
      const liveUser = res.data;
      if (!liveUser || !["admin", "super_admin"].includes(liveUser.role)) {
        logout().then(() => navigate("/admin/login", { replace: true }));
      } else {
        setUser(liveUser);
      }
    }).catch(() => {
      logout().then(() => navigate("/admin/login", { replace: true }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const NavLink = ({ to, icon: Icon, label, exact }: { to: string; icon: any; label: string; exact?: boolean }) => {
    const isActive = exact
      ? pathname === to
      : to === "/admin/content/faq"
        ? pathname.startsWith("/admin/content")
        : pathname.startsWith(to);
    return (
      <Link
        to={to}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-manrope transition-colors ${
          isActive
            ? "bg-maroon-700 text-white font-medium"
            : "text-gray-400 hover:bg-gray-800 hover:text-white"
        }`}
      >
        <Icon size={17} />
        {label}
        {to === "/admin/notifications" && adminUnreadCount > 0 && (
          <span className="ml-auto bg-white text-maroon-700 text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none font-manrope font-bold">
            {adminUnreadCount > 9 ? "9+" : adminUnreadCount}
          </span>
        )}
        {isActive && to !== "/admin/notifications" && <ChevronRight size={14} className="ml-auto" />}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-gray-800">
        <Logo variant="light" className="text-xl" />
        <p className="text-xs text-gray-400 font-manrope mt-1">Admin Panel</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map(({ to, icon, label, exact }) => (
          <NavLink key={to} to={to} icon={icon} label={label} exact={exact} />
        ))}

        {isSuperAdmin && (
          <>
            <div className="mx-3 my-2 border-t border-gray-800" />
            <p className="px-6 py-1 text-xs text-gray-600 font-manrope uppercase tracking-widest">Owner</p>
            {superAdminItems.map(({ to, icon, label }) => (
              <NavLink key={to} to={to} icon={icon} label={label} />
            ))}
          </>
        )}
      </nav>

      <div className="px-6 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 font-manrope truncate mb-0.5">
          {user?.first_name} {user?.last_name}
        </p>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs text-gray-600 font-manrope capitalize">{user?.role?.replace("_", " ")}</p>
          {isSuperAdmin && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 font-manrope font-medium rounded px-1.5 py-0.5">
              Owner
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors font-manrope"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-gray-900 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-60 bg-gray-900 md:hidden overflow-y-auto">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 text-gray-600 hover:text-gray-900 rounded"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-sm text-gray-700 font-manrope">
            <span>{user?.first_name} {user?.last_name}</span>
            {isSuperAdmin && (
              <span className="text-xs bg-yellow-100 text-yellow-700 font-manrope font-semibold rounded-full px-2 py-0.5">
                Super Admin
              </span>
            )}
            <Link
              to="/"
              className="text-xs text-maroon-700 hover:text-maroon-800"
            >
              View Store
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
