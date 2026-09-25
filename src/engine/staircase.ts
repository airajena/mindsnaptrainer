/**
 * Generic n-down / 1-up adaptive staircase (Levitt 1971). With n = 2 it
 * converges on the level where the observer passes ≈ 70.7% of trials, so the
 * threshold is stable across sessions — unlike a single run.
 *
 * "Down" means harder (more cells / shorter exposure); what a step means is
 * the caller's `step` function, so the same staircase drives integer
 * (capacity) and multiplicative (speed) levels.
 */

export interface Staircase {
  level: number;
  /** Consecutive passes at the current level. */
  streak: number;
  /** Direction of the last level change: -1 harder, +1 easier, 0 none yet. */
  direction: -1 | 0 | 1;
  /** Level per trial, in order (the level each trial was run at). */
  track: number[];
  /** Trial indexes (into track) at which a reversal happened. */
  reversalIndexes: number[];
  /** Levels at the reversals. */
  reversalLevels: number[];
}

export type StepFn = (level: number, direction: -1 | 1, reversals: number) => number;

export function createStaircase(start: number): Staircase {
  return {
    level: start,
    streak: 0,
    direction: 0,
    track: [],
    reversalIndexes: [],
    reversalLevels: [],
  };
}

/** Records one trial at the current level and moves the staircase. */
export function stepStaircase(s: Staircase, passed: boolean, step: StepFn, nDown = 2): Staircase {
  const trialIndex = s.track.length;
  const track = [...s.track, s.level];
  let move: -1 | 0 | 1 = 0;
  let streak = s.streak;
  if (passed) {
    streak++;
    if (streak >= nDown) {
      move = -1;
      streak = 0;
    }
  } else {
    move = 1;
    streak = 0;
  }
  if (move === 0) return { ...s, track, streak };

  const next = step(s.level, move, s.reversalLevels.length);
  const reversed = s.direction !== 0 && move !== s.direction;
  // A step that the clamp swallowed isn't a move (the level didn't change).
  if (next === s.level) return { ...s, track, streak };
  return {
    level: next,
    streak,
    direction: move,
    track,
    reversalIndexes: reversed ? [...s.reversalIndexes, trialIndex] : s.reversalIndexes,
    reversalLevels: reversed ? [...s.reversalLevels, s.level] : s.reversalLevels,
  };
}

/**
 * Threshold estimate: mean level over the last `last` reversals (fewer if
 * that's all there is). Null with fewer than 2 reversals — not enough to say.
 */
export function estimateThreshold(
  s: Staircase,
  last = 6,
): { threshold: number; spread: number } | null {
  const levels = s.reversalLevels.slice(-last);
  if (levels.length < 2) return null;
  const mean = levels.reduce((a, b) => a + b, 0) / levels.length;
  const variance = levels.reduce((a, v) => a + (v - mean) ** 2, 0) / (levels.length - 1);
  return { threshold: mean, spread: Math.sqrt(variance) };
}
