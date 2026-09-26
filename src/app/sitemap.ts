import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/train", "/progress", "/privacy"].map((path) => ({ url: `${SITE.url}${path}` }));
}
