import { describe, expect, it } from "vitest";
import { countBy, mean, percentile, stdDev } from "./stats";

describe("lab stats", () => {
  it("percentile uses nearest rank", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(xs, 50)).toBe(5);
    expect(percentile(xs, 95)).toBe(10);
    expect(percentile(xs, 0)).toBe(1);
    expect(percentile([], 50)).toBeNaN();
  });

  it("mean and stdDev", () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(stdDev([2, 4, 6])).toBe(2);
    expect(stdDev([5])).toBe(0);
    expect(mean([])).toBeNaN();
  });

  it("countBy sorts by key", () => {
    expect(countBy([60, 61, 60, 59])).toEqual([
      [59, 1],
      [60, 2],
      [61, 1],
    ]);
  });
});
