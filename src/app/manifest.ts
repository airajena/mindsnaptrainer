import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand-colors";
import { SITE } from "@/lib/site";

// Full offline PWA (service worker, maskable PNGs) is V1.1; this makes the
// app installable-friendly and themes the browser chrome now.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "MindSnap",
    description: SITE.description,
    start_url: "/train",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: BRAND.bg,
    theme_color: BRAND.bg,
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
