import { describe, expect, it } from "vitest";
import { bitsPerSecond, informationBits } from "../difficulty";

/** Exact log2 C(N, k) via BigInt for comparison. */
function exactBits(total: number, k: number): number {
  let num = 1n;
  let den = 1n;
  for (let i = 1; i <= k; i++) {
    num *= BigInt(total - k + i);
    den *= BigInt(i);
  }
  const c = num / den;
  return Math.log2(Number(c));
}

describe("informationBits", () => {
  it("8×8 with 18 cells ≈ 51.7 bits", () => {
    expect(informationBits(8, 18)).toBeCloseTo(51.7, 1);
  });

  it("matches the exact binomial for a range of boards", () => {
    for (const [n, k] of [
      [4, 2],
      [6, 10],
      [7, 14],
      [8, 18],
      [10, 20],
      [12, 72],
    ] as const) {
      expect(informationBits(n, k)).toBeCloseTo(exactBits(n * n, k), 6);
    }
  });

  it("is 0 for k = 0 and for out-of-range k", () => {
    expect(informationBits(8, 0)).toBe(0);
    expect(informationBits(8, 65)).toBe(0);
    expect(informationBits(8, -1)).toBe(0);
  });

  it("is symmetric: C(N, k) = C(N, N−k)", () => {
    expect(informationBits(8, 10)).toBeCloseTo(informationBits(8, 54), 9);
  });
});

describe("bitsPerSecond", () => {
  it("divides by exposure in seconds", () => {
    expect(bitsPerSecond(8, 18, 500)).toBeCloseTo(informationBits(8, 18) * 2, 9);
  });

  it("is 0 for non-positive exposure", () => {
    expect(bitsPerSecond(8, 18, 0)).toBe(0);
  });
});
