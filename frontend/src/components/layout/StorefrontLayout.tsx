import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../header/Header";
import Footer from "../footer/Footer";
import CartDrawer from "../cart/CartDrawer";
import MobileBottomNav from "../header/MobileBottomNav";
import NewsletterPopup from "../NewsletterPopup";

const WA_MESSAGE = encodeURIComponent("Hello Urban Bird! I'd like some help with my order.");
const WA_CONTACTS = [
  { name: "Edwin", number: "254799075061" },
  { name: "June", number: "254745651659" },
];

const WhatsAppSVG = () => (
  <svg viewBox="0 0 32 32" width="28" height="28" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2C8.28 2 2 8.28 2 16c0 2.44.65 4.73 1.78 6.72L2 30l7.52-1.74A13.93 13.93 0 0 0 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.5a11.44 11.44 0 0 1-5.83-1.6l-.42-.25-4.46 1.03 1.06-4.34-.28-.45A11.47 11.47 0 0 1 4.5 16C4.5 9.6 9.6 4.5 16 4.5S27.5 9.6 27.5 16 22.4 27.5 16 27.5zm6.3-8.57c-.34-.17-2.02-1-2.34-1.11-.31-.11-.54-.17-.77.17-.23.34-.88 1.11-1.08 1.34-.2.23-.4.26-.74.09-.34-.17-1.44-.53-2.74-1.69-1.01-.9-1.7-2.02-1.9-2.36-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.09-.17-.77-1.86-1.06-2.55-.28-.67-.56-.58-.77-.59h-.66c-.23 0-.6.09-.91.43-.31.34-1.2 1.17-1.2 2.86s1.23 3.32 1.4 3.55c.17.23 2.42 3.7 5.87 5.19.82.35 1.46.56 1.96.72.82.26 1.57.22 2.16.13.66-.1 2.02-.83 2.31-1.62.28-.8.28-1.48.2-1.62-.09-.14-.31-.23-.65-.4z"/>
  </svg>
);

export default function StorefrontLayout() {
  const [waOpen, setWaOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
      <CartDrawer />
      <NewsletterPopup />

      {/* WhatsApp floating button */}
      <div className="fixed bottom-[calc(3.75rem+0.75rem)] right-4 lg:bottom-6 lg:right-6 z-[60] flex flex-col items-end gap-2">
        {waOpen && (
          <div className="bg-white rounded-xl shadow-xl p-3 flex flex-col gap-2 mb-1 min-w-[180px]">
            <p className="text-xs font-semibold text-gray-500 px-1">Chat with us</p>
            {WA_CONTACTS.map(({ name, number }) => (
              <a
                key={number}
                href={`https://wa.me/${number}?text=${WA_MESSAGE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium text-gray-800"
              >
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#25D366" }}>
                  {name[0]}
                </span>
                {name}
              </a>
            ))}
          </div>
        )}
        <button
          onClick={() => setWaOpen((v) => !v)}
          aria-label="Chat with us on WhatsApp"
          className="rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
          style={{ backgroundColor: "#25D366", width: 52, height: 52 }}
        >
          <WhatsAppSVG />
        </button>
      </div>
    </div>
  );
}
