import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand-colors";
import { GridArt } from "./grid-image";

export const alt = "MindSnap Trainer — a pattern flashes on an 8×8 grid; you rebuild it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A fixed 18-cell pattern on an 8×8 board: the product in one picture.
const LIT = new Set([1, 4, 9, 13, 18, 22, 26, 27, 33, 36, 38, 41, 45, 50, 53, 57, 60, 62]);

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: BRAND.bg,
        padding: 72,
        alignItems: "center",
        justifyContent: "space-between",
        gap: 64,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 560 }}>
        <div
          style={{
            color: BRAND.accent,
            fontSize: 24,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Visual memory trainer
        </div>
        <div
          style={{
            color: BRAND.text,
            fontSize: 64,
            lineHeight: 1.05,
            fontWeight: 600,
            letterSpacing: -2,
          }}
        >
          One second. Eighteen squares. Remember them all.
        </div>
        <div style={{ color: BRAND.textMuted, fontSize: 28 }}>
          Frame-accurate · No sign-up · On-device
        </div>
      </div>
      <GridArt n={8} lit={LIT} size={440} gap={10} radius={9} />
    </div>,
    size,
  );
}
