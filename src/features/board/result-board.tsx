import { useMemo } from "react";
import type { CellIndex } from "@/engine/types";
import { cn } from "@/lib/cn";
import "./board.css";

export type ResultView = "overlay" | "yours" | "actual";

type CellState = "hit" | "miss" | "false" | "on" | "off";

/**
 * Static comparison board for results. Overlay uses shape + colour, never
 * colour alone (PRD §11.6): hit = solid accent, miss = dashed amber ring,
 * false tap = coral cell with an ✕.
 */
export function ResultBoard({
  n,
  pattern,
  selection,
  view,
  label,
  className,
}: {
  n: number;
  pattern: readonly CellIndex[];
  selection: readonly CellIndex[];
  view: ResultView;
  label: string;
  className?: string;
}) {
  const states = useMemo(() => {
    const t = new Set(pattern);
    const s = new Set(selection);
    return Array.from({ length: n * n }, (_, i): CellState => {
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
  }, [n, pattern, selection, view]);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("board result-board", className)}
      data-gestures="free"
      style={{ "--n": n } as React.CSSProperties}
    >
      {states.map((state, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional and fixed.
        <div key={i} className="cell" data-state={state}>
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
