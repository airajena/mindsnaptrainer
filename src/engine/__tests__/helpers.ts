import { DEFAULT_SESSION_CONFIG } from "../config";
import { INITIAL_STATE, reduce } from "../machine";
import type { ExposureMeasurement, SessionConfig, SessionEvent, SessionState } from "../types";

export const config = (over: Partial<SessionConfig> = {}): SessionConfig => ({
  ...DEFAULT_SESSION_CONFIG,
  ...over,
});

export const exposure = (over: Partial<ExposureMeasurement> = {}): ExposureMeasurement => ({
  shownAt: 1000,
  hiddenAt: 2000,
  actualMs: 1000,
  frames: 60,
  maxFrameGapMs: 16.7,
  reliable: true,
  ...over,
});

export function run(
  events: readonly SessionEvent[],
  from: SessionState = INITIAL_STATE,
): SessionState {
  return events.reduce(reduce, from);
}

/** Drives a fresh session to the recall phase of round 0. */
export function toRecall(over: Partial<SessionConfig> = {}, seed = 1): SessionState {
  return run([
    { type: "START_SESSION", config: config(over), seed },
    { type: "BEGIN_ROUND" },
    { type: "COUNTDOWN_DONE" },
    { type: "EXPOSURE_DONE", exposure: exposure(), recallStartedAt: 2000 },
  ]);
}

export function recallPhase(state: SessionState) {
  if (state.phase.kind !== "recall") throw new Error(`expected recall, got ${state.phase.kind}`);
  return state.phase;
}

/** Select every target cell of the current recall phase, then submit. */
export function playPerfect(state: SessionState, t0 = 2100): SessionState {
  const phase = recallPhase(state);
  let s = state;
  phase.pattern.forEach((cell, i) => {
    s = reduce(s, { type: "TOGGLE", cell, op: "add", t: t0 + i * 10 });
  });
  if (s.phase.kind === "recall") s = reduce(s, { type: "SUBMIT", t: t0 + 1000 });
  return s;
}
