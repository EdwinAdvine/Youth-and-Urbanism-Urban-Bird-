import { useEffect } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product";
}

const SITE_NAME = "Urban Bird";
const DEFAULT_DESC = "Kenya's premier urban streetwear brand. Free delivery on orders above KSh 5,000.";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function useSEO({ title, description, image, url, type = "website" }: SEOOptions) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Premium Urban Streetwear Kenya`;
    const desc = description || DEFAULT_DESC;

    document.title = fullTitle;
    setMeta("description", desc);

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", type, "property");
    if (image) setMeta("og:image", image, "property");
    if (url) setMeta("og:url", url, "property");

    // Twitter
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", desc);
    if (image) setMeta("twitter:image", image);

    // Restore on unmount
    return () => {
      document.title = `${SITE_NAME} — Premium Urban Streetwear Kenya`;
    };
  }, [title, description, image, url, type]);
}
