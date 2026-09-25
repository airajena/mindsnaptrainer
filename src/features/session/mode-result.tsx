import type { ModeSummary, RoundResult } from "@/engine/types";

/** Mode-specific block in the summary. Fixed mode has none; tests add their threshold + staircase (M6). */
export function ModeResult({ summary }: { summary: ModeSummary; results: readonly RoundResult[] }) {
  switch (summary.kind) {
    case "fixed":
      return null;
    default:
      return null;
  }
}
