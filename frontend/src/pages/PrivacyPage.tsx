import { useEffect, useState } from "react";
import { Shield, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { useSEO } from "../hooks/useSEO";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";

interface PolicySection {
  title: string;
  body: string[];
}

const DEFAULT_SECTIONS: PolicySection[] = [
  {
    title: "Information We Collect",
    body: [
      "Personal details you provide when creating an account or placing an order: name, email address, phone number, and delivery address.",
      "Payment information processed securely through Paystack. We do not store your card details on our servers.",
      "Order history, wishlist items, and account preferences.",
      "Technical data such as your IP address, browser type, and pages visited, collected automatically when you use our website.",
    ],
  },
  {
    title: "How We Use Your Information",
    body: [
      "To process and fulfil your orders, including sending order confirmations and shipping updates.",
      "To send account-related notifications such as password resets and security alerts.",
      "To improve our website, products, and customer experience based on usage patterns.",
      "To send promotional emails and offers — you can opt out at any time via the unsubscribe link or your account settings.",
    ],
  },
  {
    title: "Sharing Your Information",
    body: [
      "We do not sell, rent, or trade your personal information to third parties.",
      "We share your delivery details with our courier partners solely to fulfil your order.",
      "Payment data is processed by Paystack under their own Privacy Policy.",
      "We may disclose information if required by law or to protect the rights and safety of Urban Bird and its customers.",
    ],
  },
  {
    title: "Data Security",
    body: [
      "All data transmitted between your browser and our servers is encrypted using HTTPS/TLS.",
      "Passwords are stored as one-way hashes and are never visible to our team.",
      "Access to customer data is restricted to authorised staff only.",
      "Despite our efforts, no method of transmission over the internet is 100% secure. Please use a strong, unique password for your account.",
    ],
  },
  {
    title: "Your Rights",
    body: [
      "You may request a copy of the personal data we hold about you by emailing hello@urbanbird.co.ke.",
      "You may request correction or deletion of your data at any time, subject to legal retention requirements.",
      "You may withdraw marketing consent at any time via your account settings or the unsubscribe link in any email.",
      "To exercise any of these rights, contact us at hello@urbanbird.co.ke.",
    ],
  },
  {
    title: "Cookies",
    body: [
      "We use essential cookies to keep you logged in and remember your cart.",
      "Analytics cookies (if enabled) help us understand how visitors use our site. You can disable these in your browser settings.",
      "We do not use third-party advertising cookies.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. Material changes will be communicated via email or a notice on our website.",
      "Continued use of our website after changes constitutes acceptance of the updated policy.",
      "This policy was last updated in March 2026.",
    ],
  },
];

export default function PrivacyPage() {
  useSEO({
    title: "Privacy Policy",
    description: "Learn how Urban Bird collects, uses, and protects your personal information.",
  });

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [sections, setSections] = useState<PolicySection[]>(DEFAULT_SECTIONS);

  useEffect(() => {
    api
      .get("/api/v1/content/privacy")
      .then((r) => {
        if (r.data?.sections?.length) setSections(r.data.sections);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom max-w-3xl mx-auto">
        {/* Header */}
        <div className="relative text-center mb-10">
          <div className="w-14 h-14 bg-maroon-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-maroon-700" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-lexend text-gray-900">Privacy Policy</h1>
          <p className="text-gray-500 font-manrope mt-3 text-sm sm:text-base max-w-xl mx-auto">
            We respect your privacy and are committed to protecting your personal data.
          </p>
          {isAdmin && (
            <Link
              to="/admin/content/privacy"
              className="absolute top-0 right-0 inline-flex items-center gap-1.5 text-xs font-manrope font-semibold text-maroon-700 bg-maroon-50 border border-maroon-200 px-3 py-1.5 rounded-lg hover:bg-maroon-100 transition-colors"
            >
              <Pencil size={13} />
              Edit Page
            </Link>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.title} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                <h2 className="text-base font-bold font-lexend text-gray-900">{section.title}</h2>
              </div>
              <ul className="px-6 py-5 space-y-3">
                {section.body.map((text, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm font-manrope text-gray-600 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-maroon-400 flex-shrink-0 mt-1.5" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-8 text-center">
          <p className="text-sm font-manrope text-gray-500">
            Questions about this policy?{" "}
            <a href="mailto:hello@urbanbird.co.ke" className="text-maroon-700 hover:underline font-semibold">
              hello@urbanbird.co.ke
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
