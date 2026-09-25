import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { mulberry32, randInt, roundSeed, splitmix32 } from "../rng";

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("produces floats in [0, 1)", () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const r = mulberry32(seed);
        for (let i = 0; i < 20; i++) {
          const x = r();
          if (x < 0 || x >= 1) return false;
        }
        return true;
      }),
    );
  });

  it("is roughly uniform", () => {
    const r = mulberry32(7);
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 100_000; i++) buckets[Math.floor(r() * 10)]++;
    for (const b of buckets) expect(Math.abs(b - 10_000)).toBeLessThan(500);
  });
});

describe("splitmix32", () => {
  it("returns uint32 and is deterministic", () => {
    fc.assert(
      fc.property(fc.integer(), (x) => {
        const h = splitmix32(x);
        return h === splitmix32(x) && h >>> 0 === h;
      }),
    );
  });
});

describe("roundSeed", () => {
  it("differs by round index and by attempt", () => {
    const seeds = new Set<number>();
    for (let i = 0; i < 50; i++) for (let a = 0; a < 5; a++) seeds.add(roundSeed(123, i, a));
    expect(seeds.size).toBe(250);
  });

  it("differs by session seed", () => {
    expect(roundSeed(1, 0, 0)).not.toBe(roundSeed(2, 0, 0));
  });
});

describe("randInt", () => {
  it("stays in [0, max)", () => {
    const r = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const x = randInt(r, 7);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(7);
    }
  });
});
