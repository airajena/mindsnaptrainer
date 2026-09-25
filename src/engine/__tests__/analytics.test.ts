import { describe, expect, it } from "vitest";
import { patternFeatures, summarizeSession } from "../analytics";
import { clusterSizes, isEdgeCell, neighbours } from "../grid";
import type { RoundResult } from "../types";
import { config, exposure } from "./helpers";

function result(over: Partial<RoundResult>): RoundResult {
  return {
    plan: { index: 0, attempt: 0, seed: 1, config: config() },
    pattern: [1, 2, 3],
    selection: [1, 2, 3],
    hits: 3,
    misses: 0,
    falseTaps: 0,
    accuracy: 1,
    perfect: true,
    passed: true,
    exposure: exposure(),
    recallTimeMs: 2000,
    firstTapMs: 500,
    timedOut: false,
    events: [],
    ...over,
  };
}

describe("summarizeSession", () => {
  it("computes means, perfects and best/worst", () => {
    const s = summarizeSession(
      [
        result({ accuracy: 0.5, hits: 2, perfect: false, recallTimeMs: 1000, firstTapMs: null }),
        result({ accuracy: 1, hits: 3, recallTimeMs: 3000, firstTapMs: 400 }),
        result({ accuracy: 0.75, hits: 3, perfect: false, recallTimeMs: 2000, firstTapMs: 600 }),
      ],
      2,
      { kind: "fixed" },
    );
    expect(s.counted).toBe(3);
    expect(s.voids).toBe(2);
    expect(s.meanAccuracy).toBeCloseTo(0.75);
    expect(s.meanHits).toBeCloseTo(8 / 3);
    expect(s.meanTarget).toBe(3);
    expect(s.perfectRounds).toBe(1);
    expect(s.bestIndex).toBe(1);
    expect(s.worstIndex).toBe(0);
    expect(s.meanRecallMs).toBe(2000);
    expect(s.meanFirstTapMs).toBe(500);
  });

  it("handles an empty session", () => {
    const s = summarizeSession([], 0, { kind: "fixed" });
    expect(s.counted).toBe(0);
    expect(s.meanAccuracy).toBe(0);
    expect(s.meanFirstTapMs).toBeNull();
  });
});

describe("patternFeatures", () => {
  it("counts clusters, isolated, edge cells and quadrants", () => {
    // 4×4:  X X . .
    //       . . . .
    //       . . X .
    //       . . . X
    const f = patternFeatures([0, 1, 10, 15], 4);
    expect(f.clusters).toBe(3);
    expect(f.largestCluster).toBe(2);
    expect(f.isolatedCells).toBe(2);
    expect(f.edgeCells).toBe(3);
    expect(f.quadrantCounts).toEqual([2, 0, 0, 2]);
  });

  it("handles an empty pattern", () => {
    expect(patternFeatures([], 8).largestCluster).toBe(0);
  });
});

describe("grid", () => {
  it("neighbours respects edges", () => {
    expect(neighbours(0, 4).sort()).toEqual([1, 4]);
    expect(neighbours(5, 4).sort((a, b) => a - b)).toEqual([1, 4, 6, 9]);
    expect(neighbours(15, 4).sort((a, b) => a - b)).toEqual([11, 14]);
  });

  it("doesn't wrap rows", () => {
    expect(neighbours(3, 4)).not.toContain(4);
    expect(clusterSizes([3, 4], 4)).toEqual([1, 1]);
  });

  it("isEdgeCell", () => {
    expect(isEdgeCell(0, 4)).toBe(true);
    expect(isEdgeCell(5, 4)).toBe(false);
    expect(isEdgeCell(7, 4)).toBe(true);
    expect(isEdgeCell(13, 4)).toBe(true);
  });
});
