import { useEffect, useState } from "react";
import {
  Save, Store, Phone, Globe, Bell, Mail, AlertCircle,
  CreditCard, MessageSquare, Eye, EyeOff,
} from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useSEO } from "../../hooks/useSEO";

const SECTIONS = [
  { id: "identity",      label: "Store Identity",    icon: Store },
  { id: "social",        label: "Contact & Social",  icon: Globe },
  { id: "announcements", label: "Announcement Bar",  icon: Bell },
  { id: "payments",      label: "Payment Gateways",  icon: CreditCard },
  { id: "email",         label: "Email / SMTP",      icon: Mail },
  { id: "sms",           label: "SMS",               icon: MessageSquare },
  { id: "inventory",     label: "Inventory Alerts",  icon: AlertCircle },
];

const MASKED = "__masked__";

// Masked input with show/hide toggle.
// When value === MASKED the field shows a placeholder indicating the key is already saved.
// Typing a new value replaces it; clearing the field keeps the mask.
function SecretField({
  label, value, onChange, placeholder, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isMasked = value === MASKED;
  return (
    <div>
      <label className="block text-xs font-manrope text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={isMasked ? "" : value}
          onChange={(e) => onChange(e.target.value || MASKED)}
          placeholder={isMasked ? "Saved — enter a new value to change" : placeholder}
          className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {isMasked && (
        <p className="text-xs text-emerald-600 font-manrope mt-1 flex items-center gap-1">
          <span>●</span> Saved securely
        </p>
      )}
      {!isMasked && hint && <p className="text-xs text-gray-400 font-manrope mt-1">{hint}</p>}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, hint, type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-manrope text-gray-500 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
      />
      {hint && <p className="text-xs text-gray-400 font-manrope mt-1">{hint}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="font-semibold font-lexend text-gray-900 mb-5">{children}</h2>;
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-100 rounded-xl p-5 space-y-4">
      <p className="text-xs font-manrope font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      {children}
    </div>
  );
}

export default function AdminSettingsPage() {
  useSEO({ title: "Settings", noindex: true });
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("identity");

  // Store Identity
  const [storeName, setStoreName] = useState("");
  const [storeLogoUrl, setStoreLogoUrl] = useState("");
  const [tagline, setTagline] = useState("");

  // Contact & Social
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [pinterestUrl, setPinterestUrl] = useState("");

  // Announcements
  const [announcementMessages, setAnnouncementMessages] = useState<Array<{ text: string; link: string; linkLabel: string }>>([
    { text: "", link: "", linkLabel: "" },
  ]);

  // Paystack
  const [paystackPublicKey, setPaystackPublicKey] = useState("");
  const [paystackSecretKey, setPaystackSecretKey] = useState("");
  const [paystackWebhookSecret, setPaystackWebhookSecret] = useState("");

  // M-Pesa
  const [mpesaEnv, setMpesaEnv] = useState("sandbox");
  const [mpesaConsumerKey, setMpesaConsumerKey] = useState("");
  const [mpesaConsumerSecret, setMpesaConsumerSecret] = useState("");
  const [mpesaShortcode, setMpesaShortcode] = useState("");
  const [mpesaPasskey, setMpesaPasskey] = useState("");
  const [mpesaCallbackUrl, setMpesaCallbackUrl] = useState("");

  // Stripe
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");

  // Email / SMTP
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("Urban Bird");

  // SMS (Africa's Talking)
  const [atUsername, setAtUsername] = useState("sandbox");
  const [atApiKey, setAtApiKey] = useState("");
  const [atSenderId, setAtSenderId] = useState("URBANBIRD");

  // Checkout Options
  const [codEnabled, setCodEnabled] = useState(true);

  // Inventory
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  useEffect(() => {
    setIsLoading(true);
    api
      .get("/api/v1/admin/settings")
      .then((r) => {
        const s = r.data;
        // NOTE: secret fields arrive as "__masked__" if already saved, or "" if blank.

        // Identity
        setStoreName(s.store_name ?? "Urban Bird");
        setStoreLogoUrl(s.store_logo_url ?? "");
        setTagline(s.store_tagline ?? "");

        // Social
        setWhatsappNumber(s.whatsapp_number ?? "");
        const social = s.social_links ?? {};
        setInstagramUrl(social.instagram ?? "");
        setFacebookUrl(social.facebook ?? "");
        setTiktokUrl(social.tiktok ?? "");
        setTwitterUrl(social.twitter ?? "");
        setPinterestUrl(social.pinterest ?? "");

        // Announcements
        if (Array.isArray(s.announcement_messages) && s.announcement_messages.length) {
          setAnnouncementMessages(
            s.announcement_messages.map((m: any) =>
              typeof m === "string"
                ? { text: m, link: "", linkLabel: "" }
                : { text: m.text ?? "", link: m.link ?? "", linkLabel: m.linkLabel ?? "" }
            )
          );
        }

        // Paystack
        setPaystackPublicKey(s.paystack_public_key ?? "");
        setPaystackSecretKey(s.paystack_secret_key ?? "");
        setPaystackWebhookSecret(s.paystack_webhook_secret ?? "");

        // M-Pesa
        setMpesaEnv(s.mpesa_environment ?? "sandbox");
        setMpesaConsumerKey(s.mpesa_consumer_key ?? "");
        setMpesaConsumerSecret(s.mpesa_consumer_secret ?? "");
        setMpesaShortcode(s.mpesa_shortcode ?? "");
        setMpesaPasskey(s.mpesa_passkey ?? "");
        setMpesaCallbackUrl(s.mpesa_callback_url ?? "");

        // Stripe
        setStripePublishableKey(s.stripe_publishable_key ?? "");
        setStripeSecretKey(s.stripe_secret_key ?? "");
        setStripeWebhookSecret(s.stripe_webhook_secret ?? "");

        // Email
        setSmtpHost(s.smtp_host ?? "smtp.gmail.com");
        setSmtpPort(String(s.smtp_port ?? 587));
        setSmtpUser(s.smtp_user ?? "");
        setSmtpPassword(s.smtp_password ?? "");
        setFromEmail(s.from_email ?? "");
        setFromName(s.from_name ?? "Urban Bird");

        // SMS
        setAtUsername(s.at_username ?? "sandbox");
        setAtApiKey(s.at_api_key ?? "");
        setAtSenderId(s.at_sender_id ?? "URBANBIRD");

        // Checkout Options
        setCodEnabled(s.cod_enabled !== false);

        // Inventory
        setLowStockThreshold(s.low_stock_threshold ?? 10);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setIsLoading(false));
  }, []);

  // Strip keys whose value is still the server-side mask sentinel —
  // the backend will ignore them anyway, but omitting them reduces noise.
  const omitMasked = (obj: Record<string, any>) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== MASKED));

  const handleSave = async () => {
    setSaving(true);
    try {
      let payload: Record<string, any> = {};

      if (activeSection === "identity") {
        payload = { store_name: storeName, store_logo_url: storeLogoUrl, store_tagline: tagline };
      } else if (activeSection === "social") {
        payload = {
          whatsapp_number: whatsappNumber,
          social_links: {
            instagram: instagramUrl,
            facebook: facebookUrl,
            tiktok: tiktokUrl,
            twitter: twitterUrl,
            pinterest: pinterestUrl,
            whatsapp: `https://wa.me/${whatsappNumber}`,
          },
        };
      } else if (activeSection === "announcements") {
        payload = { announcement_messages: announcementMessages.filter((m) => m.text.trim()) };
      } else if (activeSection === "payments") {
        payload = omitMasked({
          cod_enabled: codEnabled,
          paystack_public_key: paystackPublicKey,
          paystack_secret_key: paystackSecretKey,
          paystack_webhook_secret: paystackWebhookSecret,
          mpesa_environment: mpesaEnv,
          mpesa_consumer_key: mpesaConsumerKey,
          mpesa_consumer_secret: mpesaConsumerSecret,
          mpesa_shortcode: mpesaShortcode,
          mpesa_passkey: mpesaPasskey,
          mpesa_callback_url: mpesaCallbackUrl,
          stripe_publishable_key: stripePublishableKey,
          stripe_secret_key: stripeSecretKey,
          stripe_webhook_secret: stripeWebhookSecret,
        });
      } else if (activeSection === "email") {
        payload = omitMasked({
          smtp_host: smtpHost,
          smtp_port: parseInt(smtpPort) || 587,
          smtp_user: smtpUser,
          smtp_password: smtpPassword,
          from_email: fromEmail,
          from_name: fromName,
        });
      } else if (activeSection === "sms") {
        payload = omitMasked({ at_username: atUsername, at_api_key: atApiKey, at_sender_id: atSenderId });
      } else if (activeSection === "inventory") {
        payload = { low_stock_threshold: lowStockThreshold };
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
        {Array(3)
          .fill(0)
          .map((_, i) => (
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
          <p className="text-sm text-gray-500 font-manrope mt-0.5">
            Configure your store identity, payment gateways, email, SMS, and notifications
          </p>
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

      {/* Mobile/tablet: horizontal scrollable tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 lg:hidden">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-manrope whitespace-nowrap flex-shrink-0 transition-colors ${
              activeSection === id
                ? "bg-maroon-700 text-white font-medium"
                : "bg-white border border-gray-200 text-gray-600 hover:border-maroon-300 hover:text-maroon-700"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav — desktop only */}
        <div className="hidden lg:block w-52 flex-shrink-0">
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
        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
          {/* ── Store Identity ──────────────────────────────────────────── */}
          {activeSection === "identity" && (
            <div className="space-y-5">
              <SectionTitle>Store Identity</SectionTitle>
              <Field label="Store Name" value={storeName} onChange={setStoreName} />
              <Field
                label="Store Logo URL"
                value={storeLogoUrl}
                onChange={setStoreLogoUrl}
                placeholder="https://…"
                hint="Direct link to your logo image"
              />
              <Field
                label="Tagline"
                value={tagline}
                onChange={setTagline}
                placeholder="Premium urban streetwear…"
              />
            </div>
          )}

          {/* ── Contact & Social ────────────────────────────────────────── */}
          {activeSection === "social" && (
            <div className="space-y-5">
              <SectionTitle>Contact & Social Links</SectionTitle>
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
                <p className="text-xs text-gray-400 font-manrope mt-1">
                  Digits only, e.g. 254712345678 (used in the floating chat button)
                </p>
              </div>
              {[
                { label: "Instagram URL", value: instagramUrl, setter: setInstagramUrl, placeholder: "https://instagram.com/urbanbird" },
                { label: "Facebook URL",  value: facebookUrl,  setter: setFacebookUrl,  placeholder: "https://facebook.com/urbanbird" },
                { label: "TikTok URL",    value: tiktokUrl,    setter: setTiktokUrl,    placeholder: "https://tiktok.com/@urbanbird" },
                { label: "Twitter / X URL", value: twitterUrl, setter: setTwitterUrl,  placeholder: "https://twitter.com/urbanbird" },
                { label: "Pinterest URL", value: pinterestUrl, setter: setPinterestUrl, placeholder: "https://pinterest.com/urbanbird" },
              ].map(({ label, value, setter, placeholder }) => (
                <Field key={label} label={label} value={value} onChange={setter} placeholder={placeholder} />
              ))}
            </div>
          )}

          {/* ── Announcement Bar ────────────────────────────────────────── */}
          {activeSection === "announcements" && (
            <div>
              <SectionTitle>Announcement Bar Messages</SectionTitle>
              <p className="text-sm text-gray-500 font-manrope -mt-3 mb-5">
                These rotate in the banner at the top of every page.
              </p>
              <div className="space-y-4">
                {announcementMessages.map((msg, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-manrope font-semibold uppercase tracking-wider text-gray-400">
                        Message {i + 1}
                      </span>
                      <button
                        onClick={() => setAnnouncementMessages(announcementMessages.filter((_, j) => j !== i))}
                        className="text-xs text-gray-400 hover:text-red-500 font-manrope"
                      >
                        Remove
                      </button>
                    </div>
                    <Field
                      label="Text"
                      value={msg.text}
                      onChange={(v) => {
                        const next = [...announcementMessages];
                        next[i] = { ...next[i], text: v };
                        setAnnouncementMessages(next);
                      }}
                      placeholder="Free delivery on orders above KSh 5,000"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Link URL"
                        value={msg.link}
                        onChange={(v) => {
                          const next = [...announcementMessages];
                          next[i] = { ...next[i], link: v };
                          setAnnouncementMessages(next);
                        }}
                        placeholder="/shop"
                      />
                      <Field
                        label="Link Label"
                        value={msg.linkLabel}
                        onChange={(v) => {
                          const next = [...announcementMessages];
                          next[i] = { ...next[i], linkLabel: v };
                          setAnnouncementMessages(next);
                        }}
                        placeholder="Shop Now →"
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setAnnouncementMessages([...announcementMessages, { text: "", link: "", linkLabel: "" }])
                  }
                  className="text-sm text-maroon-700 hover:text-maroon-800 font-manrope font-medium mt-1"
                >
                  + Add message
                </button>
              </div>
            </div>
          )}

          {/* ── Payment Gateways ────────────────────────────────────────── */}
          {activeSection === "payments" && (
            <div className="space-y-6">
              <SectionTitle>Payment Gateways</SectionTitle>

              <SubSection title="Cash on Delivery">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-manrope font-medium text-gray-800">Enable Cash on Delivery</p>
                    <p className="text-xs text-gray-400 font-manrope mt-0.5">
                      When disabled, customers will not see COD as a payment option at checkout
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCodEnabled((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      codEnabled ? "bg-maroon-700" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        codEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </SubSection>

              <SubSection title="Paystack">
                <Field
                  label="Public Key"
                  value={paystackPublicKey}
                  onChange={setPaystackPublicKey}
                  placeholder="pk_live_…"
                />
                <SecretField
                  label="Secret Key"
                  value={paystackSecretKey}
                  onChange={setPaystackSecretKey}
                  placeholder="sk_live_…"
                />
                <SecretField
                  label="Webhook Secret"
                  value={paystackWebhookSecret}
                  onChange={setPaystackWebhookSecret}
                  placeholder="Paystack webhook secret"
                />
              </SubSection>

              <SubSection title="M-Pesa (Safaricom Daraja)">
                <div>
                  <label className="block text-xs font-manrope text-gray-500 mb-1.5">Environment</label>
                  <select
                    value={mpesaEnv}
                    onChange={(e) => setMpesaEnv(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                  >
                    <option value="sandbox">Sandbox (testing)</option>
                    <option value="production">Production (live)</option>
                  </select>
                </div>
                <SecretField label="Consumer Key"    value={mpesaConsumerKey}    onChange={setMpesaConsumerKey}    placeholder="Daraja consumer key" />
                <SecretField label="Consumer Secret" value={mpesaConsumerSecret} onChange={setMpesaConsumerSecret} placeholder="Daraja consumer secret" />
                <Field label="Shortcode"    value={mpesaShortcode}    onChange={setMpesaShortcode}    placeholder="174379" />
                <SecretField label="Passkey" value={mpesaPasskey} onChange={setMpesaPasskey} placeholder="bfb279f9…" />
                <Field
                  label="Callback URL"
                  value={mpesaCallbackUrl}
                  onChange={setMpesaCallbackUrl}
                  placeholder="https://your-domain.com/api/v1/payments/mpesa/callback"
                  hint="Must be a publicly accessible HTTPS URL"
                />
              </SubSection>

              <SubSection title="Stripe">
                <Field
                  label="Publishable Key"
                  value={stripePublishableKey}
                  onChange={setStripePublishableKey}
                  placeholder="pk_live_…"
                />
                <SecretField label="Secret Key"      value={stripeSecretKey}      onChange={setStripeSecretKey}      placeholder="sk_live_…" />
                <SecretField label="Webhook Secret"  value={stripeWebhookSecret}  onChange={setStripeWebhookSecret}  placeholder="whsec_…" />
              </SubSection>
            </div>
          )}

          {/* ── Email / SMTP ────────────────────────────────────────────── */}
          {activeSection === "email" && (
            <div className="space-y-5">
              <SectionTitle>Email / SMTP</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Field label="SMTP Host" value={smtpHost} onChange={setSmtpHost} placeholder="smtp.gmail.com" />
                <Field label="SMTP Port" value={smtpPort} onChange={setSmtpPort} placeholder="587" type="number" />
              </div>
              <Field
                label="SMTP Username"
                value={smtpUser}
                onChange={setSmtpUser}
                placeholder="your_email@gmail.com"
              />
              <SecretField
                label="SMTP Password / App Password"
                value={smtpPassword}
                onChange={setSmtpPassword}
                placeholder="Gmail app password"
                hint="For Gmail use an App Password, not your account password"
              />
              <div className="grid grid-cols-2 gap-4">
                <Field label="From Email" value={fromEmail} onChange={setFromEmail} placeholder="noreply@urbanbird.co.ke" />
                <Field label="From Name"  value={fromName}  onChange={setFromName}  placeholder="Urban Bird" />
              </div>
            </div>
          )}

          {/* ── SMS ─────────────────────────────────────────────────────── */}
          {activeSection === "sms" && (
            <div className="space-y-5">
              <SectionTitle>SMS — Africa's Talking</SectionTitle>
              <Field
                label="Username"
                value={atUsername}
                onChange={setAtUsername}
                placeholder="sandbox"
                hint={'Use "sandbox" for testing, or your AT account username for production'}
              />
              <SecretField
                label="API Key"
                value={atApiKey}
                onChange={setAtApiKey}
                placeholder="Africa's Talking API key"
              />
              <Field
                label="Sender ID"
                value={atSenderId}
                onChange={setAtSenderId}
                placeholder="URBANBIRD"
                hint="Alphanumeric sender ID (max 11 chars) registered with Africa's Talking"
              />
            </div>
          )}

          {/* ── Inventory Alerts ────────────────────────────────────────── */}
          {activeSection === "inventory" && (
            <div>
              <SectionTitle>Inventory Alerts</SectionTitle>
              <div>
                <label className="block text-xs font-manrope text-gray-500 mb-1.5">
                  Default Low Stock Threshold
                </label>
                <input
                  type="number"
                  min={1}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 10)}
                  className="w-32 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
                />
                <p className="text-xs text-gray-400 font-manrope mt-1">
                  Variants at or below this quantity will appear in dashboard low-stock alerts.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
