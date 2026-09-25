"use client";

import { type ReactNode, type Ref, useCallback, useMemo, useRef } from "react";
import type { CellIndex, SelectionOp } from "@/engine/types";
import { cn } from "@/lib/cn";
import type { SelectionStore } from "@/stores/selection-store";
import { Cell } from "./cell";
import { useBoardInput } from "./use-board-input";
import "./board.css";

export interface BoardProps {
  n: number;
  store: SelectionStore;
  /**
   * Target pattern. Cells get `data-lit` while this is set; they only show
   * lit when the board root has `data-reveal="true"`, which the exposure
   * runner flips imperatively. React never renders `data-reveal`.
   */
  pattern?: readonly CellIndex[] | null;
  /** Accept pointer/keyboard selection (recall). */
  interactive?: boolean;
  swipe?: boolean;
  haptics?: boolean;
  /** Lock touch gestures (scroll/zoom) on the board. Default true. */
  lockGestures?: boolean;
  /** Hide from assistive tech (memorize: the task is inherently visual). */
  ariaHidden?: boolean;
  label: string;
  onToggle?: (cell: CellIndex, op: SelectionOp, t: number) => void;
  onReject?: () => void;
  /** Rendered over the board centre in a fixed box (countdown digits). */
  overlay?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const noop = () => {};

/**
 * The grid. The same component is used by the session, the landing demo, the
 * setup preview and /lab — there is no second, "fake" board.
 *
 * Structure: role=grid → role=row (display: contents) → role=gridcell, so the
 * ARIA tree is correct while the cells lay out in one CSS grid.
 */
export function Board({
  n,
  store,
  pattern = null,
  interactive = false,
  swipe = true,
  haptics = true,
  lockGestures = true,
  ariaHidden = false,
  label,
  onToggle = noop,
  onReject,
  overlay,
  className,
  ref,
}: BoardProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);

  // Merge the caller's ref with ours (the input hook needs the element).
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      innerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  useBoardInput(innerRef, {
    n,
    store,
    enabled: interactive,
    swipe,
    haptics,
    onToggle,
    ...(onReject ? { onReject } : {}),
  });

  const lit = useMemo(() => new Set(pattern ?? []), [pattern]);

  const rows = useMemo(() => {
    const out: number[][] = [];
    for (let r = 0; r < n; r++) out.push(Array.from({ length: n }, (_, c) => r * n + c));
    return out;
  }, [n]);

  return (
    <div
      ref={setRef}
      role="grid"
      aria-label={label}
      aria-hidden={ariaHidden || undefined}
      aria-multiselectable={interactive || undefined}
      aria-readonly={!interactive || undefined}
      className={cn("board", className)}
      data-interactive={interactive}
      data-gestures={lockGestures ? "locked" : "free"}
      style={{ "--n": n } as React.CSSProperties}
    >
      {rows.map((row) => (
        // biome-ignore lint/a11y/useFocusableInteractive: rows are structural; focus lives on cells (roving tabindex).
        <div key={row[0]} role="row" className="board-row">
          {row.map((i) => (
            <Cell
              key={i}
              index={i}
              n={n}
              store={store}
              lit={lit.has(i)}
              interactive={interactive}
            />
          ))}
        </div>
      ))}
      {overlay !== undefined && (
        <div className="board-overlay" aria-hidden="true">
          {overlay}
        </div>
      )}
    </div>
  );
}
