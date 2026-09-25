import { LIMITS } from "../config";
import { createStaircase, estimateThreshold, type Staircase, stepStaircase } from "../staircase";
import type { RoundConfig, SessionConfig } from "../types";
import type { Mode } from "./index";

/**
 * Speed test (PRD §9.4): fixed board + k, 2-down/1-up on exposure. Start
 * 2000 ms; ×0.85 down / ×1.15 up for the first 2 reversals, then ×0.93 /
 * ×1.07. Clamped to 150–5000 ms. The exposure runner shows the nearest whole
 * frame, so levels are kept in ms and rounded to 1 ms per round.
 */
export const SPEED = {
  start: 2000,
  coarse: { down: 0.85, up: 1.15 },
  fine: { down: 0.93, up: 1.07 },
  coarseReversals: 2,
  maxReversals: 8,
  maxRounds: 30,
  lastReversals: 6,
} as const;

export interface SpeedState {
  stair: Staircase;
}

export function speedStep(level: number, dir: -1 | 1, reversals: number): number {
  const f = reversals < SPEED.coarseReversals ? SPEED.coarse : SPEED.fine;
  const next = level * (dir < 0 ? f.down : f.up);
  return Math.round(Math.min(LIMITS.exposureMs.max, Math.max(LIMITS.exposureMs.min, next)));
}

export const speedMode: Mode<SpeedState> = {
  id: "speed",
  init: () => ({ stair: createStaircase(SPEED.start) }),
  plan: (state, config: SessionConfig): RoundConfig => ({
    boardSize: config.boardSize,
    cellCount: config.cellCount,
    exposureMs: state.stair.level,
    patternStyle: config.patternStyle,
    selectionLimit: config.selectionLimit,
    autoSubmit: config.autoSubmit,
    recallLimitMs: config.recallLimitMs,
  }),
  update: (state, result) => ({ stair: stepStaircase(state.stair, result.passed, speedStep) }),
  isDone: (state, counted) =>
    state.stair.reversalLevels.length >= SPEED.maxReversals || counted >= SPEED.maxRounds,
  summarize: (state, results) => {
    const est = estimateThreshold(state.stair, SPEED.lastReversals);
    return {
      kind: "speed",
      threshold: est ? Math.round(est.threshold) : null,
      spread: est ? Math.round(est.spread) : null,
      cellCount: results[0]?.plan.config.cellCount ?? 0,
      track: state.stair.track,
      reversalIndexes: state.stair.reversalIndexes,
    };
  },
};
