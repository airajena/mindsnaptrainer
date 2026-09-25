"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import type { CellIndex, SelectionOp } from "@/engine/types";
import { Board } from "@/features/board/board";
import {
  createSelectionStore,
  resetSelection,
  type SelectionStore,
  setCell,
} from "@/stores/selection-store";
import { mean, percentile } from "./stats";

const N = 8;

/**
 * Tap latency: from the pointer event's timeStamp to the start of rendering
 * of the frame that contains the change (performance.now() inside the next
 * rAF callback, which runs right before style/layout/paint of that frame).
 * Event Timing entries (Chromium) add the browser's own "input → next paint"
 * figure for any interaction slower than 16 ms.
 */
export function LatencyMeter() {
  const store = useMemo(() => createSelectionStore(N), []);
  const latencies = useRef<number[]>([]);
  const [view, setView] = useState<number[]>([]);
  const [slowEvents, setSlowEvents] = useState<number[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A tap must re-render one cell and nothing else, or we'd be measuring the
  // bench instead of the board: the toggle handler is stable (so <Board>
  // never re-renders), the selected count lives in its own tiny subscriber,
  // and the stats panel refresh is debounced until tapping stops.
  const onToggle = useCallback(
    (cell: CellIndex, op: SelectionOp, t: number) => {
      setCell(store, cell, op === "add");
      requestAnimationFrame(() => {
        latencies.current.push(performance.now() - t);
        if (flushTimer.current) clearTimeout(flushTimer.current);
        flushTimer.current = setTimeout(() => {
          setView([...latencies.current]);
          window.__lab = { ...window.__lab, latency: [...latencies.current] };
        }, 300);
      });
    },
    [store],
  );

  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;
    if (!PerformanceObserver.supportedEntryTypes?.includes("event")) return;
    const po = new PerformanceObserver((list) => {
      const durations = list
        .getEntries()
        .filter((e) => e.name === "pointerdown" || e.name === "keydown")
        .map((e) => e.duration);
      if (durations.length) setSlowEvents((prev) => [...prev, ...durations]);
    });
    po.observe({ type: "event", durationThreshold: 16, buffered: true } as PerformanceObserverInit);
    return () => po.disconnect();
  }, []);

  const f = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : "—");
  const rows: [string, string][] = [
    ["Samples", `${view.length}`],
    ["p50", `${f(percentile(view, 50))} ms`],
    ["p95", `${f(percentile(view, 95))} ms`],
    ["Mean / max", `${f(mean(view))} / ${f(view.length ? Math.max(...view) : Number.NaN)} ms`],
    [
      "Event Timing ≥ 16 ms",
      `${slowEvents.length}${slowEvents.length ? ` (max ${f(Math.max(...slowEvents))} ms)` : ""}`,
    ],
  ];

  return (
    <section aria-labelledby="latency-h" className="flex flex-col gap-4">
      <h2 id="latency-h" className="text-h2">
        Tap latency
      </h2>
      <p className="prose-width text-small text-text-muted">
        Tap and swipe on the board. Taps toggle on touch-down; drags paint in the mode set by the
        first cell.
      </p>
      <div className="lab-board-slot">
        <Board n={N} store={store} interactive label="Latency test board" onToggle={onToggle} />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          className="h-11 rounded-button border border-border bg-surface-2 px-5 font-medium"
          onClick={() => {
            resetSelection(store, N);
            latencies.current = [];
            setView([]);
            setSlowEvents([]);
          }}
        >
          Reset
        </button>
      </div>
      <dl
        className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-small"
        data-testid="latency-stats"
      >
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-text-muted">{k}</dt>
            <dd className="font-mono tabular">{v}</dd>
          </div>
        ))}
        <dt className="text-text-muted">Selected</dt>
        <dd className="font-mono tabular">
          <SelectedCount store={store} />
        </dd>
      </dl>
    </section>
  );
}

function SelectedCount({ store }: { store: SelectionStore }) {
  return useStore(store, (s) => s.selected.reduce((n, v) => (v ? n + 1 : n), 0));
}
