import { Link } from "react-router-dom";
import { RotateCcw, CheckCircle, Clock, Package, AlertCircle } from "lucide-react";
import { useSEO } from "../hooks/useSEO";

const STEPS = [
  {
    step: "1",
    title: "Log in & find your order",
    desc: "Go to My Account → Orders and select the delivered order you'd like to return.",
  },
  {
    step: "2",
    title: "Submit a return request",
    desc: "Click 'Request a Return', choose your reason, and add any details. We'll review within 1–2 business days.",
  },
  {
    step: "3",
    title: "Ship the item back",
    desc: "Once your return is approved, ship the item(s) back to our address. Pack them securely with the original tags attached.",
  },
  {
    step: "4",
    title: "Receive your resolution",
    desc: "After we inspect the returned item, we'll process your refund, exchange, or store credit within 3–5 business days.",
  },
];

const ELIGIBILITY = [
  { ok: true, text: "Items returned within 7 days of delivery" },
  { ok: true, text: "Unworn, unwashed, in original condition" },
  { ok: true, text: "Original tags still attached" },
  { ok: true, text: "Defective or incorrect items (any time)" },
  { ok: false, text: "Sale / clearance items — final sale" },
  { ok: false, text: "Items showing signs of wear or washing" },
  { ok: false, text: "Items without original tags" },
  { ok: false, text: "Requests submitted more than 7 days after delivery" },
];

export default function ReturnsPage() {
  useSEO({
    title: "Returns & Exchanges",
    description: "Learn about Urban Bird's return and exchange policy. We accept returns within 7 days of delivery.",
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-maroon-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RotateCcw size={24} className="text-maroon-700" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-lexend text-gray-900">Returns & Exchanges</h1>
          <p className="text-gray-500 font-manrope mt-3 text-sm sm:text-base max-w-xl mx-auto">
            Not happy with your order? We make it easy to return or exchange items within 7 days of delivery.
          </p>
        </div>

        {/* Policy Overview */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold font-lexend text-gray-900 mb-4">Return Policy Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Clock, label: "Return Window", value: "7 days from delivery" },
              { icon: Package, label: "Condition", value: "Unworn, tags attached" },
              { icon: CheckCircle, label: "Processing Time", value: "3–5 business days" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-maroon-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-maroon-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-manrope">{label}</p>
                  <p className="text-sm font-semibold font-manrope text-gray-900">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold font-lexend text-gray-900 mb-6">How to Return or Exchange</h2>
          <div className="space-y-5">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-maroon-700 text-white font-bold font-lexend text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-semibold font-manrope text-gray-900">{s.title}</p>
                  <p className="text-sm font-manrope text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/account/orders"
              className="bg-maroon-700 hover:bg-maroon-800 text-white font-manrope font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Go to My Orders
            </Link>
            <Link
              to="/track-order"
              className="border border-gray-200 text-gray-700 font-manrope font-semibold text-sm px-5 py-2.5 rounded-lg hover:border-maroon-700 transition-colors"
            >
              Track an Order
            </Link>
          </div>
        </div>

        {/* Eligibility */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold font-lexend text-gray-900 mb-4">What Can Be Returned?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ELIGIBILITY.map(({ ok, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                {ok ? (
                  <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <span className={`text-sm font-manrope ${ok ? "text-gray-700" : "text-gray-500"}`}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Options */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold font-lexend text-gray-900 mb-4">Resolution Options</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: "Refund", desc: "Full refund to your original payment method (M-Pesa, card, etc.) within 3–5 business days." },
              { title: "Exchange", desc: "Swap for a different size or colour. Subject to stock availability at the time of exchange." },
              { title: "Store Credit", desc: "Receive store credit valid for 12 months to use on any future Urban Bird purchase." },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-bold font-lexend text-gray-900 mb-1">{title}</p>
                <p className="text-xs font-manrope text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-maroon-50 border border-maroon-100 rounded-2xl p-6 text-center">
          <p className="text-sm font-manrope text-gray-700">
            Questions about a return?{" "}
            <a href="mailto:hello@urbanbird.co.ke" className="text-maroon-700 hover:underline font-semibold">
              hello@urbanbird.co.ke
            </a>{" "}
            or{" "}
            <a href="https://wa.me/254700000000" target="_blank" rel="noopener noreferrer" className="text-maroon-700 hover:underline font-semibold">
              WhatsApp us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
