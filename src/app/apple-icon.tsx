import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand-colors";
import { GridArt } from "./grid-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.bg,
      }}
    >
      <GridArt n={3} lit={new Set([0, 4, 5, 8])} size={120} gap={10} radius={10} />
    </div>,
    size,
  );
}
