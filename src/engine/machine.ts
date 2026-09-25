import { summarizeSession } from "./analytics";
import { normalizeSessionConfig } from "./config";
import { generatePattern } from "./generator";
import { getMode, isModeAvailable } from "./modes";
import { roundSeed } from "./rng";
import { score } from "./scoring";
import type {
  CellIndex,
  Phase,
  RoundPlan,
  RoundResult,
  SelectionEvent,
  SessionConfig,
  SessionEvent,
  SessionState,
} from "./types";

/**
 * The session state machine: (state, event) → state. Pure — timestamps and
 * seeds only arrive through events. Events that don't apply to the current
 * phase return the *same* state object, so stray taps, double submits and
 * late timer callbacks are harmless no-ops.
 */

export const INITIAL_STATE: SessionState = {
  phase: { kind: "setup" },
  config: null,
  seed: 0,
  results: [],
  voids: 0,
  voidStreak: 0,
  modeState: null,
};

type RecallPhase = Extract<Phase, { kind: "recall" }>;

export function reduce(state: SessionState, event: SessionEvent): SessionState {
  const { phase } = state;

  switch (event.type) {
    case "START_SESSION": {
      if (phase.kind !== "setup" && phase.kind !== "complete") return state;
      if (!isModeAvailable(event.config.modeId)) return state;
      const config = normalizeSessionConfig(event.config);
      const seed = event.seed >>> 0;
      const mode = getMode(config.modeId);
      const modeState = mode.init(config);
      const next: SessionState = {
        phase: { kind: "setup" },
        config,
        seed,
        results: [],
        voids: 0,
        voidStreak: 0,
        modeState,
      };
      return { ...next, phase: { kind: "ready", plan: planRound(next, config, 0, 0) } };
    }

    case "BEGIN_ROUND": {
      if (phase.kind !== "ready") return state;
      const pattern = generatePattern(phase.plan.config, phase.plan.seed);
      return { ...state, phase: { kind: "countdown", plan: phase.plan, pattern } };
    }

    case "COUNTDOWN_DONE": {
      if (phase.kind !== "countdown") return state;
      return { ...state, phase: { kind: "memorize", plan: phase.plan, pattern: phase.pattern } };
    }

    case "EXPOSURE_DONE": {
      if (phase.kind !== "memorize") return state;
      // An exposure with a dropped frame doesn't count, however it ended.
      if (!event.exposure.reliable) return voidRound(state, phase.plan, "dropped-frames");
      return {
        ...state,
        phase: {
          kind: "recall",
          plan: phase.plan,
          pattern: phase.pattern,
          exposure: event.exposure,
          startedAt: event.recallStartedAt,
          events: [],
          selection: [],
        },
      };
    }

    case "TOGGLE": {
      if (phase.kind !== "recall") return state;
      const { cell, op, t } = event;
      const n = phase.plan.config.boardSize;
      if (!Number.isInteger(cell) || cell < 0 || cell >= n * n) return state;
      const has = phase.selection.includes(cell);
      if (op === "add") {
        if (has) return state;
        if (
          phase.plan.config.selectionLimit &&
          phase.selection.length >= phase.plan.config.cellCount
        ) {
          return state;
        }
      } else if (!has) {
        return state;
      }
      const selection =
        op === "add"
          ? insertSorted(phase.selection, cell)
          : phase.selection.filter((c) => c !== cell);
      const updated: RecallPhase = {
        ...phase,
        selection,
        events: [...phase.events, { cell, t, op }],
      };
      const { config } = phase.plan;
      if (op === "add" && config.autoSubmit && selection.length === config.cellCount) {
        return submit(state, updated, t, false);
      }
      return { ...state, phase: updated };
    }

    case "CLEAR": {
      if (phase.kind !== "recall" || phase.selection.length === 0) return state;
      // Logged as individual removes so the event stream alone reconstructs the selection.
      const removes: SelectionEvent[] = phase.selection.map((cell) => ({
        cell,
        t: event.t,
        op: "remove",
      }));
      return {
        ...state,
        phase: { ...phase, selection: [], events: [...phase.events, ...removes] },
      };
    }

    case "SUBMIT": {
      if (phase.kind !== "recall" || phase.selection.length === 0) return state;
      return submit(state, phase, event.t, false);
    }

    case "RECALL_TIMEOUT": {
      // Unlike SUBMIT, a timeout submits even an empty selection (it scores 0).
      if (phase.kind !== "recall") return state;
      return submit(state, phase, event.t, true);
    }

    case "VOID": {
      if (phase.kind !== "countdown" && phase.kind !== "memorize") return state;
      return voidRound(state, phase.plan, event.reason);
    }

    case "NEXT": {
      const config = state.config;
      if (config === null) return state;
      if (phase.kind === "void") {
        return {
          ...state,
          phase: {
            kind: "ready",
            plan: planRound(state, config, phase.plan.index, phase.plan.attempt + 1),
          },
        };
      }
      if (phase.kind === "result") return advance(state, config);
      return state;
    }

    case "ABORT": {
      if (phase.kind === "setup") return state;
      return { ...state, phase: { kind: "setup" } };
    }

    default: {
      const never: never = event;
      return never;
    }
  }
}

