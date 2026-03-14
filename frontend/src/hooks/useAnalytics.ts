/**
 * Loads GA4 and Meta Pixel scripts from IDs stored in site settings.
 * Call once at the app root. Fires tracking events via window.gtag / window.fbq.
 */
import { useEffect } from "react";
import api from "../services/api";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

let analyticsLoaded = false;

function loadGA4(measurementId: string) {
  if (!measurementId || document.getElementById("ga4-script")) return;
  const s = document.createElement("script");
  s.id = "ga4-script";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer!.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: true });
}

function loadMetaPixel(pixelId: string) {
  if (!pixelId || document.getElementById("meta-pixel-script")) return;
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.id = "meta-pixel-script"; t.async = true;
    t.src = v; s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq?.("init", pixelId);
  window.fbq?.("track", "PageView");
}

export function useAnalytics() {
  useEffect(() => {
    if (analyticsLoaded) return;
    analyticsLoaded = true;
    api.get("/api/v1/admin/settings/public")
      .then((r) => {
        const ga4 = r.data.ga4_measurement_id;
        const pixel = r.data.meta_pixel_id;
        if (ga4) loadGA4(ga4);
        if (pixel) loadMetaPixel(pixel);
      })
      .catch(() => {});
  }, []);
}

/** Track a custom event on both GA4 and Meta Pixel */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  window.gtag?.("event", eventName, params);
  window.fbq?.("track", eventName, params);
}

/** Standard e-commerce events */
export const analytics = {
  addToCart: (productName: string, price: number, currency = "KES") => {
    window.gtag?.("event", "add_to_cart", { currency, value: price, items: [{ item_name: productName, price }] });
    window.fbq?.("track", "AddToCart", { content_name: productName, value: price, currency });
  },
  beginCheckout: (value: number, currency = "KES") => {
    window.gtag?.("event", "begin_checkout", { currency, value });
    window.fbq?.("track", "InitiateCheckout", { value, currency });
  },
  purchase: (orderId: string, value: number, currency = "KES") => {
    window.gtag?.("event", "purchase", { transaction_id: orderId, currency, value });
    window.fbq?.("track", "Purchase", { value, currency });
  },
  viewProduct: (productName: string, price: number, currency = "KES") => {
    window.gtag?.("event", "view_item", { currency, value: price, items: [{ item_name: productName, price }] });
    window.fbq?.("track", "ViewContent", { content_name: productName, value: price, currency });
  },
};
