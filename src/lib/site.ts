export const SITE = {
  name: "MindSnap Trainer",
  title: "MindSnap Trainer — train your visual memory",
  description:
    "A pattern flashes. It disappears. You rebuild it. Frame-accurate timing, adaptive training and honest stats. No account, nothing leaves your device.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // Mirrors --bg in src/styles/tokens.css; metadata can't read CSS variables.
  themeColor: "#08090b",
} as const;
