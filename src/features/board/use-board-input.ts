"use client";

import { type RefObject, useEffect, useRef } from "react";
import type { CellIndex, SelectionOp } from "@/engine/types";
import { haptics } from "@/platform/haptics";
import { isSelected, type SelectionStore } from "@/stores/selection-store";
import { type BoardGeometry, cellsOnLine, hitTest, moveFocus } from "./geometry";

export interface BoardInputOptions {
  n: number;
  store: SelectionStore;
  /** Input is only accepted while true (recall). Read at event time, not bound. */
  enabled: boolean;
  swipe: boolean;
  haptics: boolean;
  /**
   * Request a toggle. The owner applies it (to the engine and/or the store).
   * `t` is the event's timeStamp (same clock as rAF / performance.now).
   */
  onToggle: (cell: CellIndex, op: SelectionOp, t: number) => void;
  /** An add was refused (selection limit). */
  onReject?: () => void;
}

/**
 * Pointer + keyboard input for the board (TECH_PLAN §8.3).
 *
 * - One delegated listener set on the board root, attached natively so
 *   `pointerdown` can be non-passive: React's synthetic listeners can't
 *   reliably `preventDefault` touch gestures on iOS.
 * - Toggles on pointer-DOWN (click fires on release and feels laggy).
 * - Pointer capture keeps the drag on the board even if the finger leaves it.
 * - The first cell of a drag fixes add-vs-remove for the whole drag.
 * - Coalesced events + line fill so fast swipes don't skip cells.
 * - Only the primary pointer counts: a second finger can't multi-select.
 * - No layout reads in pointermove: the rect is cached once per gesture.
 */
export function useBoardInput(boardRef: RefObject<HTMLElement | null>, options: BoardInputOptions) {
  // Latest options without re-binding listeners on every render.
  const opts = useRef(options);
  opts.current = options;

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    let geo: BoardGeometry | null = null;
    let last: CellIndex = -1;
    let mode: SelectionOp = "add";
    let activePointer = -1;
    let pressed: Element | null = null;

    const cellEl = (cell: CellIndex) => board.querySelector(`[data-cell="${cell}"]`);

    const setPressed = (el: Element | null) => {
      pressed?.removeAttribute("data-pressed");
      pressed = el;
      pressed?.setAttribute("data-pressed", "");
    };

    /** Applies one toggle if the cell isn't already in the drag's target state. */
    const apply = (cell: CellIndex, t: number) => {
      const o = opts.current;
      const want = mode === "add";
      if (isSelected(o.store, cell) === want) return;
      o.onToggle(cell, mode, t);
      if (isSelected(o.store, cell) === want) {
        if (o.haptics && want) haptics.tick();
      } else if (want) {
        // Owner refused the add → selection limit reached.
        if (o.haptics) haptics.reject();
        o.onReject?.();
      }
    };

    const measure = (): BoardGeometry => {
      const rect = board.getBoundingClientRect();
      const gap = Number.parseFloat(getComputedStyle(board).columnGap) || 0;
      return { left: rect.left, top: rect.top, size: rect.width, gap, n: opts.current.n };
    };

    const onPointerDown = (e: PointerEvent) => {
      const o = opts.current;
      if (!o.enabled || !e.isPrimary || e.button > 0) return;
      // Blocks text selection, focus steal, compat mouse events and (with
      // touch-action: none) any gesture starting on the board.
      e.preventDefault();
      geo = measure();
      const cell = hitTest(e.clientX, e.clientY, geo);
      if (cell < 0) return;
      activePointer = e.pointerId;
      try {
        board.setPointerCapture(e.pointerId);
      } catch {
        // Capture can fail if the pointer is already gone; the tap still counts.
      }
      mode = isSelected(o.store, cell) ? "remove" : "add";
      apply(cell, e.timeStamp);
      last = cell;
      setPressed(cellEl(cell));
    };

    const onPointerMove = (e: PointerEvent) => {
      const o = opts.current;
      if (e.pointerId !== activePointer || last < 0 || !geo) return;
      if (!o.enabled || !o.swipe) return;
      const samples = e.getCoalescedEvents?.() ?? [];
      for (const ev of samples.length > 0 ? samples : [e]) {
        const cell = hitTest(ev.clientX, ev.clientY, geo);
        if (cell < 0 || cell === last) continue;
        for (const c of cellsOnLine(last, cell, o.n)) apply(c, ev.timeStamp);
        last = cell;
        setPressed(cellEl(cell));
      }
    };

    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerId !== activePointer) return;
      activePointer = -1;
      last = -1;
      geo = null;
      setPressed(null);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const o = opts.current;
      if (!o.enabled) return;
      const { focus } = o.store.getState();
      if (e.key === " " || e.key === "Enter") {
        // Enter on the board toggles; Enter elsewhere submits (handled by the session).
        e.preventDefault();
        e.stopPropagation();
        mode = isSelected(o.store, focus) ? "remove" : "add";
        apply(focus, e.timeStamp);
        return;
      }
      const next = moveFocus(focus, e.key, o.n);
      if (next !== focus || e.key.startsWith("Arrow")) e.preventDefault();
      if (next === focus) return;
      o.store.setState({ focus: next });
      (cellEl(next) as HTMLElement | null)?.focus();
    };

    const prevent = (e: Event) => e.preventDefault();
    const preventWhileEnabled = (e: Event) => {
      if (opts.current.enabled) e.preventDefault();
    };

    board.addEventListener("pointerdown", onPointerDown, { passive: false });
    board.addEventListener("pointermove", onPointerMove);
    board.addEventListener("pointerup", onPointerEnd);
    board.addEventListener("pointercancel", onPointerEnd);
    board.addEventListener("lostpointercapture", onPointerEnd);
    board.addEventListener("keydown", onKeyDown);
    board.addEventListener("contextmenu", prevent);
    // Belt and braces for iOS Safari, which can still start a gesture from touchstart.
    board.addEventListener("touchstart", preventWhileEnabled, { passive: false });
    board.addEventListener("dragstart", prevent);

    return () => {
      board.removeEventListener("pointerdown", onPointerDown);
      board.removeEventListener("pointermove", onPointerMove);
      board.removeEventListener("pointerup", onPointerEnd);
      board.removeEventListener("pointercancel", onPointerEnd);
      board.removeEventListener("lostpointercapture", onPointerEnd);
      board.removeEventListener("keydown", onKeyDown);
      board.removeEventListener("contextmenu", prevent);
      board.removeEventListener("touchstart", preventWhileEnabled);
      board.removeEventListener("dragstart", prevent);
      setPressed(null);
    };
  }, [boardRef]);
}
