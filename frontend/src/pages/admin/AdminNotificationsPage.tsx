import { useEffect } from "react";
import { Bell, Package, ShoppingBag, CheckCheck, Info } from "lucide-react";
import { useNotificationStore } from "../../store/notificationStore";
import type { Notification } from "../../types";
import { useSEO } from "../../hooks/useSEO";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  new_order: <ShoppingBag size={16} className="text-blue-500" />,
  order_dispatched: <Package size={16} className="text-orange-500" />,
  order_delivered: <CheckCheck size={16} className="text-green-600" />,
};

function getIcon(type: string) {
  return TYPE_ICONS[type] ?? <Info size={16} className="text-gray-400" />;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function AdminNotificationsPage() {
  useSEO({ title: "Notifications", noindex: true });
  const {
    adminNotifications,
    adminUnreadCount,
    adminTotal,
    adminPage,
    isAdminLoading,
    fetchAdminNotifications,
    markAdminRead,
    markAdminAllRead,
  } = useNotificationStore();

  useEffect(() => {
    fetchAdminNotifications(1);
  }, []);

  const handleMark = async (n: Notification) => {
    if (!n.is_read) await markAdminRead(n.id);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="text-maroon-700" size={22} />
          <h1 className="text-xl font-bold font-lexend text-gray-900">Admin Notifications</h1>
          {adminUnreadCount > 0 && (
            <span className="bg-maroon-700 text-white text-xs px-2 py-0.5 rounded-full font-manrope">
              {adminUnreadCount} new
            </span>
          )}
        </div>
        {adminUnreadCount > 0 && (
          <button
            onClick={() => markAdminAllRead()}
            className="text-sm text-maroon-700 hover:text-maroon-800 font-manrope font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {isAdminLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : adminNotifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-manrope">No notifications yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {adminNotifications.map((n) => (
            <li
              key={n.id}
              onClick={() => handleMark(n)}
              className={`flex gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                !n.is_read
                  ? "border-maroon-200 bg-maroon-50 hover:bg-maroon-100"
                  : "border-gray-100 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-manrope ${!n.is_read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                  {n.title}
                </p>
                <p className="text-sm text-gray-500 font-manrope mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 font-manrope mt-1">{formatDate(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <span className="w-2 h-2 rounded-full bg-maroon-700 flex-shrink-0 mt-2" />
              )}
            </li>
          ))}
        </ul>
      )}

      {adminTotal > adminNotifications.length && (
        <button
          onClick={() => fetchAdminNotifications(adminPage + 1)}
          className="mt-6 w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-manrope transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  );
}
