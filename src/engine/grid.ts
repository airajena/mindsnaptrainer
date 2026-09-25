import type { CellIndex } from "./types";

/** 4-connected neighbours of a cell on an n×n board. */
export function neighbours(cell: CellIndex, n: number): CellIndex[] {
  const row = Math.floor(cell / n);
  const col = cell % n;
  const out: CellIndex[] = [];
  if (row > 0) out.push(cell - n);
  if (row < n - 1) out.push(cell + n);
  if (col > 0) out.push(cell - 1);
  if (col < n - 1) out.push(cell + 1);
  return out;
}

/** Sizes of the 4-connected clusters formed by `cells`, largest first. */
export function clusterSizes(cells: readonly CellIndex[], n: number): number[] {
  const inSet = new Set(cells);
  const seen = new Set<CellIndex>();
  const sizes: number[] = [];
  for (const start of cells) {
    if (seen.has(start)) continue;
    let size = 0;
    const stack = [start];
    seen.add(start);
    while (stack.length > 0) {
      const c = stack.pop()!;
      size++;
      for (const nb of neighbours(c, n)) {
        if (inSet.has(nb) && !seen.has(nb)) {
          seen.add(nb);
          stack.push(nb);
        }
      }
    }
    sizes.push(size);
  }
  return sizes.sort((a, b) => b - a);
}

export function isEdgeCell(cell: CellIndex, n: number): boolean {
  const row = Math.floor(cell / n);
  const col = cell % n;
  return row === 0 || col === 0 || row === n - 1 || col === n - 1;
}
