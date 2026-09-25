/**
 * Estimates the display frame period from requestAnimationFrame deltas.
 *
 * Uses the median so one hiccup (GC, a slow frame) doesn't skew it. Sampled
 * during the countdown, which lasts ≥ 300 ms anyway, so it costs nothing.
 * Works for any refresh rate (60/90/120/144 Hz) — nothing assumes 60.
 */
export function sampleFramePeriod(samples = 20, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    const deltas: number[] = [];
    let prev = 0;
    let raf = 0;

    const onAbort = () => {
      cancelAnimationFrame(raf);
      reject(signal?.reason);
    };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });

    const tick = (t: number) => {
      if (prev) deltas.push(t - prev);
      prev = t;
      if (deltas.length < samples) {
        raf = requestAnimationFrame(tick);
        return;
      }
      signal?.removeEventListener("abort", onAbort);
      resolve(median(deltas));
    };
    raf = requestAnimationFrame(tick);
  });
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/** Resolves with the timestamp of the next animation frame. */
export function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Nominal refresh rate for display ("60 Hz"), from a measured period. */
export function refreshRateHz(framePeriodMs: number): number {
  return Math.round(1000 / framePeriodMs);
}
