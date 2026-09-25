import { createStore, type StoreApi } from "zustand/vanilla";
import type { CellIndex } from "@/engine/types";

/**
 * Per-cell selection + keyboard focus for one board, shaped for narrow
 * subscriptions: each Cell subscribes to `selected[i]` and `focus === i`, so
 * a tap re-renders exactly one cell. In a session this mirrors the engine's
 * recall selection (the engine stays the source of truth).
 */
export interface SelectionState {
  selected: readonly boolean[];
  /** Keyboard focus (roving tabindex). Always a valid cell index. */
  focus: CellIndex;
}

export type SelectionStore = StoreApi<SelectionState>;

export function createSelectionStore(n: number): SelectionStore {
  return createStore<SelectionState>(() => ({ selected: new Array(n * n).fill(false), focus: 0 }));
}

export function isSelected(store: SelectionStore, cell: CellIndex): boolean {
  return store.getState().selected[cell] ?? false;
}

export function setCell(store: SelectionStore, cell: CellIndex, on: boolean): void {
  const { selected } = store.getState();
  if (selected[cell] === on || cell < 0 || cell >= selected.length) return;
  const next = selected.slice();
  next[cell] = on;
  store.setState({ selected: next });
}

/** Replace the whole selection (e.g. syncing from the engine). Skips no-op updates. */
export function setSelection(store: SelectionStore, cells: readonly CellIndex[], n: number): void {
  const next: boolean[] = new Array(n * n).fill(false);
  for (const c of cells) if (c >= 0 && c < next.length) next[c] = true;
  const { selected } = store.getState();
  if (selected.length === next.length && selected.every((v, i) => v === next[i])) return;
  store.setState({ selected: next });
}

export function resetSelection(store: SelectionStore, n: number): void {
  store.setState({ selected: new Array(n * n).fill(false), focus: 0 });
}

export function countSelected(store: SelectionStore): number {
  let count = 0;
  for (const v of store.getState().selected) if (v) count++;
  return count;
}
