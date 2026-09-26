"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button, buttonClass } from "@/components/button";
import { Stat } from "@/components/stat";
import { presetSignature } from "@/engine/presets";
import type { RoundResult, SessionSummary as Summary } from "@/engine/types";
import { ResultBoard } from "@/features/board/result-board";
import { Sparkline } from "@/features/progress/charts/sparkline";
import { formatNumber, formatPercent, formatSeconds } from "@/lib/format";
import { OverlayLegend } from "./legend";
import { ModeResult } from "./mode-result";
import { useSessionState } from "./session-context";

/** End of session (PRD §11.7). */
export function SessionSummary({
  onTrainAgain,
  onChangeSettings,
  callouts,
}: {
  onTrainAgain: () => void;
  onChangeSettings: () => void;
  callouts: readonly string[];
}) {
  const summary = useSessionState((s) => (s.phase.kind === "complete" ? s.phase.summary : null));
  const results = useSessionState((s) => s.results);
  const config = useSessionState((s) => s.config);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startRef.current?.focus({ preventScroll: true });
  }, []);

  if (!summary || !config) return null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-gutter pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <header className="flex flex-col gap-2">
        <p className="label-caps text-label text-text-muted">Session complete</p>
        <h1 className="sr-only">Session summary</h1>
        <p className="font-mono text-score tabular">{formatPercent(summary.meanAccuracy)}</p>
        <p className="text-text-muted">
          mean accuracy ·{" "}
          <span className="font-mono tabular">
            {config.modeId === "fixed" ? presetSignature(config) : modeName(config.modeId)}
          </span>
        </p>
      </header>

      {callouts.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Personal bests">
          {callouts.map((c) => (
            <li
              key={c}
              className="rounded-card border border-border-strong bg-surface px-4 py-3 text-small"
            >
              <span className="font-medium text-text">New best</span> — {c}
            </li>
          ))}
        </ul>
      )}

      <ModeResult summary={summary.mode} results={results} />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        <Stat
          label="Mean hits"
          value={
            <>
              {formatNumber(summary.meanHits)}
              <span className="text-text-faint"> / {formatNumber(summary.meanTarget)}</span>
            </>
          }
        />
        <Stat
          label="Perfect"
          value={
            <>
              {summary.perfectRounds}
              <span className="text-text-faint"> / {summary.counted}</span>
            </>
          }
        />
        <Stat label="Best / worst" value={bestWorst(results, summary)} />
        <Stat label="Mean recall" value={formatSeconds(summary.meanRecallMs, 1)} />
        <Stat
          label="First tap"
          value={summary.meanFirstTapMs === null ? "—" : formatSeconds(summary.meanFirstTapMs, 2)}
        />
        <Stat label="Void rounds" value={summary.voids} />
      </dl>

      {results.length > 1 && (
        <section className="flex flex-col gap-2">
          <h2 className="label-caps text-label text-text-muted">Accuracy per round</h2>
          <Sparkline
            values={results.map((r) => r.accuracy)}
            label={`Accuracy per round: ${results.map((r) => formatPercent(r.accuracy)).join(", ")}`}
          />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="label-caps text-label text-text-muted">Rounds</h2>
        <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
          {results.map((r) => (
            <RoundRow key={`${r.plan.index}-${r.plan.attempt}`} result={r} />
          ))}
        </ul>
      </section>

      <div className="sticky bottom-0 -mx-gutter mt-auto grid gap-3 bg-bg/95 px-gutter pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:static sm:mx-0 sm:grid-cols-3 sm:bg-transparent sm:px-0">
        <Button ref={startRef} size="lg" onClick={onTrainAgain}>
          Train again
        </Button>
        <Button variant="secondary" size="lg" onClick={onChangeSettings}>
          Change settings
        </Button>
        <Link href="/progress" className={buttonClass("ghost", "lg")}>
          View progress
        </Link>
      </div>
    </main>
  );
}

function RoundRow({ result: r }: { result: RoundResult }) {
  return (
    <li>
      <details className="group">
        <summary className="flex min-h-12 cursor-pointer items-center gap-4 px-4 text-small hover:bg-surface-2">
          <span className="w-16 font-mono text-text-muted tabular">#{r.plan.index + 1}</span>
          <span className="font-mono tabular">
            {r.hits}
            <span className="text-text-faint"> / {r.pattern.length}</span>
          </span>
          <span className="ml-auto font-mono tabular">{formatPercent(r.accuracy)}</span>
        </summary>
        <div
          className="flex flex-col gap-3 px-4 pb-4"
          style={{ "--board-size": "min(18rem, 70vw)" } as React.CSSProperties}
        >
          <ResultBoard
            n={r.plan.config.boardSize}
            pattern={r.pattern}
            selection={r.selection}
            view="overlay"
            label={`Round ${r.plan.index + 1}: ${r.hits} hits, ${r.misses} misses, ${r.falseTaps} false taps`}
          />
          <OverlayLegend />
        </div>
      </details>
    </li>
  );
}

function bestWorst(results: readonly RoundResult[], s: Summary) {
  const best = results[s.bestIndex];
  const worst = results[s.worstIndex];
  if (!best || !worst) return "—";
  return `${formatPercent(best.accuracy)} / ${formatPercent(worst.accuracy)}`;
}

function modeName(id: string): string {
  return id === "capacity" ? "Capacity test" : id === "speed" ? "Speed test" : "Session";
}
