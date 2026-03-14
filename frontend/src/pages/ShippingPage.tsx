import { useEffect, useState } from "react";
import { Truck, MapPin, Clock, Package, CheckCircle, Loader2 } from "lucide-react";
import api from "../services/api";
import { formatKSh } from "../utils/formatPrice";
import { useSEO } from "../hooks/useSEO";

interface ShippingRate {
  method: string;
  price: number;
  free_above: number | null;
  estimated_days_min: number;
  estimated_days_max: number;
}

interface ShippingZone {
  id: string;
  name: string;
  counties: string[];
  rates: ShippingRate[];
}

function DeliveryDays({ min, max }: { min: number; max: number }) {
  if (min === max) return <span>{min} business day{min !== 1 ? "s" : ""}</span>;
  return <span>{min}–{max} business days</span>;
}

export default function ShippingPage() {
  useSEO({
    title: "Shipping Info",
    description: "Learn about Urban Bird's shipping rates and delivery times across Kenya.",
  });

  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/v1/shipping/zones")
      .then((r) => setZones(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-maroon-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck size={24} className="text-maroon-700" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-lexend text-gray-900">Shipping Info</h1>
          <p className="text-gray-500 font-manrope mt-3 text-sm sm:text-base max-w-xl mx-auto">
            We deliver to all counties in Kenya. Rates and delivery times vary by location.
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Truck, title: "Nationwide Delivery", desc: "All 47 counties in Kenya" },
            { icon: Clock, title: "Fast Dispatch", desc: "Orders packed within 24 hours" },
            { icon: CheckCircle, title: "Free Delivery", desc: "On orders above KSh 5,000 in Nairobi" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-maroon-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-maroon-700" />
              </div>
              <div>
                <p className="text-sm font-semibold font-lexend text-gray-900">{title}</p>
                <p className="text-xs font-manrope text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Shipping Rates Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <h2 className="text-base font-bold font-lexend text-gray-900">Delivery Rates by Region</h2>
            <p className="text-xs font-manrope text-gray-400 mt-0.5">Rates are calculated at checkout based on your county.</p>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-gray-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : zones.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400 font-manrope">
              Shipping rates are being updated. Please check back shortly.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {zones.map((zone) => (
                <div key={zone.id} className="px-6 py-5">
                  <div className="flex items-start gap-3 mb-3">
                    <MapPin size={15} className="text-maroon-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold font-lexend text-gray-900">{zone.name}</p>
                      {zone.counties.length > 0 && (
                        <p className="text-xs font-manrope text-gray-400 mt-0.5">
                          {zone.counties.slice(0, 8).join(", ")}
                          {zone.counties.length > 8 ? ` +${zone.counties.length - 8} more` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  {zone.rates.length > 0 ? (
                    <div className="ml-6 space-y-2">
                      {zone.rates.map((rate, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 rounded-xl px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold font-manrope text-gray-900">{rate.method}</p>
                            <p className="text-xs font-manrope text-gray-400 mt-0.5 flex items-center gap-1">
                              <Clock size={11} />
                              <DeliveryDays min={rate.estimated_days_min} max={rate.estimated_days_max} />
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold font-manrope text-maroon-700">
                              {rate.price === 0 ? "Free" : formatKSh(rate.price)}
                            </p>
                            {rate.free_above && rate.price > 0 && (
                              <p className="text-xs font-manrope text-green-600 mt-0.5">
                                Free above {formatKSh(rate.free_above)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="ml-6 text-xs font-manrope text-gray-400 italic">Contact us for rates in this area.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-bold font-lexend text-gray-900 mb-4">Important Information</h2>
          <ul className="space-y-3">
            {[
              "Orders placed before 12:00 PM (EAT) on business days are dispatched the same day.",
              "Delivery times are estimates and may vary during public holidays and peak seasons.",
              "You'll receive a notification when your order is shipped, including a tracking number if available.",
              "Our delivery team will call you before delivering. Please ensure your phone is reachable.",
              "If you're not available at the time of delivery, our courier will attempt re-delivery or contact you to arrange an alternative.",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm font-manrope text-gray-600">
                <CheckCircle size={15} className="text-maroon-400 flex-shrink-0 mt-0.5" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Cash on Delivery */}
        <div className="bg-maroon-50 border border-maroon-100 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-maroon-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package size={18} className="text-maroon-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-lexend text-gray-900 mb-1">Cash on Delivery (COD)</h3>
              <p className="text-sm font-manrope text-gray-600 leading-relaxed">
                COD is available for eligible locations. Pay in cash when your order arrives. Please have the exact amount ready — our riders do not carry change. COD availability is confirmed at checkout based on your delivery location.
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center">
          <p className="text-sm font-manrope text-gray-500">
            Questions about your delivery?{" "}
            <a href="mailto:hello@urbanbird.co.ke" className="text-maroon-700 hover:underline font-semibold">
              hello@urbanbird.co.ke
            </a>{" "}
            or{" "}
            <a
              href="https://wa.me/254799075061"
              target="_blank"
              rel="noopener noreferrer"
              className="text-maroon-700 hover:underline font-semibold"
            >
              WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
