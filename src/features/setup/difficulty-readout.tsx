import { bitsPerSecond, informationBits } from "@/engine/difficulty";
import type { SessionConfig } from "@/engine/types";
import { formatSeconds } from "@/lib/format";

/** "8×8 · 18 cells · 1.00 s — 52 bits · 52 bits/s" (PRD §10). Tests show what varies. */
export function DifficultyReadout({ config }: { config: SessionConfig }) {
  const n = config.boardSize;
  if (config.modeId === "capacity") {
    return (
      <p className="font-mono text-small text-text-muted tabular" aria-live="polite">
        {n}×{n} · cells vary · {formatSeconds(config.exposureMs)} — finds your cell count
      </p>
    );
  }
  if (config.modeId === "speed") {
    return (
      <p className="font-mono text-small text-text-muted tabular" aria-live="polite">
        {n}×{n} · {config.cellCount} cells · time varies —{" "}
        {Math.round(informationBits(n, config.cellCount))} bits
      </p>
    );
  }
  const bits = informationBits(n, config.cellCount);
  const rate = bitsPerSecond(n, config.cellCount, config.exposureMs);
  return (
    <p className="font-mono text-small text-text-muted tabular" aria-live="polite">
      {n}×{n} · {config.cellCount} cells · {formatSeconds(config.exposureMs)} —{" "}
      <span className="text-text">{Math.round(bits)} bits</span> · {Math.round(rate)} bits/s
    </p>
  );
}
