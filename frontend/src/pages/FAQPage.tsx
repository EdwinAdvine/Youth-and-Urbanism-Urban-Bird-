import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useSEO } from "../hooks/useSEO";

const FAQS = [
  {
    category: "Orders & Payments",
    items: [
      {
        q: "How do I place an order?",
        a: "Browse our shop, select your size and colour, then add items to your cart. Proceed to checkout, fill in your shipping details, choose a payment method (Paystack card/M-Pesa or Cash on Delivery), and confirm your order.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept card payments and M-Pesa via Paystack, and Cash on Delivery (COD) for eligible locations in Kenya.",
      },
      {
        q: "Can I modify or cancel my order after placing it?",
        a: "You can cancel an order while it is still in 'Pending Payment' or 'Confirmed' status. Once processing begins, cancellations are no longer possible. Log in to My Account → Orders → select your order to cancel.",
      },
      {
        q: "How do I track my order?",
        a: "Visit our Track My Order page, enter your order number and the email used at checkout. You can also log in and go to My Account → Orders for real-time status updates.",
      },
      {
        q: "Will I receive an order confirmation email?",
        a: "Yes. A confirmation email is sent to your email address as soon as your order is placed. Check your spam folder if you don't see it within a few minutes.",
      },
    ],
  },
  {
    category: "Shipping & Delivery",
    items: [
      {
        q: "Do you deliver across Kenya?",
        a: "Yes, we deliver to all counties in Kenya. Delivery times and costs vary by location. Nairobi orders typically arrive within 1–2 business days; other regions take 2–5 business days.",
      },
      {
        q: "Is there free delivery?",
        a: "We offer free delivery on orders above KSh 5,000 within Nairobi. Flat-rate delivery fees apply to other regions and smaller orders.",
      },
      {
        q: "How will I know when my order has been shipped?",
        a: "You'll receive a notification (and email if enabled) when your order is marked 'Shipped', along with a tracking number if available.",
      },
      {
        q: "Do you offer same-day delivery?",
        a: "Same-day delivery is available in select Nairobi areas for orders placed before 12:00 PM. Contact us on WhatsApp to confirm availability for your location.",
      },
    ],
  },
  {
    category: "Returns & Exchanges",
    items: [
      {
        q: "What is your return policy?",
        a: "We accept returns within 7 days of delivery for items that are unworn, unwashed, and in original condition with tags attached. Sale items are final sale.",
      },
      {
        q: "How do I request a return?",
        a: "Log in to My Account → Orders → select the delivered order → click 'Request a Return'. Fill in the reason and submit. We'll review within 1–2 business days.",
      },
      {
        q: "How long does a refund take?",
        a: "Once we receive and inspect the returned item, refunds are processed within 3–5 business days to your original payment method.",
      },
      {
        q: "Can I exchange an item for a different size?",
        a: "Yes! When requesting a return, select 'Exchange' as your preferred resolution and note the size you'd like. Exchanges are subject to stock availability.",
      },
    ],
  },
  {
    category: "Products & Sizing",
    items: [
      {
        q: "How do I find my size?",
        a: "Each product page includes a size guide. We recommend measuring your chest, waist, and hips and comparing with our size chart before ordering.",
      },
      {
        q: "Are your products true to size?",
        a: "Our streetwear pieces are designed with an urban, slightly relaxed fit. If you prefer a closer fit, we recommend sizing down. Refer to the individual size guide on each product page.",
      },
      {
        q: "Do you restock sold-out items?",
        a: "We regularly restock popular items. Use the wishlist or check back on the product page for restock updates. You can also reach out to us directly.",
      },
      {
        q: "How do I care for my Urban Bird garments?",
        a: "Machine wash cold, inside out, with similar colours. Do not bleach. Tumble dry low or hang to dry. Iron on low heat if needed. Avoid direct high heat to preserve prints and embroidery.",
      },
    ],
  },
  {
    category: "Account & Privacy",
    items: [
      {
        q: "Do I need an account to order?",
        a: "No, guest checkout is available. However, creating an account lets you track orders, save addresses, manage wishlists, and access your order history easily.",
      },
      {
        q: "How do I reset my password?",
        a: "Go to Account → Login → click 'Forgot Password'. Enter your email and we'll send you a reset link.",
      },
      {
        q: "Is my personal information secure?",
        a: "Yes. We take your privacy seriously. Your data is encrypted in transit and we never sell or share your personal information with third parties.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold font-manrope text-gray-900">{q}</span>
        <span className="flex-shrink-0 text-maroon-700 mt-0.5">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {open && (
        <p className="text-sm font-manrope text-gray-600 leading-relaxed pb-4 pr-8">{a}</p>
      )}
    </div>
  );
}

export default function FAQPage() {
  useSEO({
    title: "FAQ — Frequently Asked Questions",
    description: "Find answers to common questions about Urban Bird orders, shipping, returns, payments, and more.",
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold font-lexend text-gray-900">Frequently Asked Questions</h1>
          <p className="text-gray-500 font-manrope mt-3 text-sm sm:text-base">
            Can't find what you're looking for?{" "}
            <a href="mailto:hello@urbanbird.co.ke" className="text-maroon-700 hover:underline font-medium">
              Email us
            </a>{" "}
            or{" "}
            <a href="https://wa.me/254799075061" target="_blank" rel="noopener noreferrer" className="text-maroon-700 hover:underline font-medium">
              chat on WhatsApp
            </a>
            .
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-6">
          {FAQS.map((section) => (
            <div key={section.category} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                <h2 className="text-base font-bold font-lexend text-gray-900">{section.category}</h2>
              </div>
              <div className="px-6">
                {section.items.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-10 bg-maroon-700 rounded-2xl p-6 sm:p-8 text-center text-white">
          <h3 className="text-lg font-bold font-lexend mb-2">Still need help?</h3>
          <p className="text-maroon-100 font-manrope text-sm mb-5">
            Our team is available Monday–Saturday, 9AM–6PM EAT.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:hello@urbanbird.co.ke"
              className="bg-white text-maroon-700 font-manrope font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-maroon-50 transition-colors"
            >
              Email Us
            </a>
            <a
              href="https://wa.me/254799075061"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/20 text-white font-manrope font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-white/30 transition-colors"
            >
              WhatsApp
            </a>
            <Link
              to="/track-order"
              className="bg-white/20 text-white font-manrope font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-white/30 transition-colors"
            >
              Track Order
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
