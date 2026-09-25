"use client";

import { type RefObject, useEffect } from "react";
import type { RoundPlan } from "@/engine/types";
import { runTimedExposure } from "@/features/board/timed-exposure";
import {
  type CountdownStyle,
  clearCountdown,
  countdownSteps,
  runCountdown,
} from "@/platform/countdown";
import type { SessionStore } from "@/stores/session-store";

/**
 * Drives one round's timed part: countdown → reveal → hide → recall.
 *
 * Keyed on the round plan (stable across countdown → memorize), so the
 * COUNTDOWN_DONE re-render doesn't restart it. COUNTDOWN_DONE is dispatched
 * as the fixation dot appears — 300 ms before the reveal — so React's commit
 * for that transition settles well before the timed frames. Countdown and
 * memorize render identical markup, so that commit changes nothing on screen.
 *
 * Leaving the phase (abort, unmount) cancels the run; the promise rejection
 * is expected and ignored.
 */
export function useRoundRunner(
  session: SessionStore,
  plan: RoundPlan | null,
  boardRef: RefObject<HTMLDivElement | null>,
  overlayRef: RefObject<HTMLDivElement | null>,
  countdownStyle: CountdownStyle,
): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: countdownStyle is read once per round on purpose — changing it mid-round must not restart the run.
  useEffect(() => {
    const board = boardRef.current;
    const overlay = overlayRef.current;
    if (!plan || !board || !overlay) return;

    const controller = new AbortController();
    const steps = countdownSteps(countdownStyle);

    runTimedExposure({
      board,
      targetMs: plan.config.exposureMs,
      signal: controller.signal,
      countdown: (signal) =>
        runCountdown(overlay, steps, signal, (i) => {
          if (i === steps.length - 1) session.dispatch({ type: "COUNTDOWN_DONE" });
        }),
    })
      .then((outcome) => {
        clearCountdown(overlay);
        if (outcome.kind === "done") {
          session.dispatch({
            type: "EXPOSURE_DONE",
            exposure: outcome.exposure,
            recallStartedAt: outcome.recallStartedAt,
          });
        } else {
          session.dispatch({ type: "VOID", reason: outcome.reason });
        }
      })
      .catch(() => {
        clearCountdown(overlay);
      });

    return () => controller.abort(new DOMException("round cancelled", "AbortError"));
  }, [plan, session, boardRef, overlayRef]);
}