function planRound(
  state: SessionState,
  config: SessionConfig,
  index: number,
  attempt: number,
): RoundPlan {
  const mode = getMode(config.modeId);
  return {
    index,
    attempt,
    seed: roundSeed(state.seed, index, attempt),
    config: mode.plan(state.modeState, config),
  };
}

function voidRound(
  state: SessionState,
  plan: RoundPlan,
  reason: Extract<Phase, { kind: "void" }>["reason"],
): SessionState {
  return {
    ...state,
    voids: state.voids + 1,
    voidStreak: state.voidStreak + 1,
    phase: { kind: "void", plan, reason },
  };
}

function submit(
  state: SessionState,
  phase: RecallPhase,
  t: number,
  timedOut: boolean,
): SessionState {
  const config = state.config!;
  const s = score(phase.pattern, phase.selection);
  const firstAdd = phase.events.find((e) => e.op === "add");
  const result: RoundResult = {
    plan: phase.plan,
    pattern: phase.pattern,
    selection: phase.selection,
    ...s,
    passed: s.accuracy >= config.passThreshold,
    exposure: phase.exposure,
    recallTimeMs: Math.max(0, t - phase.startedAt),
    firstTapMs: firstAdd ? Math.max(0, firstAdd.t - phase.startedAt) : null,
    timedOut,
    events: phase.events,
  };
  const mode = getMode(config.modeId);
  const scored: SessionState = {
    ...state,
    results: [...state.results, result],
    voidStreak: 0,
    modeState: mode.update(state.modeState, result),
  };
  if (config.feedback === "each-round") return { ...scored, phase: { kind: "result", result } };
  return advance(scored, config);
}

/** After a counted round: finish the session or plan the next round. */
function advance(state: SessionState, config: SessionConfig): SessionState {
  const mode = getMode(config.modeId);
  const counted = state.results.length;
  if (mode.isDone(state.modeState, counted, config)) {
    const summary = summarizeSession(
      state.results,
      state.voids,
      mode.summarize(state.modeState, state.results),
    );
    return { ...state, phase: { kind: "complete", summary } };
  }
  return { ...state, phase: { kind: "ready", plan: planRound(state, config, counted, 0) } };
}

function insertSorted(cells: readonly CellIndex[], cell: CellIndex): CellIndex[] {
  const out = [...cells];
  let i = out.length;
  while (i > 0 && out[i - 1]! > cell) i--;
  out.splice(i, 0, cell);
  return out;
}

/** Selection implied by an event log — used to verify the stored selection and by replays. */
export function selectionFromEvents(events: readonly SelectionEvent[]): CellIndex[] {
  const set = new Set<CellIndex>();
  for (const e of events) {
    if (e.op === "add") set.add(e.cell);
    else set.delete(e.cell);
  }
  return [...set].sort((a, b) => a - b);
}
