import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  generateClustered,
  generatePattern,
  generateSpread,
  generateUniform,
  SPREAD_MAX_CLUSTER,
} from "../generator";
import { clusterSizes } from "../grid";
import { mulberry32 } from "../rng";
import type { PatternStyle } from "../types";

const boardAndCount = fc
  .integer({ min: 4, max: 12 })
  .chain((n) =>
    fc.record({ n: fc.constant(n), k: fc.integer({ min: 1, max: Math.floor((n * n) / 2) }) }),
  );

const styles: PatternStyle[] = ["uniform", "spread", "clustered"];

function isValidPattern(cells: number[], n: number, k: number): boolean {
  if (cells.length !== k) return false;
  if (new Set(cells).size !== k) return false;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]!;
    if (!Number.isInteger(c) || c < 0 || c >= n * n) return false;
    if (i > 0 && cells[i - 1]! >= c) return false;
  }
  return true;
}

describe("generatePattern", () => {
  for (const style of styles) {
    it(`${style}: exactly k unique, in-range, sorted cells`, () => {
      fc.assert(
        fc.property(boardAndCount, fc.integer(), ({ n, k }, seed) => {
          const cells = generatePattern({ boardSize: n, cellCount: k, patternStyle: style }, seed);
          return isValidPattern(cells, n, k);
        }),
        { numRuns: 200 },
      );
    });

    it(`${style}: same seed ⇒ same pattern`, () => {
      fc.assert(
        fc.property(boardAndCount, fc.integer(), ({ n, k }, seed) => {
          const p = { boardSize: n, cellCount: k, patternStyle: style } as const;
          expect(generatePattern(p, seed)).toEqual(generatePattern(p, seed));
        }),
        { numRuns: 100 },
      );
    });
  }

  it("different seeds give different patterns (almost always)", () => {
    const p = { boardSize: 8, cellCount: 18, patternStyle: "uniform" } as const;
    const seen = new Set<string>();
    for (let s = 0; s < 200; s++) seen.add(generatePattern(p, s).join(","));
    expect(seen.size).toBe(200);
  });

  it("throws on an unknown style", () => {
    expect(() =>
      generatePattern({ boardSize: 8, cellCount: 4, patternStyle: "zigzag" as PatternStyle }, 1),
    ).toThrow();
  });
});

describe("generateUniform", () => {
  it("rejects bad k and n", () => {
    const r = mulberry32(1);
    expect(() => generateUniform(8, 0, r)).toThrow(RangeError);
    expect(() => generateUniform(8, 65, r)).toThrow(RangeError);
    expect(() => generateUniform(0, 1, r)).toThrow(RangeError);
    expect(() => generateUniform(8, 2.5, r)).toThrow(RangeError);
  });

  it("covers every cell about equally often", () => {
    const r = mulberry32(99);
    const counts = new Array(64).fill(0);
    const runs = 20_000;
    for (let i = 0; i < runs; i++) for (const c of generateUniform(8, 18, r)) counts[c]++;
    const expected = (runs * 18) / 64;
    for (const c of counts) expect(Math.abs(c - expected) / expected).toBeLessThan(0.06);
  });
});

describe("generateSpread", () => {
  it("keeps clusters small when that's achievable", () => {
    const r = mulberry32(5);
    for (let i = 0; i < 200; i++) {
      const cells = generateSpread(8, 18, r);
      expect(clusterSizes(cells, 8)[0]).toBeLessThanOrEqual(SPREAD_MAX_CLUSTER);
    }
  });

  it("falls back to a valid uniform pattern when it can't satisfy the constraint", () => {
    // 4×4 with 8 cells: a large cluster is nearly unavoidable.
    const cells = generateSpread(4, 8, mulberry32(3));
    expect(isValidPattern(cells, 4, 8)).toBe(true);
  });
});

describe("generateClustered", () => {
  it("produces fewer, larger clusters than uniform on average", () => {
    const r1 = mulberry32(11);
    const r2 = mulberry32(11);
    let clustered = 0;
    let uniform = 0;
    for (let i = 0; i < 300; i++) {
      clustered += clusterSizes(generateClustered(8, 18, r1), 8).length;
      uniform += clusterSizes(generateUniform(8, 18, r2), 8).length;
    }
    expect(clustered).toBeLessThan(uniform * 0.6);
  });

  it("fills the whole board when k = n² (clusters boxed in)", () => {
    // 4×4, k = 16 forces filling the whole board, which exercises re-seeding.
    for (let s = 0; s < 50; s++) {
      expect(isValidPattern(generateClustered(4, 16, mulberry32(s)), 4, 16)).toBe(true);
    }
  });

  it("handles k smaller than the seed count", () => {
    for (let s = 0; s < 20; s++) {
      expect(generateClustered(4, 1, mulberry32(s))).toHaveLength(1);
    }
  });

  it("rejects bad k", () => {
    expect(() => generateClustered(4, 17, mulberry32(1))).toThrow(RangeError);
  });
});
