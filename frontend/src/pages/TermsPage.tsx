import { useEffect, useState } from "react";
import { FileText, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { useSEO } from "../hooks/useSEO";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";

interface TermsSection {
  title: string;
  body: string[];
}

const DEFAULT_SECTIONS: TermsSection[] = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "By accessing or using the Urban Bird website (urbanbird.co.ke), you agree to be bound by these Terms of Service.",
      "If you do not agree to these terms, please do not use our website or services.",
      "We reserve the right to update these terms at any time. Continued use of the site after updates constitutes acceptance.",
    ],
  },
  {
    title: "2. Use of the Website",
    body: [
      "You must be at least 18 years old, or have parental/guardian consent, to make purchases on our site.",
      "You agree not to use the website for any unlawful purpose or in any way that could damage or impair Urban Bird's services.",
      "You are responsible for maintaining the confidentiality of your account credentials.",
      "We reserve the right to suspend or terminate accounts that violate these terms.",
    ],
  },
  {
    title: "3. Products & Pricing",
    body: [
      "All prices are listed in Kenyan Shillings (KSh) and are inclusive of VAT where applicable.",
      "We reserve the right to change prices at any time without prior notice. Prices at the time of order confirmation are binding.",
      "Product images are for illustration purposes. Actual colours may vary slightly due to screen calibration.",
      "We reserve the right to limit quantities, refuse orders, or cancel orders at our discretion.",
    ],
  },
  {
    title: "4. Orders & Payment",
    body: [
      "An order is confirmed only after successful payment or, for Cash on Delivery orders, after our team confirms availability.",
      "Payment is processed securely through Paystack. By paying, you agree to Paystack's Terms of Service.",
      "In the event of a pricing error, we will contact you before processing and you may cancel the order for a full refund.",
      "We accept card payments via Paystack and Cash on Delivery for eligible locations.",
    ],
  },
  {
    title: "5. Shipping & Delivery",
    body: [
      "Delivery times are estimates and are not guaranteed. Urban Bird is not liable for delays caused by third-party couriers or circumstances beyond our control.",
      "Risk of loss and title for items pass to you upon delivery to the carrier.",
      "Please review our Shipping Info page for full details on rates and delivery times.",
    ],
  },
  {
    title: "6. Returns & Refunds",
    body: [
      "Returns are accepted within 7 days of delivery for unworn, unwashed items in original condition with tags attached.",
      "Sale items are final sale and not eligible for return.",
      "Refunds are processed to the original payment method within 3–5 business days of receiving and inspecting the returned item.",
      "Please review our Returns & Exchanges page for full details on the return process.",
    ],
  },
  {
    title: "7. Intellectual Property",
    body: [
      "All content on this website — including logos, images, text, and design — is the property of Urban Bird and is protected by copyright.",
      "You may not reproduce, distribute, or use any content from this site without our prior written permission.",
      "Urban Bird is a trademark of Youth and Urbanism. All rights reserved.",
    ],
  },
  {
    title: "8. Limitation of Liability",
    body: [
      "Urban Bird is not liable for any indirect, incidental, or consequential damages arising from your use of our website or products.",
      "Our total liability to you for any claim shall not exceed the amount paid for the relevant order.",
      "We do not warrant that our website will be uninterrupted, error-free, or free of viruses.",
    ],
  },
  {
    title: "9. Governing Law",
    body: [
      "These Terms of Service are governed by the laws of Kenya.",
      "Any disputes shall be resolved exclusively in the courts of Nairobi, Kenya.",
      "If any provision of these terms is found to be unenforceable, the remaining provisions will continue in full force.",
    ],
  },
];

export default function TermsPage() {
  useSEO({
    title: "Terms of Service",
    description: "Read Urban Bird's Terms of Service governing the use of our website and purchase of our products.",
  });

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [sections, setSections] = useState<TermsSection[]>(DEFAULT_SECTIONS);

  useEffect(() => {
    api
      .get("/api/v1/content/terms")
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
            <FileText size={24} className="text-maroon-700" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-lexend text-gray-900">Terms of Service</h1>
          <p className="text-gray-500 font-manrope mt-3 text-sm sm:text-base max-w-xl mx-auto">
            Please read these terms carefully before using our website or making a purchase.
          </p>
          {isAdmin && (
            <Link
              to="/admin/content/terms"
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

        {/* Related links */}
        <div className="mt-8 bg-maroon-50 border border-maroon-100 rounded-2xl p-6 text-center">
          <p className="text-sm font-manrope text-gray-600 mb-4">Related policies you may want to review:</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/privacy"
              className="text-sm font-manrope font-semibold text-maroon-700 hover:underline"
            >
              Privacy Policy
            </Link>
            <span className="text-gray-300">·</span>
            <Link
              to="/returns"
              className="text-sm font-manrope font-semibold text-maroon-700 hover:underline"
            >
              Returns & Exchanges
            </Link>
            <span className="text-gray-300">·</span>
            <Link
              to="/shipping"
              className="text-sm font-manrope font-semibold text-maroon-700 hover:underline"
            >
              Shipping Info
            </Link>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-6 text-center">
          <p className="text-sm font-manrope text-gray-500">
            Questions about these terms?{" "}
            <a href="mailto:hello@urbanbird.co.ke" className="text-maroon-700 hover:underline font-semibold">
              hello@urbanbird.co.ke
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
