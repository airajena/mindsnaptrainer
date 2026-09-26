import localFont from "next/font/local";

/**
 * Geist, self-hosted via next/font (no third-party requests).
 *
 * Configured here rather than via the `geist` package's presets so we control
 * preloading: Sans is the LCP text's font, so it's preloaded with a
 * metric-matched fallback (no shift when it swaps in). Mono (numbers, board
 * labels) is not preloaded — above the fold on the landing it isn't needed,
 * and preloading 70 KB of it delayed LCP on slow connections (DECISIONS D27).
 */
export const sans = localFont({
  src: "./fonts/Geist-Latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});

export const mono = localFont({
  src: "./fonts/GeistMono-Latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});
