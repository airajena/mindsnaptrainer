import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/site";
import { mono, sans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Content extends under notches; layouts pad with env(safe-area-inset-*).
  // Zoom stays enabled globally for accessibility — only the board blocks it
  // (via touch-action), per TECH_PLAN §11.
  viewportFit: "cover",
  themeColor: SITE.themeColor,
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // V1 ships dark only; data-theme is the seam for the V1.1 light theme.
    <html
      lang="en"
      data-theme="dark"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
