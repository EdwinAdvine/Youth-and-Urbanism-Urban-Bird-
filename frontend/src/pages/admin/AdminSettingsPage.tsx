import { useEffect, useState } from "react";
import { Save, Store, Phone, Globe, Bell, Mail, AlertCircle } from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";

const SECTIONS = [
  { id: "identity", label: "Store Identity", icon: Store },
  { id: "social", label: "Contact & Social", icon: Globe },
  { id: "announcements", label: "Announcement Bar", icon: Bell },
  { id: "email", label: "Email Templates", icon: Mail },
  { id: "inventory", label: "Inventory Alerts", icon: AlertCircle },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("identity");

  // Form state
  const [storeName, setStoreName] = useState("");
  const [storeLogoUrl, setStoreLogoUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [pinterestUrl, setPinterestUrl] = useState("");
  const [announcementMessages, setAnnouncementMessages] = useState<string[]>([""]);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  useEffect(() => {
    setIsLoading(true);
    api.get("/api/v1/admin/settings")
      .then((r) => {
        const s = r.data;
        setSettings(s);
        setStoreName(s.store_name ?? "Urban Bird");
        setStoreLogoUrl(s.store_logo_url ?? "");
        setTagline(s.tagline ?? "");
        setWhatsappNumber(s.whatsapp_number ?? "");
        const social = s.social_links ?? {};
        setInstagramUrl(social.instagram ?? "");
        setFacebookUrl(social.facebook ?? "");
        setTiktokUrl(social.tiktok ?? "");
        setPinterestUrl(social.pinterest ?? "");
        setAnnouncementMessages(
          Array.isArray(s.announcement_messages) && s.announcement_messages.length
            ? s.announcement_messages
            : [""]
        );
        setLowStockThreshold(s.low_stock_threshold_default ?? 5);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (activeSection === "identity") {
        payload.store_name = storeName;
        payload.store_logo_url = storeLogoUrl;
        payload.tagline = tagline;
      } else if (activeSection === "social") {
        payload.whatsapp_number = whatsappNumber;
        payload.social_links = {
          instagram: instagramUrl,
          facebook: facebookUrl,
          tiktok: tiktokUrl,
          pinterest: pinterestUrl,
        };
      } else if (activeSection === "announcements") {
        payload.announcement_messages = announcementMessages.filter((m) => m.trim());
      } else if (activeSection === "inventory") {
        payload.low_stock_threshold_default = lowStockThreshold;
      }
      await api.patch("/api/v1/admin/settings", { settings: payload });
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">Store Settings</h1>
          <p className="text-sm text-gray-500 font-manrope mt-0.5">Configure your store identity, social links, and notifications</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-60 text-white text-sm font-manrope font-medium rounded-lg px-4 py-2.5"
        >
          <Save size={15} />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Section nav */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm font-manrope transition-colors ${
                  activeSection === id
                    ? "bg-maroon-50 text-maroon-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Section content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6">
          {activeSection === "identity" && (
            <div className="space-y-5">
              <h2 className="font-semibold font-lexend text-gray-900 mb-4">Store Identity</h2>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1.5">Store Name</label>
                <input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
              </div>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1.5">Store Logo URL</label>
                <input
                  value={storeLogoUrl}
                  onChange={(e) => setStoreLogoUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
              </div>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1.5">Tagline</label>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Premium urban streetwear…"
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
              </div>
            </div>
          )}

          {activeSection === "social" && (
            <div className="space-y-5">
              <h2 className="font-semibold font-lexend text-gray-900 mb-4">Contact & Social Links</h2>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1.5">WhatsApp Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="254700000000"
                    className="w-full pl-9 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
                <p className="text-xs text-gray-400 font-manrope mt-1">Digits only, e.g. 254712345678 (used in the floating chat button)</p>
              </div>
              {[
                { label: "Instagram URL", value: instagramUrl, setter: setInstagramUrl, placeholder: "https://instagram.com/urbanbird" },
                { label: "Facebook URL", value: facebookUrl, setter: setFacebookUrl, placeholder: "https://facebook.com/urbanbird" },
                { label: "TikTok URL", value: tiktokUrl, setter: setTiktokUrl, placeholder: "https://tiktok.com/@urbanbird" },
                { label: "Pinterest URL", value: pinterestUrl, setter: setPinterestUrl, placeholder: "https://pinterest.com/urbanbird" },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label}>
                  <label className="block text-xs font-manrope text-gray-500 mb-1.5">{label}</label>
                  <input
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  />
                </div>
              ))}
            </div>
          )}

          {activeSection === "announcements" && (
            <div>
              <h2 className="font-semibold font-lexend text-gray-900 mb-1">Announcement Bar Messages</h2>
              <p className="text-sm text-gray-500 font-manrope mb-5">These rotate in the announcement bar at the top of every page.</p>
              <div className="space-y-2">
                {announcementMessages.map((msg, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={msg}
                      onChange={(e) => {
                        const next = [...announcementMessages];
                        next[i] = e.target.value;
                        setAnnouncementMessages(next);
                      }}
                      placeholder={`Message ${i + 1}…`}
                      className="flex-1 border border-gray-200 rounded-lg px-3.5 py-2 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                    />
                    <button
                      onClick={() => setAnnouncementMessages(announcementMessages.filter((_, j) => j !== i))}
                      className="px-3 text-gray-400 hover:text-red-500 text-xs border border-gray-200 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setAnnouncementMessages([...announcementMessages, ""])}
                  className="text-sm text-maroon-700 hover:text-maroon-800 font-manrope font-medium mt-1"
                >
                  + Add message
                </button>
              </div>
            </div>
          )}

          {activeSection === "email" && (
            <div>
              <h2 className="font-semibold font-lexend text-gray-900 mb-2">Email Templates</h2>
              <p className="text-sm text-gray-500 font-manrope mb-4">
                Email template editing coming soon. Transactional emails are sent automatically on order events.
              </p>
              <div className="space-y-3">
                {["Order Confirmation", "Shipping Notification", "Account Welcome"].map((name) => (
                  <div key={name} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-sm font-manrope font-medium text-gray-900">{name}</p>
                      <p className="text-xs text-gray-500 font-manrope">Auto-sent</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 font-manrope rounded-full px-2 py-0.5">Active</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "inventory" && (
            <div>
              <h2 className="font-semibold font-lexend text-gray-900 mb-4">Inventory Alerts</h2>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1.5">Default Low Stock Threshold</label>
                <input
                  type="number"
                  min={1}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
                  className="w-32 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
                <p className="text-xs text-gray-400 font-manrope mt-1">
                  Variants with stock at or below this number will appear in low-stock alerts on the dashboard.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
