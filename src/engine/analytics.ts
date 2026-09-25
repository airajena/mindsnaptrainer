import { clusterSizes, isEdgeCell, neighbours } from "./grid";
import type { CellIndex, ModeSummary, RoundResult, SessionSummary } from "./types";

const mean = (xs: readonly number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Session metrics over counted rounds (void rounds never reach `results`).
 * Best/worst tie-break on the earliest round so the choice is stable.
 */
export function summarizeSession(
  results: readonly RoundResult[],
  voids: number,
  mode: ModeSummary,
): SessionSummary {
  let bestIndex = 0;
  let worstIndex = 0;
  results.forEach((r, i) => {
    if (r.accuracy > results[bestIndex]!.accuracy) bestIndex = i;
    if (r.accuracy < results[worstIndex]!.accuracy) worstIndex = i;
  });
  const firstTaps = results.flatMap((r) => (r.firstTapMs === null ? [] : [r.firstTapMs]));
  return {
    counted: results.length,
    voids,
    meanAccuracy: mean(results.map((r) => r.accuracy)),
    meanHits: mean(results.map((r) => r.hits)),
    meanTarget: mean(results.map((r) => r.pattern.length)),
    perfectRounds: results.filter((r) => r.perfect).length,
    bestIndex,
    worstIndex,
    meanRecallMs: mean(results.map((r) => r.recallTimeMs)),
    meanFirstTapMs: firstTaps.length === 0 ? null : mean(firstTaps),
    mode,
  };
}

export interface PatternFeatures {
  clusters: number;
  largestCluster: number;
  /** Cells with no 4-connected neighbour in the pattern. */
  isolatedCells: number;
  edgeCells: number;
  /** Cells per quadrant: [top-left, top-right, bottom-left, bottom-right]. Odd n: middle row/col goes to the lower/right half. */
  quadrantCounts: [number, number, number, number];
}

export function patternFeatures(pattern: readonly CellIndex[], n: number): PatternFeatures {
  const sizes = clusterSizes(pattern, n);
  const set = new Set(pattern);
  const half = Math.floor(n / 2);
  const quadrantCounts: [number, number, number, number] = [0, 0, 0, 0];
  let isolatedCells = 0;
  let edgeCells = 0;
  for (const c of pattern) {
    if (!neighbours(c, n).some((nb) => set.has(nb))) isolatedCells++;
    if (isEdgeCell(c, n)) edgeCells++;
    const q = (Math.floor(c / n) >= half ? 2 : 0) + (c % n >= half ? 1 : 0);
    quadrantCounts[q as 0 | 1 | 2 | 3]++;
  }
  return {
    clusters: sizes.length,
    largestCluster: sizes[0] ?? 0,
    isolatedCells,
    edgeCells,
    quadrantCounts,
  };
}
