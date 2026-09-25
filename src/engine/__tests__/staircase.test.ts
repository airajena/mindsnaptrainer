import { describe, expect, it } from "vitest";
import { INITIAL_STATE, reduce } from "../machine";
import { CAPACITY, capacityMode } from "../modes/capacity";
import { SPEED, speedMode, speedStep } from "../modes/speed";
import { mulberry32 } from "../rng";
import { createStaircase, estimateThreshold, type Staircase, stepStaircase } from "../staircase";
import type { RoundResult, SessionState } from "../types";
import { config, exposure } from "./helpers";

const intStep = (level: number, dir: -1 | 1) => level - dir; // harder = +1

describe("staircase (2-down / 1-up)", () => {
  it("steps down after two passes and up after one fail", () => {
    let s = createStaircase(8);
    s = stepStaircase(s, true, intStep);
    expect(s.level).toBe(8);
    s = stepStaircase(s, true, intStep);
    expect(s.level).toBe(9);
    s = stepStaircase(s, false, intStep);
    expect(s.level).toBe(8);
    expect(s.track).toEqual([8, 8, 9]);
  });

  it("records reversals at the level where the direction changed", () => {
    let s = createStaircase(8);
    for (const p of [true, true, true, true, false, true, true, false])
      s = stepStaircase(s, p, intStep);
    // 8,8 → 9; 9,9 → 10; fail at 10 → 9 (reversal at 10); 9,9 → 10 (reversal at 9); fail → 9 (reversal at 10)
    expect(s.reversalLevels).toEqual([10, 9, 10]);
    expect(s.reversalIndexes).toEqual([4, 6, 7]);
  });

  it("a fail resets the pass streak", () => {
    let s = createStaircase(8);
    s = stepStaircase(s, true, intStep);
    s = stepStaircase(s, false, intStep);
    s = stepStaircase(s, true, intStep);
    expect(s.level).toBe(7);
  });

  it("a clamped step doesn't count as a move or a reversal", () => {
    const clamp = (level: number, dir: -1 | 1) => Math.max(3, level + dir);
    let s = createStaircase(3);
    s = stepStaircase(s, true, clamp);
    s = stepStaircase(s, true, clamp); // would go to 2, clamped to 3
    expect(s.level).toBe(3);
    expect(s.direction).toBe(0);
    s = stepStaircase(s, false, clamp);
    expect(s.level).toBe(4);
    expect(s.reversalLevels).toEqual([]);
  });

  it("estimates from the last reversals, null with fewer than two", () => {
    const s: Staircase = {
      ...createStaircase(0),
      reversalLevels: [10, 14, 12, 16, 14, 16, 14, 18],
    };
    const est = estimateThreshold(s, 6)!;
    expect(est.threshold).toBeCloseTo((12 + 16 + 14 + 16 + 14 + 18) / 6);
    expect(est.spread).toBeGreaterThan(0);
    expect(estimateThreshold({ ...s, reversalLevels: [5] })).toBeNull();
  });
});

describe("speedStep", () => {
  it("uses coarse steps for the first two reversals, fine after", () => {
    expect(speedStep(2000, -1, 0)).toBe(1700);
    expect(speedStep(2000, 1, 1)).toBe(2300);
    expect(speedStep(2000, -1, 2)).toBe(1860);
    expect(speedStep(2000, 1, 5)).toBe(2140);
  });
  it("clamps to 150–5000 ms", () => {
    expect(speedStep(160, -1, 5)).toBe(150);
    expect(speedStep(4900, 1, 0)).toBe(5000);
  });
});

/** Fake RoundResult with just what the modes read. */
function fakeResult(passed: boolean, cellCount: number, exposureMs: number): RoundResult {
  return {
    plan: { index: 0, attempt: 0, seed: 0, config: { ...config(), cellCount, exposureMs } },
    pattern: [],
    selection: [],
    hits: 0,
    misses: 0,
    falseTaps: 0,
    accuracy: passed ? 1 : 0,
    perfect: passed,
    passed,
    exposure: exposure(),
    recallTimeMs: 0,
    firstTapMs: null,
    timedOut: false,
    events: [],
  };
}

/**
 * Simulated observers with a known psychometric function. A 2-down/1-up
 * staircase converges on the 70.7% point, so that's the "true" threshold.
 */
const P707 = Math.log(1 / Math.SQRT1_2 - 1); // logit offset of the 70.7% point

function runCapacity(trueK: number, slope: number, rand: () => number): number | null {
  const cfg = config({ modeId: "capacity", boardSize: 8, exposureMs: 1000 });
  let s = capacityMode.init(cfg);
  const results: RoundResult[] = [];
  // p(pass | k) = 1 / (1 + exp((k − c)/slope)), with c chosen so p(trueK) = 0.707.
  const c = trueK - slope * P707;
  while (!capacityMode.isDone(s, results.length, cfg)) {
    const k = capacityMode.plan(s, cfg).cellCount;
    const p = 1 / (1 + Math.exp((k - c) / slope));
    const r = fakeResult(rand() < p, k, 1000);
    results.push(r);
    s = capacityMode.update(s, r);
  }
  const summary = capacityMode.summarize(s, results);
  return summary.kind === "capacity" ? summary.threshold : null;
}

