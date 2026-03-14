import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Package, ShoppingBag, Heart, CheckCheck, Info } from "lucide-react";
import { useNotificationStore } from "../../store/notificationStore";
import { useAuthStore } from "../../store/authStore";
import type { Notification } from "../../types";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  welcome: <Heart size={14} className="text-pink-500" />,
  order_placed: <ShoppingBag size={14} className="text-blue-500" />,
  order_confirmed: <CheckCheck size={14} className="text-green-500" />,
  order_dispatched: <Package size={14} className="text-orange-500" />,
  order_out_for_delivery: <Package size={14} className="text-yellow-600" />,
  order_delivered: <CheckCheck size={14} className="text-green-600" />,
  thank_you: <Heart size={14} className="text-pink-500" />,
  new_order: <ShoppingBag size={14} className="text-maroon-700" />,
};

function getIcon(type: string) {
  return TYPE_ICONS[type] ?? <Info size={14} className="text-gray-400" />;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  isAdmin?: boolean;
}

export default function NotificationBell({ isAdmin = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const {
    unreadCount,
    adminUnreadCount,
    notifications,
    adminNotifications,
    fetchUnreadCount,
    fetchAdminUnreadCount,
    fetchNotifications,
    fetchAdminNotifications,
    markRead,
    markAdminRead,
    markAllRead,
    markAdminAllRead,
  } = useNotificationStore();

  const count = isAdmin ? adminUnreadCount : unreadCount;
  const items = (isAdmin ? adminNotifications : notifications).slice(0, 5);
  const notifLink = isAdmin ? "/admin/notifications" : "/account/notifications";

  // Poll unread count every 60 seconds
  useEffect(() => {
    if (!user) return;
    const fetch = isAdmin ? fetchAdminUnreadCount : fetchUnreadCount;
    fetch();
    const interval = setInterval(fetch, 60_000);
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (open && user) {
      if (isAdmin) fetchAdminNotifications();
      else fetchNotifications();
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleItemClick = async (n: Notification) => {
    if (!n.is_read) {
      if (isAdmin) await markAdminRead(n.id);
      else await markRead(n.id);
    }
    setOpen(false);
  };

  const handleMarkAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAdmin) await markAdminAllRead();
    else await markAllRead();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-600 hover:text-maroon-700 transition-colors rounded-lg hover:bg-gray-50"
        title="Notifications"
      >
        <Bell size={22} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-maroon-700 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-manrope leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900 font-manrope">Notifications</span>
            {count > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-maroon-700 hover:text-maroon-800 font-manrope font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400 font-manrope">
              No notifications yet
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 items-start ${
                      !n.is_read ? "bg-maroon-50" : ""
                    }`}
                  >
                    <span className="mt-0.5 flex-shrink-0">{getIcon(n.type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-manrope leading-snug ${!n.is_read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-400 font-manrope mt-0.5 truncate">{n.message}</p>
                      <p className="text-xs text-gray-300 font-manrope mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-maroon-700 flex-shrink-0 mt-1.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <Link
              to={notifLink}
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-maroon-700 hover:text-maroon-800 font-manrope"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
