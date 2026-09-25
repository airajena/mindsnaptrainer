import type { CellIndex } from "./types";

export interface Score {
  hits: number;
  misses: number;
  falseTaps: number;
  /** Jaccard index |T ∩ S| / |T ∪ S|. Penalises false taps, so spamming can't win. */
  accuracy: number;
  perfect: boolean;
}

/** Scores a selection against a pattern. Both must be duplicate-free. */
export function score(pattern: readonly CellIndex[], selection: readonly CellIndex[]): Score {
  const target = new Set(pattern);
  let hits = 0;
  for (const c of selection) if (target.has(c)) hits++;
  const falseTaps = selection.length - hits;
  const misses = pattern.length - hits;
  const union = pattern.length + falseTaps;
  const accuracy = union === 0 ? 1 : hits / union;
  return { hits, misses, falseTaps, accuracy, perfect: misses === 0 && falseTaps === 0 };
}
