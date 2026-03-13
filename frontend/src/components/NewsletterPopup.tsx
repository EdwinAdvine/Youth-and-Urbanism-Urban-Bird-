import { useState, useEffect } from "react";
import { X, Mail, Loader2 } from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

const STORAGE_KEY = "ub_newsletter_seen";
const DELAY_MS = 6000; // show after 6 seconds

export default function NewsletterPopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setShow(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api.post("/api/v1/newsletter/subscribe", { email, name: name || undefined, source: "popup" });
      setSuccess(true);
      localStorage.setItem(STORAGE_KEY, "1");
      setTimeout(dismiss, 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 z-10 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>

        {/* Banner */}
        <div className="bg-maroon-700 px-8 py-8 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold font-lexend mb-1">Get 10% Off</h2>
          <p className="text-maroon-100 font-manrope text-sm">
            Subscribe for exclusive deals, new arrivals & style drops.
          </p>
        </div>

        <div className="px-8 py-6">
          {success ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-semibold font-lexend text-gray-900 text-lg">You're in!</p>
              <p className="text-sm text-gray-500 font-manrope mt-1">
                Check your inbox for a welcome gift.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Your first name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-400 bg-gray-50"
              />
              <input
                type="email"
                placeholder="Your email address *"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-400 bg-gray-50"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-maroon-700 hover:bg-maroon-800 text-white font-semibold font-manrope py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? "Subscribing…" : "Claim My 10% Off"}
              </button>
              <p className="text-xs text-center text-gray-400 font-manrope">
                No spam. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
