"use client";

import { InfoIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { Button } from "@/components/button";
import { ScoreHeadline, Stat } from "@/components/stat";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import type { RoundResult } from "@/engine/types";
import { ResultBoard, type ResultView } from "@/features/board/result-board";
import { formatMs, formatPercent, formatSeconds } from "@/lib/format";
import { isOnControl, isTyping } from "@/lib/keyboard";
import { settingsStore } from "@/stores/settings-store";
import { OverlayLegend } from "./legend";
import { useSession, useSessionState } from "./session-context";
import "./result.css";

const VIEWS = [
  { value: "overlay", label: "Overlay" },
  { value: "yours", label: "Yours" },
  { value: "actual", label: "Actual" },
] as const;

/** Per-round feedback (PRD §11.6). Space / Enter advances. */
export function PhaseResult({ onRequestEnd }: { onRequestEnd: () => void }) {
  const session = useSession();
  const result = useSessionState((s) => (s.phase.kind === "result" ? s.phase.result : null));
  const config = useSessionState((s) => s.config);
  const autoAdvance = useStore(settingsStore, (s) => s.autoAdvance);
  const [view, setView] = useState<ResultView>("overlay");
  const [overlayOnDesktop, setOverlayOnDesktop] = useState(false);
  const headlineRef = useRef<HTMLParagraphElement>(null);

  const next = () => session.dispatch({ type: "NEXT" });

  useEffect(() => {
    headlineRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || isTyping(e) || isOnControl(e)) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        session.dispatch({ type: "NEXT" });
      }
    };
    window.addEventListener("keydown", onKey);
    const timer = autoAdvance ? setTimeout(() => session.dispatch({ type: "NEXT" }), 2500) : null;
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer) clearTimeout(timer);
    };
  }, [session, autoAdvance]);

  if (!result || !config) return null;
  const { plan } = result;
  const n = plan.config.boardSize;
  const k = result.pattern.length;
  const isLast = config.modeId === "fixed" && plan.index + 1 >= config.rounds;
  const boardLabel = (v: ResultView) => describe(result, v);

  return (
    <main className="result-page mx-auto flex w-full max-w-5xl flex-col gap-6 px-gutter pt-2 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <header className="flex h-14 items-center justify-between">
        <p className="label-caps font-mono text-label text-text-muted tabular">
          Round {plan.index + 1}
          {config.modeId === "fixed" ? ` / ${config.rounds}` : ""} · Result
        </p>
        <button
          type="button"
          onClick={onRequestEnd}
          className="-mr-2 grid size-11 place-items-center rounded-button text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <XIcon className="size-5" aria-hidden />
          <span className="sr-only">End session</span>
        </button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start">
        <section className="flex flex-col gap-5" aria-label="Score">
          <div>
            <ScoreHeadline ref={headlineRef} hits={result.hits} target={k} />
            <p className="mt-2 text-text-muted" data-testid="accuracy">
              <span className="font-mono text-text tabular">{formatPercent(result.accuracy)}</span>{" "}
              accuracy
              {result.perfect && <span className="ml-2 text-accent">Perfect</span>}
              {result.timedOut && <span className="ml-2 text-miss">Time ran out</span>}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-2">
            <Stat label="Hits" value={result.hits} tone="hit" />
            <Stat label="Misses" value={result.misses} tone="miss" />
            <Stat label="False taps" value={result.falseTaps} tone="false" />
            <Stat label="Recall" value={formatSeconds(result.recallTimeMs, 1)} />
          </dl>
          <details className="group text-small text-text-muted">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 hover:text-text">
              <InfoIcon className="size-4" aria-hidden /> Timing detail
            </summary>
            <p className="font-mono tabular">
              Exposure {formatMs(result.exposure.actualMs)} ({result.exposure.frames} frames) ·
              target {formatMs(plan.config.exposureMs)}
              {result.firstTapMs !== null && ` · first tap ${formatMs(result.firstTapMs)}`}
            </p>
          </details>
        </section>

        <section className="flex flex-col gap-4" aria-label="Comparison">
          {/* Mobile / tablet: one board with a view switch. */}
          <div className="flex flex-col gap-4 lg:hidden">
            <Segmented
              value={view}
              onChange={setView}
              options={VIEWS}
              label="Comparison view"
              className="self-start"
            />
            <div className="result-slot">
              <ResultBoard
                n={n}
                pattern={result.pattern}
                selection={result.selection}
                view={view}
                label={boardLabel(view)}
              />
            </div>
          </div>
          {/* Desktop: yours and actual side by side, overlay optional. */}
          <div className="hidden flex-col gap-4 lg:flex">
            <div className="flex min-h-11 items-center gap-3 self-start text-small text-text-muted">
              <Switch
                id="overlay-desktop"
                checked={overlayOnDesktop}
                onCheckedChange={setOverlayOnDesktop}
              />
              <label htmlFor="overlay-desktop">Show overlay</label>
            </div>
            <div className="result-pair grid grid-cols-2 gap-6">
              <figure className="flex flex-col gap-2">
                <figcaption className="label-caps text-label text-text-muted">
                  {overlayOnDesktop ? "Overlay" : "Yours"}
                </figcaption>
                <ResultBoard
                  n={n}
                  pattern={result.pattern}
                  selection={result.selection}
                  view={overlayOnDesktop ? "overlay" : "yours"}
                  label={boardLabel(overlayOnDesktop ? "overlay" : "yours")}
                />
              </figure>
              <figure className="flex flex-col gap-2">
                <figcaption className="label-caps text-label text-text-muted">Actual</figcaption>
                <ResultBoard
                  n={n}
                  pattern={result.pattern}
                  selection={result.selection}
                  view="actual"
                  label={boardLabel("actual")}
                />
              </figure>
            </div>
          </div>
          {(view === "overlay" || overlayOnDesktop) && <OverlayLegend />}
        </section>
      </div>

      <div className="sticky bottom-0 -mx-gutter mt-auto bg-bg/95 px-gutter pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:static lg:mx-0 lg:bg-transparent lg:px-0">
        <Button size="lg" className="w-full lg:w-auto lg:min-w-60" onClick={next}>
          {isLast ? "See summary" : "Next round"}
        </Button>
      </div>
    </main>
  );
}

function describe(r: RoundResult, view: ResultView): string {
  switch (view) {
    case "overlay":
      return `Overlay: ${r.hits} hits, ${r.misses} misses, ${r.falseTaps} false taps.`;
    case "yours":
      return `Your selection: ${r.selection.length} squares.`;
    case "actual":
      return `The pattern: ${r.pattern.length} squares.`;
    default:
      return "";
  }
}
