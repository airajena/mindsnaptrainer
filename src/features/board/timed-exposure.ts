"use client";

import type { ExposureMeasurement, VoidReason } from "@/engine/types";
import { clearLit, runExposure } from "@/platform/exposure";
import { sampleFramePeriod } from "@/platform/frame-clock";
import { watchTimingGuards } from "@/platform/timing-guards";

export type TimedExposureOutcome =
  | { kind: "done"; exposure: ExposureMeasurement; recallStartedAt: number; framePeriod: number }
  | { kind: "void"; reason: VoidReason };

class VoidSignal extends Error {
  constructor(readonly reason: VoidReason) {
    super(`void: ${reason}`);
  }
}

/**
 * The full timed pipeline used by every board that flashes a pattern (the
 * session, the landing demo, /lab):
 *
 *   1. arm the void guards (page hidden, resize/rotate)
 *   2. `countdown(signal)` — the caller's countdown; the frame period is
 *      sampled concurrently, so it costs no extra time
 *   3. frame-accurate reveal → hide (single attribute flip, in rAF)
 *   4. strip `data-lit` from the DOM so the recall board holds no answer
 *
 * Precondition: the board's cells already carry `data-lit` for the pattern.
 * Exposures with a dropped frame come back as `done` with
 * `reliable: false`; the engine voids those.
 */
export async function runTimedExposure(options: {
  board: HTMLElement;
  targetMs: number;
  countdown?: (signal: AbortSignal) => Promise<void>;
  /** External cancellation (unmount, abort). Rejects with the signal's reason. */
  signal?: AbortSignal;
}): Promise<TimedExposureOutcome> {
  const { board, targetMs } = options;
  const controller = new AbortController();
  const { signal } = controller;
  const onExternalAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  const disarm = watchTimingGuards(board, (reason) => controller.abort(new VoidSignal(reason)));

  try {
    const [framePeriod] = await Promise.all([
      sampleFramePeriod(20, signal),
      options.countdown?.(signal) ?? Promise.resolve(),
    ]);
    const exposure = await runExposure(board, targetMs, framePeriod, signal);
    clearLit(board);
    return { kind: "done", exposure, recallStartedAt: exposure.hiddenAt, framePeriod };
  } catch (err) {
    clearLit(board);
    if (err instanceof VoidSignal) return { kind: "void", reason: err.reason };
    throw err;
  } finally {
    disarm();
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}
