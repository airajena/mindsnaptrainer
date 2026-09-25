export type CountdownStyle = "standard" | "quick" | "off";

export interface CountdownStep {
  /** Text shown over the board centre; "" = fixation dot. */
  label: string;
  ms: number;
}

const FIXATION: CountdownStep = { label: "", ms: 300 };

/** PRD §7: standard 3 × 400 ms, quick 1 × 500 ms, off = fixation only. Always ends on the fixation dot. */
export function countdownSteps(style: CountdownStyle): CountdownStep[] {
  switch (style) {
    case "standard":
      return [{ label: "3", ms: 400 }, { label: "2", ms: 400 }, { label: "1", ms: 400 }, FIXATION];
    case "quick":
      return [{ label: "1", ms: 500 }, FIXATION];
    case "off":
      return [FIXATION];
    default: {
      const never: never = style;
      return never;
    }
  }
}

/**
 * Runs the countdown by writing into `el` from rAF callbacks — not React
 * state, not setTimeout — so it can't disturb the frame-period sampling that
 * runs alongside it, and step changes land exactly on frames.
 * `onStep` fires as each step starts (index into `steps`).
 */
export function runCountdown(
  el: HTMLElement,
  steps: readonly CountdownStep[],
  signal: AbortSignal,
  onStep?: (index: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let raf = 0;
    let index = -1;
    let stepEnd = 0;

    const cleanup = () => {
      el.textContent = "";
      delete el.dataset.fixation;
    };
    const abort = () => {
      cancelAnimationFrame(raf);
      cleanup();
      reject(signal.reason);
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });

    const show = (i: number, t: number) => {
      const step = steps[i]!;
      index = i;
      stepEnd = t + step.ms;
      el.textContent = step.label;
      if (step.label === "") el.dataset.fixation = "true";
      else delete el.dataset.fixation;
      onStep?.(i);
    };

    const tick = (t: number) => {
      if (index < 0) {
        show(0, t);
      } else if (t >= stepEnd) {
        if (index === steps.length - 1) {
          signal.removeEventListener("abort", abort);
          // Leave the fixation dot up; the caller clears it in the reveal frame.
          resolve();
          return;
        }
        show(index + 1, t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}

/** Clears the overlay (call when the pattern is revealed). */
export function clearCountdown(el: HTMLElement): void {
  el.textContent = "";
  delete el.dataset.fixation;
}
