import type { ModeSummary, RoundResult } from "@/engine/types";
import { StaircaseChart } from "@/features/progress/charts/staircase-chart";
import { formatNumber, formatSeconds } from "@/lib/format";

/**
 * Test-mode result (PRD §11.7): the threshold ("Capacity at 1.0 s: 16.5 ± 0.8")
 * and the staircase chart. Fixed mode has no block.
 */
export function ModeResult({ summary }: { summary: ModeSummary; results: readonly RoundResult[] }) {
  switch (summary.kind) {
    case "fixed":
      return null;
    case "capacity":
      return (
        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <h2 className="label-caps text-label text-text-muted">
            Capacity at {formatSeconds(summary.exposureMs, 1)}
          </h2>
          <Threshold
            value={summary.threshold === null ? null : formatNumber(summary.threshold)}
            spread={summary.spread === null ? null : formatNumber(summary.spread)}
            unit="cells"
          />
          <StaircaseChart
            track={summary.track}
            reversalIndexes={summary.reversalIndexes}
            threshold={summary.threshold}
            format={(v) => formatNumber(v, 0)}
            label={`Cell count per round: ${summary.track.join(", ")}. Rings mark direction changes.`}
          />
          <Explainer />
        </section>
      );
    case "speed":
      return (
        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <h2 className="label-caps text-label text-text-muted">
            Speed threshold · {summary.cellCount} cells
          </h2>
          <Threshold
            value={summary.threshold === null ? null : String(summary.threshold)}
            spread={summary.spread === null ? null : String(summary.spread)}
            unit="ms"
          />
          <StaircaseChart
            track={summary.track}
            reversalIndexes={summary.reversalIndexes}
            threshold={summary.threshold}
            invert
            format={(v) => `${Math.round(v)}`}
            label={`Exposure per round in milliseconds: ${summary.track.join(", ")}. Rings mark direction changes.`}
          />
          <Explainer />
        </section>
      );
    default: {
      const never: never = summary;
      return never;
    }
  }
}

function Threshold({
  value,
  spread,
  unit,
}: {
  value: string | null;
  spread: string | null;
  unit: string;
}) {
  if (value === null) {
    return (
      <p className="text-text-muted">
        Not enough direction changes to estimate a stable number. Run the test again — it usually
        settles within 15–25 rounds.
      </p>
    );
  }
  return (
    <p className="font-mono text-h1 tabular">
      {value}
      {spread !== null && <span className="text-h2 text-text-faint"> ± {spread}</span>}
      <span className="ml-2 text-h2 text-text-muted">{unit}</span>
    </p>
  );
}

function Explainer() {
  return (
    <p className="text-small text-text-faint">
      The estimate is the average level at the last direction changes — where you pass about 70% of
      rounds. Up is harder.
    </p>
  );
}
