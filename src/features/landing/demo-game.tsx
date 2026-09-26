"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { buttonClass } from "@/components/button";
import { DEFAULT_SESSION_CONFIG } from "@/engine/config";
import type { CellIndex, SelectionOp, SessionConfig } from "@/engine/types";
import { Board } from "@/features/board/board";
import { ResultBoard } from "@/features/board/result-board";
import { useRoundRunner } from "@/features/session/use-round-runner";
import { randomSeed } from "@/platform/seed";
import { createSessionStore, currentPlan } from "@/stores/session-store";
import { DemoIdle } from "./demo-idle";

const DEMO: SessionConfig = {
  ...DEFAULT_SESSION_CONFIG,
  boardSize: 5,
  cellCount: 6,
  exposureMs: 1500,
  rounds: 1,
  feedback: "each-round",
  selectionLimit: true,
  autoSubmit: true,
};

const EMPTY: readonly CellIndex[] = [];

/**
 * The landing demo: one real round on the real engine, Board and timing
 * pipeline — no separate "fake demo" code path.
 */
export function DemoGame() {
  const [session, setSession] = useState(() => createSessionStore());
  const kind = useStore(session.store, (s) => s.state.phase.kind);
  const plan = useStore(session.store, (s) => currentPlan(s.state));
  const pattern = useStore(session.store, (s) =>
    s.state.phase.kind === "countdown" || s.state.phase.kind === "memorize"
      ? s.state.phase.pattern
      : EMPTY,
  );
  const result = useStore(session.store, (s) =>
    s.state.phase.kind === "result" ? s.state.phase.result : null,
  );
  const count = useStore(session.store, (s) =>
    s.state.phase.kind === "recall" ? s.state.phase.selection.length : 0,
  );
  const voidReason = useStore(session.store, (s) =>
    s.state.phase.kind === "void" ? s.state.phase.reason : undefined,
  );
  const boardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Honour a focus request made while the static placeholder was showing.
  useEffect(() => {
    const demo = document.getElementById("demo");
    if (demo?.dataset.focusRequested !== "true") return;
    delete demo.dataset.focusRequested;
    document.getElementById("demo-play")?.focus({ preventScroll: true });
  }, []);

  const timed = kind === "countdown" || kind === "memorize";
  useRoundRunner(session, timed ? plan : null, boardRef, overlayRef, "quick");

  const play = useCallback(() => {
    const next = createSessionStore();
    next.dispatch({ type: "START_SESSION", config: DEMO, seed: randomSeed() });
    next.dispatch({ type: "BEGIN_ROUND" });
    setSession(next);
  }, []);

  const onToggle = useCallback(
    (cell: CellIndex, op: SelectionOp, t: number) => {
      session.dispatch({ type: "TOGGLE", cell, op, t });
    },
    [session],
  );

  if (kind === "setup") return <DemoIdle onPlay={play} />;

  if (kind === "result" && result) {
    const k = result.pattern.length;
    return (
      <div className="demo-stage">
        <div className="demo-board-wrap">
          <ResultBoard
            n={5}
            pattern={result.pattern}
            selection={result.selection}
            view="overlay"
            label={`Your round: ${result.hits} hits, ${result.misses} misses, ${result.falseTaps} false taps`}
          />
        </div>
        <div className="demo-caption flex flex-col gap-3" role="status">
          <p>
            <span className="font-mono text-h2 text-text tabular">
              {result.hits} / {k}
            </span>{" "}
            <span className="text-text-muted">— {verdict(result.hits, k)} Now try 8×8.</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/train" className={buttonClass("primary", "md")}>
              Start training
            </Link>
            <button type="button" onClick={play} className={buttonClass("secondary", "md")}>
              Play again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-stage">
      <div className="demo-board-wrap">
        <Board
          ref={boardRef}
          n={5}
          store={session.selection}
          pattern={pattern}
          interactive={kind === "recall"}
          ariaHidden={timed}
          label={kind === "recall" ? "Demo board. Select the 6 squares." : "Demo board"}
          onToggle={onToggle}
          overlay={<div ref={overlayRef} className="countdown" />}
        />
      </div>
      <p className="demo-caption" aria-live="polite" data-void-reason={voidReason}>
        {kind === "recall" ? (
          <>
            Tap the squares you saw ·{" "}
            <span className="font-mono tabular">
              {count} / {DEMO.cellCount}
            </span>
          </>
        ) : kind === "void" ? (
          <>
            Timing was interrupted.{" "}
            <button type="button" onClick={play} className="underline underline-offset-4">
              Try again
            </button>
          </>
        ) : (
          "Watch closely…"
        )}
      </p>
    </div>
  );
}

function verdict(hits: number, k: number): string {
  if (hits === k) return "perfect.";
  if (hits >= k - 1) return "nice.";
  if (hits >= k / 2) return "not bad.";
  return "tricky, right?";
}
