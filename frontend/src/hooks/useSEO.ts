import { useEffect } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | null;
}

const SITE_NAME = "Urban Bird";
const SITE_URL = "https://urbanbird.co.ke";
const DEFAULT_DESC =
  "Kenya's premier urban streetwear brand. Hoodies, sweatpants, jackets & accessories. Free delivery on orders above KSh 5,000.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = url;
}

function setJsonLd(data: Record<string, unknown> | null) {
  let el = document.querySelector("script[data-seo-ld]") as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo-ld", "");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function toAbsoluteUrl(path?: string): string {
  if (!path) return DEFAULT_IMAGE;
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function useSEO({
  title,
  description,
  image,
  url,
  type = "website",
  noindex = false,
  jsonLd = null,
}: SEOOptions) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | ${SITE_NAME}`
      : `${SITE_NAME} — Premium Urban Streetwear Kenya`;
    const desc = description || DEFAULT_DESC;
    const imgUrl = toAbsoluteUrl(image);
    const pageUrl = url
      ? toAbsoluteUrl(url)
      : `${SITE_URL}${window.location.pathname}`;

    document.title = fullTitle;

    setMeta("description", desc);
    setMeta("robots", noindex ? "noindex,nofollow" : "index,follow");

    // Canonical
    setCanonical(pageUrl);

    // Open Graph
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:type", type, "property");
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:image", imgUrl, "property");
    setMeta("og:image:width", "1200", "property");
    setMeta("og:image:height", "630", "property");
    setMeta("og:image:alt", fullTitle, "property");
    setMeta("og:url", pageUrl, "property");

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:site", "@urbanbird_ke");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", imgUrl);
    setMeta("twitter:image:alt", fullTitle);

    // JSON-LD structured data
    setJsonLd(jsonLd);

    return () => {
      document.title = `${SITE_NAME} — Premium Urban Streetwear Kenya`;
      setMeta("robots", "index,follow");
      setJsonLd(null);
    };
  }, [title, description, image, url, type, noindex, jsonLd]);
}
