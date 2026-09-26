"use client";

import { XIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { presetSignature } from "@/engine/presets";
import type { CellIndex, SelectionOp } from "@/engine/types";
import { Board } from "@/features/board/board";
import { isTyping } from "@/lib/keyboard";
import { currentPlan } from "@/stores/session-store";
import { settingsStore } from "@/stores/settings-store";
import { RecallControls } from "./phase-recall-controls";
import { roundCountdown } from "./round-countdown";
import { useSession, useSessionState } from "./session-context";
import { useRoundRunner } from "./use-round-runner";

const EMPTY: readonly CellIndex[] = [];

/**
 * The in-round screen (ready → countdown → memorize → recall, plus void).
 * One Board instance persists across all of these phases in the same slot,
 * so it never moves. Subscriptions are narrow: a tap in recall re-renders the
 * tapped cell and the counter, not this component.
 */
export function SessionStage({ onRequestEnd }: { onRequestEnd: () => void }) {
  const session = useSession();
  const kind = useSessionState((s) => s.phase.kind);
  const plan = useSessionState(currentPlan);
  const pattern = useSessionState((s) =>
    s.phase.kind === "countdown" || s.phase.kind === "memorize" ? s.phase.pattern : EMPTY,
  );
  const config = useSessionState((s) => s.config);
  const counted = useSessionState((s) => s.results.length);
  const voidStreak = useSessionState((s) => s.voidStreak);
  const voidReason = useSessionState((s) => (s.phase.kind === "void" ? s.phase.reason : null));
  const haptics = useStore(settingsStore, (s) => s.haptics);
  const swipe = useStore(settingsStore, (s) => s.swipe);
  const countdown = useStore(settingsStore, (s) => s.countdown);
  const progressBar = useStore(settingsStore, (s) => s.progressBar);

  const boardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  const timed = kind === "countdown" || kind === "memorize";
  const auto = config?.roundStart === "auto";
  const roundStyle =
    plan && config ? roundCountdown(countdown, config.roundStart, plan) : countdown;
  useRoundRunner(session, timed ? plan : null, boardRef, overlayRef, roundStyle);

  const begin = useCallback(() => session.dispatch({ type: "BEGIN_ROUND" }), [session]);
  const onToggle = useCallback(
    (cell: CellIndex, op: SelectionOp, t: number) => {
      session.dispatch({ type: "TOGGLE", cell, op, t });
    },
    [session],
  );
  const onReject = useCallback(() => {
    const el = counterRef.current;
    if (!el) return;
    el.dataset.shake = "false";
    void el.offsetWidth; // restart the animation
    el.dataset.shake = "true";
  }, []);

  // Ready: automatic round start begins straight away (rounds flow back to
  // back); otherwise Space, a tap on the board or the button starts it.
  useEffect(() => {
    if (kind !== "ready") return;
    if (auto) {
      begin();
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " && !e.repeat && !isTyping(e)) {
        e.preventDefault();
        begin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kind, begin, auto]);

  // Recall: focus the board so keyboard play works straight away.
  useEffect(() => {
    if (kind !== "recall") return;
    const cell = boardRef.current?.querySelector<HTMLElement>('[tabindex="0"]');
    cell?.focus({ preventScroll: true });
  }, [kind]);

  if (!plan || !config) return null;
  const n = plan.config.boardSize;
  const k = plan.config.cellCount;
  const totalRounds = config.modeId === "fixed" ? config.rounds : null;
  const roundLabel = totalRounds
    ? `Round ${plan.index + 1} / ${totalRounds}`
    : `Round ${plan.index + 1}`;

  return (
    <div className="stage">
      <header className="stage-header flex items-center justify-between gap-3">
        <p className="label-caps font-mono text-label text-text-muted tabular">
          {roundLabel}
          <span className="sr-only">, {counted} counted</span>
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

      <div className="stage-label flex items-end justify-between gap-3 pb-3">
        <p className="label-caps text-label text-text-muted">{phaseLabel(kind)}</p>
        {kind === "recall" ? (
          <RecallCounter k={k} limit={plan.config.selectionLimit} counterRef={counterRef} />
        ) : (
          <p className="font-mono text-small text-text-faint tabular">
            {presetSignature(plan.config)}
          </p>
        )}
      </div>

      {/* Tap-to-start on the board mirrors the Space key and the Start button below. */}
      <div
        className="stage-board"
        onPointerDown={kind === "ready" ? begin : undefined}
        style={{ "--exposure-ms": `${plan.config.exposureMs}ms` } as React.CSSProperties}
      >
        <Board
          ref={boardRef}
          n={n}
          store={session.selection}
          pattern={pattern}
          interactive={kind === "recall"}
          swipe={swipe}
          haptics={haptics}
          ariaHidden={timed}
          label={
            kind === "recall" ? `Board, ${n} by ${n}. Select the squares.` : `Board, ${n} by ${n}`
          }
          onToggle={onToggle}
          onReject={onReject}
          overlay={<div ref={overlayRef} className="countdown" />}
        />
        {progressBar && (
          <div className="memorize-bar motion-essential" aria-hidden="true">
            <span className="motion-essential" />
          </div>
        )}
      </div>

      <div className="stage-controls flex flex-col items-stretch justify-end gap-3">
        {kind === "ready" && !auto && (
          <>
            <p className="text-center text-small text-text-muted">Tap the board or press Space</p>
            <button
              type="button"
              onClick={begin}
              className="min-h-13 rounded-button bg-accent font-medium text-accent-ink hover:bg-accent-hover"
            >
              Start round {plan.index + 1}
            </button>
          </>
        )}
        {kind === "recall" && <RecallControls />}
        {kind === "void" && (
          <>
            <p className="text-center text-small text-text-muted" role="status">
              {voidStreak >= 3
                ? "Your device is dropping frames — close other apps and try again."
                : voidMessage(voidReason)}{" "}
              This round doesn&apos;t count.
            </p>
            <button
              type="button"
              onClick={() => session.dispatch({ type: "NEXT" })}
              className="min-h-13 rounded-button bg-accent font-medium text-accent-ink hover:bg-accent-hover"
            >
              Replay round
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RecallCounter({
  k,
  limit,
  counterRef,
}: {
  k: number;
  limit: boolean;
  counterRef: React.RefObject<HTMLSpanElement | null>;
}) {
  const count = useSessionState((s) => (s.phase.kind === "recall" ? s.phase.selection.length : 0));
  return (
    <span
      ref={counterRef}
      className="counter font-mono text-h2 tabular"
      onAnimationEnd={(e) => {
        e.currentTarget.dataset.shake = "false";
      }}
    >
      {count}
      <span className="text-text-faint"> / {k}</span>
      <span className="sr-only"> selected</span>
      {!limit && <span className="sr-only"> (no selection limit)</span>}
    </span>
  );
}

function phaseLabel(kind: string): string {
  switch (kind) {
    case "ready":
      return "Get ready";
    case "countdown":
    case "memorize":
      return "Memorize";
    case "recall":
      return "Select the squares";
    case "void":
      return "Timing interrupted";
    default:
      return "";
  }
}

function voidMessage(reason: string | null): string {
  switch (reason) {
    case "hidden":
      return "The app was hidden while the pattern was showing.";
    case "resize":
      return "The screen resized while the pattern was showing.";
    case "dropped-frames":
      return "The display skipped frames, so the exposure wasn't accurate.";
    default:
      return "Timing was interrupted.";
  }
}
