import type { CellIndex } from "@/engine/types";
import { cn } from "@/lib/cn";
import "./board.css";

export type ResultView = "overlay" | "yours" | "actual";

type CellState = "hit" | "miss" | "false" | "on" | "off";

/**
 * Static comparison board for results. Overlay uses shape + colour, never
 * colour alone (PRD §11.6): hit = solid accent, miss = dashed amber ring,
 * false tap = coral cell with an ✕.
 *
 * Hook-free, so it renders in Server Components too (landing page).
 */
export function ResultBoard({
  n,
  pattern,
  selection,
  view,
  label,
  className,
  indexVar = false,
}: {
  n: number;
  pattern: readonly CellIndex[];
  selection: readonly CellIndex[];
  view: ResultView;
  label: string;
  className?: string;
  /** Expose each cell's index as --i (for staggered decorative animations). */
  indexVar?: boolean;
}) {
  const t = new Set(pattern);
  const s = new Set(selection);
  const states = Array.from({ length: n * n }, (_, i): CellState => {
    switch (view) {
      case "overlay":
        if (t.has(i) && s.has(i)) return "hit";
        if (t.has(i)) return "miss";
        if (s.has(i)) return "false";
        return "off";
      case "yours":
        return s.has(i) ? "on" : "off";
      case "actual":
        return t.has(i) ? "on" : "off";
      default: {
        const never: never = view;
        return never;
      }
    }
  });

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("board result-board", className)}
      data-gestures="free"
      style={{ "--n": n } as React.CSSProperties}
    >
      {states.map((state, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional and fixed.
          key={i}
          className="cell"
          data-state={state}
          style={indexVar ? ({ "--i": i } as React.CSSProperties) : undefined}
        >
          {state === "false" && (
            <svg viewBox="0 0 10 10" aria-hidden="true" className="result-x">
              <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
