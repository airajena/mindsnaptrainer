import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { score } from "../scoring";

const sets = fc
  .integer({ min: 1, max: 144 })
  .chain((total) =>
    fc.tuple(
      fc.uniqueArray(fc.integer({ min: 0, max: total - 1 }), { maxLength: total }),
      fc.uniqueArray(fc.integer({ min: 0, max: total - 1 }), { maxLength: total }),
    ),
  );

describe("score", () => {
  it("hits + misses = k and hits + falseTaps = |S|", () => {
    fc.assert(
      fc.property(sets, ([t, s]) => {
        const r = score(t, s);
        return r.hits + r.misses === t.length && r.hits + r.falseTaps === s.length;
      }),
    );
  });

  it("accuracy is in [0, 1]", () => {
    fc.assert(
      fc.property(sets, ([t, s]) => {
        const { accuracy } = score(t, s);
        return accuracy >= 0 && accuracy <= 1;
      }),
    );
  });

  it("accuracy = 1 ⇔ S = T ⇔ perfect", () => {
    fc.assert(
      fc.property(sets, ([t, s]) => {
        const r = score(t, s);
        const same = t.length === s.length && t.every((c) => s.includes(c));
        return (r.accuracy === 1) === same && r.perfect === same;
      }),
    );
  });

  it("a set scored against itself is perfect", () => {
    fc.assert(fc.property(sets, ([t]) => score(t, t).perfect));
  });

  it("matches worked examples", () => {
    // 16 hits of 18, 1 false tap → 16 / (18 + 1)
    const t = Array.from({ length: 18 }, (_, i) => i);
    const s = [...t.slice(0, 16), 40];
    expect(score(t, s)).toEqual({
      hits: 16,
      misses: 2,
      falseTaps: 1,
      accuracy: 16 / 19,
      perfect: false,
    });
  });

  it("penalises spamming: selecting everything is not a good score", () => {
    const t = [1, 2, 3];
    const everything = Array.from({ length: 64 }, (_, i) => i);
    expect(score(t, everything).accuracy).toBeCloseTo(3 / 64);
  });

  it("empty pattern and empty selection is vacuously perfect", () => {
    expect(score([], []).accuracy).toBe(1);
  });
});
