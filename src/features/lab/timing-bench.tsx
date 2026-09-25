"use client";

import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { generatePattern } from "@/engine/generator";
import { roundSeed } from "@/engine/rng";
import type { CellIndex, VoidReason } from "@/engine/types";
import { Board } from "@/features/board/board";
import { runTimedExposure } from "@/features/board/timed-exposure";
import { nextFrame, refreshRateHz } from "@/platform/frame-clock";
import { randomSeed } from "@/platform/seed";
import { createSelectionStore } from "@/stores/selection-store";
import { countBy, mean, percentile, stdDev } from "./stats";

export type TimingSample =
  | {
      kind: "done";
      targetMs: number;
      actualMs: number;
      frames: number;
      framePeriod: number;
      maxFrameGapMs: number;
      reliable: boolean;
    }
  | { kind: "void"; reason: VoidReason };

declare global {
  interface Window {
    __lab?: { timing?: { status: string; samples: TimingSample[] }; latency?: number[] };
  }
}

const N = 8;
const K = 18;

/**
 * Runs N exposures through the real pipeline (runTimedExposure → runExposure)
 * on the real Board and reports the distribution of measured exposure.
 */
export function TimingBench() {
  const boardRef = useRef<HTMLDivElement>(null);
  const store = useMemo(() => createSelectionStore(N), []);
  const abortRef = useRef<AbortController | null>(null);
  const [pattern, setPattern] = useState<CellIndex[] | null>(null);
  const [targetMs, setTargetMs] = useState(1000);
  const [runs, setRuns] = useState(100);
  const [samples, setSamples] = useState<TimingSample[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");

  async function start() {
    const board = boardRef.current;
    if (!board) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const seed = randomSeed();
    const out: TimingSample[] = [];
    setSamples([]);
    setStatus("running");
    window.__lab = { ...window.__lab, timing: { status: "running", samples: out } };

    for (let i = 0; i < runs && !controller.signal.aborted; i++) {
      const cells = generatePattern(
        { boardSize: N, cellCount: K, patternStyle: "uniform" },
        roundSeed(seed, i, 0),
      );
      // Commit data-lit synchronously so the DOM is ready before timing starts.
      flushSync(() => setPattern(cells));
      try {
        const res = await runTimedExposure({ board, targetMs, signal: controller.signal });
        out.push(
          res.kind === "done"
            ? {
                kind: "done",
                targetMs,
                actualMs: res.exposure.actualMs,
                frames: res.exposure.frames,
                framePeriod: res.framePeriod,
                maxFrameGapMs: res.exposure.maxFrameGapMs,
                reliable: res.exposure.reliable,
              }
            : { kind: "void", reason: res.reason },
        );
      } catch {
        break; // stopped
      }
      flushSync(() => setPattern(null));
      setSamples([...out]);
      await nextFrame();
    }
    setPattern(null);
    setStatus("done");
    window.__lab = { ...window.__lab, timing: { status: "done", samples: out } };
  }

  const done = samples.flatMap((s) => (s.kind === "done" ? [s] : []));
  const period = done.length ? mean(done.map((s) => s.framePeriod)) : Number.NaN;
  const errors = done.map((s) => s.actualMs - s.targetMs);
  const withinHalf = done.filter(
    (s) => Math.abs(s.actualMs - s.targetMs) <= s.framePeriod / 2 + 0.5,
  );
  const withinOne = done.filter((s) => Math.abs(s.actualMs - s.targetMs) <= s.framePeriod + 0.5);
  const pct = (xs: unknown[]) =>
    done.length ? `${((xs.length / done.length) * 100).toFixed(1)}%` : "—";
  const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "—");

  const rows: [string, string][] = [
    ["Runs", `${samples.length} / ${runs}`],
    ["Refresh", Number.isFinite(period) ? `${refreshRateHz(period)} Hz (${f(period, 2)} ms)` : "—"],
    ["Mean actual", `${f(mean(done.map((s) => s.actualMs)))} ms`],
    ["SD", `${f(stdDev(done.map((s) => s.actualMs)), 2)} ms`],
    [
      "Min / max",
      done.length
        ? `${f(Math.min(...done.map((s) => s.actualMs)))} / ${f(Math.max(...done.map((s) => s.actualMs)))} ms`
        : "—",
    ],
    [
      "|error| p50 / p95",
      `${f(percentile(errors.map(Math.abs), 50), 2)} / ${f(percentile(errors.map(Math.abs), 95), 2)} ms`,
    ],
    ["Within ±½ frame", pct(withinHalf)],
    ["Within ±1 frame", pct(withinOne)],
    ["Dropped-frame (unreliable)", `${done.filter((s) => !s.reliable).length}`],
    ["Voided (hidden/resize)", `${samples.length - done.length}`],
  ];

  const histogram = countBy(done.map((s) => s.frames));
  const maxCount = Math.max(1, ...histogram.map(([, c]) => c));

  return (
    <section aria-labelledby="timing-h" className="flex flex-col gap-4">
      <h2 id="timing-h" className="text-h2">
        Exposure timing
      </h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-small text-text-muted">
          Target (ms)
          <input
            type="number"
            min={150}
            max={5000}
            step={50}
            value={targetMs}
            onChange={(e) => setTargetMs(Number(e.target.value))}
            className="h-11 w-28 rounded-button border border-border bg-surface-2 px-3 font-mono text-text tabular"
            disabled={status === "running"}
          />
        </label>
        <label className="flex flex-col gap-1 text-small text-text-muted">
          Runs
          <input
            type="number"
            min={1}
            max={500}
            value={runs}
            onChange={(e) => setRuns(Number(e.target.value))}
            className="h-11 w-24 rounded-button border border-border bg-surface-2 px-3 font-mono text-text tabular"
            disabled={status === "running"}
          />
        </label>
        {status === "running" ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="h-11 rounded-button border border-border bg-surface-2 px-5 font-medium"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            data-testid="timing-start"
            className="h-11 rounded-button bg-accent px-5 font-medium text-accent-ink hover:bg-accent-hover"
          >
            Run bench
          </button>
        )}
      </div>

      <div className="lab-board-slot">
        <Board ref={boardRef} n={N} store={store} pattern={pattern} label="Timing bench board" />
      </div>

      <dl
        className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-small"
        data-testid="timing-stats"
        data-status={status}
      >
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-text-muted">{k}</dt>
            <dd className="font-mono tabular">{v}</dd>
          </div>
        ))}
      </dl>

      {histogram.length > 0 && (
        <figure className="flex flex-col gap-2">
          <figcaption className="label-caps text-label text-text-muted">
            Frames shown per exposure
          </figcaption>
          <ul className="flex flex-col gap-1">
            {histogram.map(([frames, count]) => (
              <li
                key={frames}
                className="grid grid-cols-[4rem_1fr_3rem] items-center gap-2 font-mono text-small tabular"
              >
                <span>{frames}</span>
                <span
                  className="h-3 rounded-full bg-accent"
                  style={{ inlineSize: `${(count / maxCount) * 100}%` }}
                />
                <span className="text-right text-text-muted">{count}</span>
              </li>
            ))}
          </ul>
        </figure>
      )}
    </section>
  );
}
