import { clusterSizes, neighbours } from "./grid";
import { mulberry32, randInt } from "./rng";
import type { CellIndex, PatternStyle } from "./types";

/** `spread` rejects patterns whose largest 4-connected cluster exceeds this. */
export const SPREAD_MAX_CLUSTER = 3;
const SPREAD_MAX_ATTEMPTS = 200;

function assertRange(n: number, k: number): void {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`n=${n} must be a positive integer`);
  if (!Number.isInteger(k) || k < 1 || k > n * n) {
    throw new RangeError(`k=${k} out of range for ${n}x${n}`);
  }
}

/** Uniform: partial Fisher–Yates, exactly k unique cells, sorted. */
export function generateUniform(n: number, k: number, rand: () => number): CellIndex[] {
  assertRange(n, k);
  const total = n * n;
  const cells = Array.from({ length: total }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + randInt(rand, total - i);
    const tmp = cells[i]!;
    cells[i] = cells[j]!;
    cells[j] = tmp;
  }
  return cells.slice(0, k).sort((a, b) => a - b);
}

/**
 * Spread: uniform patterns with no cluster larger than SPREAD_MAX_CLUSTER.
 * Rejection sampling; if no pattern qualifies within the attempt budget
 * (dense boards make it impossible), falls back to the last uniform draw.
 */
export function generateSpread(n: number, k: number, rand: () => number): CellIndex[] {
  let pattern = generateUniform(n, k, rand);
  for (let attempt = 1; attempt < SPREAD_MAX_ATTEMPTS; attempt++) {
    if ((clusterSizes(pattern, n)[0] ?? 0) <= SPREAD_MAX_CLUSTER) return pattern;
    pattern = generateUniform(n, k, rand);
  }
  return pattern;
}

/**
 * Clustered: 2–4 seed cells, then grow by adding a random free neighbour of a
 * random cluster. A boxed-in cluster simply stops growing. Terminates with
 * exactly k cells: while a free cell exists, the grid is connected, so at
 * least one cluster always borders a free cell.
 */
export function generateClustered(n: number, k: number, rand: () => number): CellIndex[] {
  assertRange(n, k);
  const total = n * n;
  const taken = new Set<CellIndex>();
  const clusters: CellIndex[][] = [];

  const seeds = Math.min(k, 2 + randInt(rand, 3));
  for (let i = 0; i < seeds; i++) {
    const free: CellIndex[] = [];
    for (let c = 0; c < total; c++) if (!taken.has(c)) free.push(c);
    const cell = free[randInt(rand, free.length)]!;
    taken.add(cell);
    clusters.push([cell]);
  }

  while (taken.size < k) {
    // Frontier per cluster, computed fresh (k ≤ 72, n² ≤ 144: cheap).
    const growable: CellIndex[][] = [];
    for (const cluster of clusters) {
      const frontier = new Set<CellIndex>();
      for (const c of cluster)
        for (const nb of neighbours(c, n)) if (!taken.has(nb)) frontier.add(nb);
      if (frontier.size > 0) growable.push([...frontier].sort((a, b) => a - b));
    }
    const pick = randInt(rand, growable.length);
    const frontier = growable[pick]!;
    const cell = frontier[randInt(rand, frontier.length)]!;
    taken.add(cell);
    // Attach to the first cluster that owns a neighbour of `cell`.
    const owner = clusters.find((cl) => cl.some((c) => neighbours(c, n).includes(cell)))!;
    owner.push(cell);
  }

  return [...taken].sort((a, b) => a - b);
}

export function generatePattern(
  params: { boardSize: number; cellCount: number; patternStyle: PatternStyle },
  seed: number,
): CellIndex[] {
  const rand = mulberry32(seed);
  const { boardSize: n, cellCount: k } = params;
  switch (params.patternStyle) {
    case "uniform":
      return generateUniform(n, k, rand);
    case "spread":
      return generateSpread(n, k, rand);
    case "clustered":
      return generateClustered(n, k, rand);
    default: {
      const never: never = params.patternStyle;
      throw new Error(`unknown pattern style ${String(never)}`);
    }
  }
}
