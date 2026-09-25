import type { ExposureMeasurement } from "@/engine/types";

/**
 * Frame-accurate reveal/hide of the pattern (TECH_PLAN §7).
 *
 * Preconditions: the lit cells already carry `data-lit` (set by React during
 * the countdown) and the board root has no `data-reveal="true"`. Reveal and
 * hide are then a single attribute flip on the board root — one style recalc,
 * paint only, no layout.
 *
 * Why rAF and not setTimeout or React state: a DOM write inside a rAF
 * callback lands in the frame that callback belongs to. setTimeout fires at
 * an arbitrary point in the frame, and React state adds a scheduling hop, so
 * either could shift reveal or hide by a whole frame.
 *
 * The rAF timestamp `t` is the start time of the frame being produced. The
 * reveal frame's `t` is `shownAt`; the first blank frame's `t` is `hiddenAt`.
 * Their difference is exactly (frames shown) × (frame period), which is what
 * the user saw, regardless of the constant display latency.
 */
export function runExposure(
  board: HTMLElement,
  targetMs: number,
  framePeriod: number,
  signal: AbortSignal,
): Promise<ExposureMeasurement> {
  return new Promise((resolve, reject) => {
    let raf = 0;
    let shownAt = 0;
    let prev = 0;
    let frames = 0;
    let maxGap = 0;

    const abort = () => {
      cancelAnimationFrame(raf);
      board.dataset.reveal = "false";
      reject(signal.reason);
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });

    raf = requestAnimationFrame((t) => {
      board.dataset.reveal = "true"; // painted in this frame
      shownAt = t;
      prev = t;
      raf = requestAnimationFrame(tick);
    });

    function tick(t: number) {
      frames++;
      maxGap = Math.max(maxGap, t - prev);
      prev = t;
      // Hide on the frame whose start is closest to shownAt + target:
      // hiding at frame t means the pattern was visible for (t − shownAt).
      // Pick the first frame where that is ≥ target − half a frame, so the
      // error is at most ±½ frame.
      if (t >= shownAt + targetMs - framePeriod / 2) {
        board.dataset.reveal = "false"; // first blank frame
        signal.removeEventListener("abort", abort);
        const actualMs = t - shownAt;
        resolve({
          shownAt,
          hiddenAt: t,
          actualMs,
          frames,
          maxFrameGapMs: maxGap,
          reliable: isReliable(actualMs, targetMs, maxGap, framePeriod),
        });
        return;
      }
      raf = requestAnimationFrame(tick);
    }
  });
}

/**
 * Whether an exposure counts (PRD §13.4, tightened — see DECISIONS D11):
 * - no frame gap above 2× the period (a stall of unknown length), and
 * - the measured duration is within ±1 frame of the target. Without dropped
 *   frames the algorithm guarantees ±½ frame, so this only trips when a
 *   frame was dropped right at the hide boundary (overshoot) or the refresh
 *   rate changed mid-exposure (e.g. ProMotion throttling) — both cases where
 *   the promised exposure wasn't delivered.
 */
export function isReliable(
  actualMs: number,
  targetMs: number,
  maxGapMs: number,
  framePeriod: number,
): boolean {
  // +0.5 ms absorbs timestamp jitter and quantisation (WebKit reports whole
  // ms); without it a gap of exactly one dropped frame (2p) would flip-flop.
  const TOLERANCE_MS = 0.5;
  return (
    maxGapMs <= framePeriod * 2 + TOLERANCE_MS &&
    Math.abs(actualMs - targetMs) <= framePeriod + TOLERANCE_MS
  );
}

/**
 * Removes the answer from the DOM once the pattern is hidden (PRD §14): the
 * recall board must hold no trace of the pattern. React's own props catch up
 * on the next render; removing an already-absent attribute is a no-op.
 */
export function clearLit(board: HTMLElement): void {
  for (const cell of board.querySelectorAll("[data-lit]")) cell.removeAttribute("data-lit");
}
