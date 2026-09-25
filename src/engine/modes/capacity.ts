import { maxCellCount } from "../config";
import { createStaircase, estimateThreshold, type Staircase, stepStaircase } from "../staircase";
import type { RoundConfig, SessionConfig } from "../types";
import type { Mode } from "./index";

/**
 * Capacity test (PRD §9.3): fixed board + exposure, 2-down/1-up on cell
 * count. Start k = 8, floor 3, ceiling 50% of cells. Stops after 8 reversals
 * or 30 counted rounds. k* = mean k at the last 6 reversals.
 */
export const CAPACITY = {
  start: 8,
  floor: 3,
  maxReversals: 8,
  maxRounds: 30,
  lastReversals: 6,
} as const;

export interface CapacityState {
  stair: Staircase;
  ceiling: number;
}

export const capacityMode: Mode<CapacityState> = {
  id: "capacity",
  init: (config) => {
    const ceiling = maxCellCount(config.boardSize);
    return { stair: createStaircase(Math.min(CAPACITY.start, ceiling)), ceiling };
  },
  plan: (state, config: SessionConfig): RoundConfig => ({
    boardSize: config.boardSize,
    cellCount: state.stair.level,
    exposureMs: config.exposureMs,
    patternStyle: config.patternStyle,
    selectionLimit: config.selectionLimit,
    autoSubmit: config.autoSubmit,
    recallLimitMs: config.recallLimitMs,
  }),
  update: (state, result) => ({
    ...state,
    stair: stepStaircase(state.stair, result.passed, (level, dir) =>
      Math.min(state.ceiling, Math.max(CAPACITY.floor, level - dir)),
    ),
  }),
  isDone: (state, counted) =>
    state.stair.reversalLevels.length >= CAPACITY.maxReversals || counted >= CAPACITY.maxRounds,
  summarize: (state, results) => {
    const est = estimateThreshold(state.stair, CAPACITY.lastReversals);
    return {
      kind: "capacity",
      threshold: est?.threshold ?? null,
      spread: est?.spread ?? null,
      exposureMs: results[0]?.plan.config.exposureMs ?? 0,
      track: state.stair.track,
      reversalIndexes: state.stair.reversalIndexes,
    };
  },
};
