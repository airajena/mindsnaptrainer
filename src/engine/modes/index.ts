import type { ModeId, ModeSummary, RoundConfig, RoundResult, SessionConfig } from "../types";
import { fixedMode } from "./fixed";

/**
 * A training mode decides the next round's parameters and when the session
 * ends. All modes share the same round engine (machine.ts).
 */
export interface Mode<S> {
  id: ModeId;
  init(config: SessionConfig): S;
  /** Parameters for the next round. Called again with a new seed after a void. */
  plan(state: S, config: SessionConfig): RoundConfig;
  /** Called once per counted round. */
  update(state: S, result: RoundResult): S;
  isDone(state: S, counted: number, config: SessionConfig): boolean;
  summarize(state: S, results: readonly RoundResult[]): ModeSummary;
}

/**
 * The machine holds mode state as `unknown`. Each mode is internally
 * consistent (its own `init` produces the only state it ever receives), so
 * erasing the type parameter at the registry boundary is safe.
 */
export type AnyMode = Mode<unknown>;

function erase<S>(mode: Mode<S>): AnyMode {
  return mode as unknown as AnyMode;
}

/** V1.1 adds `ladder` and `endurance` here. */
const REGISTRY: Partial<Record<ModeId, AnyMode>> = {
  fixed: erase(fixedMode),
};

export function getMode(id: ModeId): AnyMode {
  const mode = REGISTRY[id];
  if (!mode) throw new Error(`mode "${id}" is not available`);
  return mode;
}

export function isModeAvailable(id: ModeId): boolean {
  return REGISTRY[id] !== undefined;
}
