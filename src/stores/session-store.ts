import { createStore, type StoreApi } from "zustand/vanilla";
import { INITIAL_STATE, reduce } from "@/engine/machine";
import type { RoundPlan, SessionEvent, SessionState } from "@/engine/types";
import {
  createSelectionStore,
  resetSelection,
  type SelectionStore,
  setSelection,
} from "./selection-store";

/**
 * One session: the engine's state plus a per-cell selection mirror for the
 * board. The engine is the source of truth; the selection store is derived
 * from it after every dispatch so a tap re-renders one cell only.
 */
export interface SessionStoreState {
  state: SessionState;
}

export interface SessionStore {
  store: StoreApi<SessionStoreState>;
  selection: SelectionStore;
  /** Applies an event. Returns false if it was a no-op for the current phase. */
  dispatch: (event: SessionEvent) => boolean;
  get: () => SessionState;
}

/** Max board size, so the selection store never needs re-creating. */
const MAX_N = 12;

export function createSessionStore(initial: SessionState = INITIAL_STATE): SessionStore {
  const store = createStore<SessionStoreState>(() => ({ state: initial }));
  const selection = createSelectionStore(MAX_N);

  const dispatch = (event: SessionEvent): boolean => {
    const prev = store.getState().state;
    const next = reduce(prev, event);
    if (next === prev) return false;
    syncSelection(prev, next, selection);
    store.setState({ state: next });
    return true;
  };

  return { store, selection, dispatch, get: () => store.getState().state };
}

function syncSelection(prev: SessionState, next: SessionState, selection: SelectionStore): void {
  const p = next.phase;
  if (p.kind === "recall") {
    setSelection(selection, p.selection, p.plan.config.boardSize);
    return;
  }
  // Entering a new round: clear before the board shows it.
  if (p.kind === "ready" && prev.phase.kind !== "ready") {
    resetSelection(selection, p.plan.config.boardSize);
  }
}

/** The current round's plan, whatever the phase (null outside a round). */
export function currentPlan(state: SessionState): RoundPlan | null {
  const p = state.phase;
  switch (p.kind) {
    case "ready":
    case "countdown":
    case "memorize":
    case "recall":
    case "void":
      return p.plan;
    case "result":
      return p.result.plan;
    case "setup":
    case "complete":
      return null;
    default: {
      const never: never = p;
      return never;
    }
  }
}
