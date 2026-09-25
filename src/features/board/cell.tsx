"use client";

import { memo } from "react";
import { useStore } from "zustand";
import type { SelectionStore } from "@/stores/selection-store";

interface CellProps {
  index: number;
  n: number;
  store: SelectionStore;
  /** Part of the target pattern (only rendered while the pattern is loaded). */
  lit: boolean;
  interactive: boolean;
}

/**
 * One cell. Memoised and subscribed to its own slice of the selection store,
 * so a toggle re-renders this cell only — not the other 63 (or 143).
 * Labels are positional only: they never reveal lit state (PRD §14).
 */
export const Cell = memo(function Cell({ index, n, store, lit, interactive }: CellProps) {
  const selected = useStore(store, (s) => s.selected[index] ?? false);
  const focused = useStore(store, (s) => s.focus === index);
  const row = Math.floor(index / n) + 1;
  const col = (index % n) + 1;

  return (
    <div
      role="gridcell"
      className="cell"
      data-cell={index}
      data-lit={lit ? "" : undefined}
      data-selected={selected ? "" : undefined}
      aria-selected={interactive ? selected : undefined}
      aria-label={`Row ${row}, column ${col}`}
      // Roving tabindex: only the focused cell is in the tab order.
      tabIndex={interactive && focused ? 0 : -1}
    />
  );
});