function runSpeed(trueMs: number, slope: number, rand: () => number): number | null {
  const cfg = config({ modeId: "speed", boardSize: 8, cellCount: 18 });
  let s = speedMode.init(cfg);
  const results: RoundResult[] = [];
  // p(pass | t) = 1 / (1 + exp(−(ln t − ln c)/slope)), with p(trueMs) = 0.707.
  const c = trueMs * Math.exp(slope * P707);
  while (!speedMode.isDone(s, results.length, cfg)) {
    const t = speedMode.plan(s, cfg).exposureMs;
    const p = 1 / (1 + Math.exp(-(Math.log(t) - Math.log(c)) / slope));
    const r = fakeResult(rand() < p, 18, t);
    results.push(r);
    s = speedMode.update(s, r);
  }
  const summary = speedMode.summarize(s, results);
  return summary.kind === "speed" ? summary.threshold : null;
}

describe("simulated-observer convergence (1,000 sessions each)", () => {
  for (const trueK of [6, 12, 17]) {
    it(`capacity estimates converge on k* = ${trueK}`, () => {
      const rand = mulberry32(trueK);
      const est: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const t = runCapacity(trueK, 1, rand);
        if (t !== null) est.push(t);
      }
      const mean = est.reduce((a, b) => a + b, 0) / est.length;
      const within2 = est.filter((e) => Math.abs(e - trueK) <= 2).length / est.length;
      expect(est.length).toBeGreaterThan(990);
      expect(Math.abs(mean - trueK)).toBeLessThan(1);
      expect(within2).toBeGreaterThan(0.85);
    });
  }

  for (const trueMs of [400, 840, 2500]) {
    it(`speed estimates converge on t* = ${trueMs} ms`, () => {
      const rand = mulberry32(trueMs);
      const est: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const t = runSpeed(trueMs, 0.15, rand);
        if (t !== null) est.push(t);
      }
      const logMean = Math.exp(est.reduce((a, b) => a + Math.log(b), 0) / est.length);
      const within25 = est.filter((e) => Math.abs(e / trueMs - 1) <= 0.25).length / est.length;
      expect(est.length).toBeGreaterThan(990);
      expect(Math.abs(logMean / trueMs - 1)).toBeLessThan(0.12);
      expect(within25).toBeGreaterThan(0.8);
    });
  }

  it("always stops within 30 counted rounds", () => {
    const rand = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const cfg = config({ modeId: "capacity" });
      let s = capacityMode.init(cfg);
      let n = 0;
      while (!capacityMode.isDone(s, n, cfg)) {
        s = capacityMode.update(s, fakeResult(rand() < 0.5, 8, 1000));
        n++;
      }
      expect(n).toBeLessThanOrEqual(CAPACITY.maxRounds);
    }
    expect(SPEED.maxRounds).toBe(30);
  });
});

describe("capacity mode through the machine", () => {
  it("raises k after two perfect rounds and summarises with a track", () => {
    let s: SessionState = reduce(INITIAL_STATE, {
      type: "START_SESSION",
      config: config({ modeId: "capacity", boardSize: 8, exposureMs: 1000, feedback: "end" }),
      seed: 9,
    });
    const ks: number[] = [];
    for (let round = 0; round < 3; round++) {
      s = reduce(s, { type: "BEGIN_ROUND" });
      s = reduce(s, { type: "COUNTDOWN_DONE" });
      s = reduce(s, { type: "EXPOSURE_DONE", exposure: exposure(), recallStartedAt: 2000 });
      if (s.phase.kind !== "recall") throw new Error(s.phase.kind);
      ks.push(s.phase.plan.config.cellCount);
      for (const cell of s.phase.pattern)
        s = reduce(s, { type: "TOGGLE", cell, op: "add", t: 2100 });
      s = reduce(s, { type: "SUBMIT", t: 3000 });
    }
    expect(ks).toEqual([8, 8, 9]);
  });

  it("caps k at half the board and floors it at 3", () => {
    const cfg = config({ modeId: "capacity", boardSize: 4 });
    let st = capacityMode.init(cfg);
    for (let i = 0; i < 20; i++) st = capacityMode.update(st, fakeResult(true, 8, 1000));
    expect(capacityMode.plan(st, cfg).cellCount).toBe(8);
    st = capacityMode.init(config({ modeId: "capacity", boardSize: 8 }));
    for (let i = 0; i < 20; i++) st = capacityMode.update(st, fakeResult(false, 8, 1000));
    expect(capacityMode.plan(st, cfg).cellCount).toBe(3);
  });

  it("speed mode plans the staircase exposure", () => {
    const cfg = config({ modeId: "speed" });
    let st = speedMode.init(cfg);
    expect(speedMode.plan(st, cfg).exposureMs).toBe(2000);
    st = speedMode.update(st, fakeResult(true, 18, 2000));
    st = speedMode.update(st, fakeResult(true, 18, 2000));
    expect(speedMode.plan(st, cfg).exposureMs).toBe(1700);
    expect(speedMode.summarize(st, []).kind).toBe("speed");
  });
});
