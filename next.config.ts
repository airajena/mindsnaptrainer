import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // ~12 KB of Tailwind CSS inlined in <head>: removes the render-blocking
    // stylesheet round-trips that delayed LCP for first-time visitors (D27).
    inlineCss: true,
  },
};

export default nextConfig;
