import type { RoundConfig, SessionConfig } from "./types";

/** Parameter limits from PRD §10. The engine enforces them; the UI mirrors them. */
export const LIMITS = {
  boardSize: { min: 4, max: 12 },
  cellCount: { min: 2 },
  exposureMs: { min: 150, max: 5000, step: 50 },
  rounds: { min: 1, max: 100 },
  passThreshold: { min: 0.5, max: 1 },
} as const;

export const RECALL_LIMITS_MS = [null, 5000, 10000, 15000, 30000] as const;

/** Above 50% of cells it's easier to memorise the blanks, so k is capped. */
export function maxCellCount(n: number): number {
  return Math.floor((n * n) / 2);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Clamps every numeric parameter into range and resolves dependent options. */
export function normalizeConfig<C extends RoundConfig>(config: C): C {
  const boardSize = clamp(Math.round(config.boardSize), LIMITS.boardSize.min, LIMITS.boardSize.max);
  const cellCount = clamp(
    Math.round(config.cellCount),
    LIMITS.cellCount.min,
    maxCellCount(boardSize),
  );
  const exposureMs = clamp(
    Math.round(config.exposureMs / LIMITS.exposureMs.step) * LIMITS.exposureMs.step,
    LIMITS.exposureMs.min,
    LIMITS.exposureMs.max,
  );
  const recallLimitMs =
    config.recallLimitMs === null || config.recallLimitMs <= 0
      ? null
      : Math.round(config.recallLimitMs);
  return {
    ...config,
    boardSize,
    cellCount,
    exposureMs,
    recallLimitMs,
    // Auto-submit only makes sense when the limit tells us when "done" is.
    autoSubmit: config.selectionLimit && config.autoSubmit,
  };
}

export function normalizeSessionConfig(config: SessionConfig): SessionConfig {
  const base = normalizeConfig(config);
  return {
    ...base,
    rounds: clamp(Math.round(config.rounds), LIMITS.rounds.min, LIMITS.rounds.max),
    passThreshold: clamp(config.passThreshold, LIMITS.passThreshold.min, LIMITS.passThreshold.max),
  };
}

/** Groups history: `8x18@1000`, plus recall rules that change the task. */
export function configSignature(config: RoundConfig): string {
  let sig = `${config.boardSize}x${config.cellCount}@${config.exposureMs}`;
  if (!config.selectionLimit) sig += "+free";
  if (config.recallLimitMs !== null) sig += `+r${config.recallLimitMs}`;
  if (config.patternStyle !== "uniform") sig += `+${config.patternStyle}`;
  return sig;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  modeId: "fixed",
  boardSize: 8,
  cellCount: 18,
  exposureMs: 1000,
  patternStyle: "uniform",
  selectionLimit: true,
  autoSubmit: false,
  recallLimitMs: null,
  rounds: 10,
  feedback: "each-round",
  roundStart: "tap",
  passThreshold: 0.9,
};
