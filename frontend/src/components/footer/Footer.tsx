import { Link } from "react-router-dom";
import { Instagram, Facebook, Twitter, Phone, Mail, MapPin } from "lucide-react";
import Logo from "../header/Logo";

// Inline SVGs for platforms not in lucide-react
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/>
  </svg>
);

const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container-custom py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
          {/* Brand */}
          <div>
            <Logo variant="light" className="text-2xl mb-4" />
            <p className="text-sm leading-relaxed text-gray-400">
              Kenya's premier urban streetwear brand. Quality hoodies, sweatpants, jackets and accessories for the modern African.
            </p>
            <div className="flex items-center gap-3 mt-5 flex-wrap">
              {[
                { href: "https://instagram.com/urbanbird.ke", Icon: Instagram, label: "Instagram" },
                { href: "https://facebook.com/urbanbird.ke", Icon: Facebook, label: "Facebook" },
                { href: "https://twitter.com/urbanbird_ke", Icon: Twitter, label: "Twitter" },
                { href: "https://tiktok.com/@urbanbird.ke", Icon: TikTokIcon, label: "TikTok" },
                { href: "https://pinterest.com/urbanbird_ke", Icon: PinterestIcon, label: "Pinterest" },
                { href: "https://wa.me/254700000000", Icon: WhatsAppIcon, label: "WhatsApp" },
              ].map(({ href, Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-maroon-700 transition-colors"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-semibold font-lexend mb-4">Shop</h4>
            <ul className="space-y-2.5">
              {[
                { to: "/category/men", label: "Men" },
                { to: "/category/women", label: "Women" },
                { to: "/category/kids", label: "Kids" },
                { to: "/shop?sort=latest", label: "New Arrivals" },
                { to: "/shop?on_sale=true", label: "Sale" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-gray-400 hover:text-white transition-colors font-manrope"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-white font-semibold font-lexend mb-4">Help</h4>
            <ul className="space-y-2.5">
              {[
                { to: "/track-order", label: "Track My Order" },
                { to: "/account", label: "My Account" },
                { to: "/faq", label: "FAQ" },
                { to: "/returns", label: "Returns & Exchanges" },
                { to: "/shipping", label: "Shipping Info" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-gray-400 hover:text-white transition-colors font-manrope"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold font-lexend mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-gray-400 font-manrope">
                <Phone size={15} className="text-maroon-400 flex-shrink-0" />
                +254 700 000 000
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400 font-manrope">
                <Mail size={15} className="text-maroon-400 flex-shrink-0" />
                hello@urbanbird.co.ke
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-400 font-manrope">
                <MapPin size={15} className="text-maroon-400 flex-shrink-0 mt-0.5" />
                Nairobi, Kenya
              </li>
            </ul>

            {/* Payment methods */}
            <div className="mt-6">
              <p className="text-xs text-gray-500 font-manrope mb-2">We accept</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-white/10 px-2 py-1 rounded font-manrope">M-Pesa</span>
                <span className="text-xs bg-white/10 px-2 py-1 rounded font-manrope">Visa</span>
                <span className="text-xs bg-white/10 px-2 py-1 rounded font-manrope">Mastercard</span>
                <span className="text-xs bg-white/10 px-2 py-1 rounded font-manrope">COD</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-custom py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500 font-manrope">
            © {new Date().getFullYear()} Urban Bird. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-xs text-gray-500 hover:text-gray-300 font-manrope transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs text-gray-500 hover:text-gray-300 font-manrope transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
