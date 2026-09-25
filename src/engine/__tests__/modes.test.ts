import { describe, expect, it } from "vitest";
import { getMode, isModeAvailable } from "../modes";
import { fixedMode } from "../modes/fixed";
import { config } from "./helpers";

describe("mode registry", () => {
  it("has fixed; V1.1 modes are not available yet", () => {
    expect(isModeAvailable("fixed")).toBe(true);
    expect(isModeAvailable("ladder")).toBe(false);
    expect(() => getMode("ladder")).toThrow(/not available/);
  });
});

describe("fixed mode", () => {
  it("plans the same round config every time", () => {
    const c = config({ boardSize: 6, cellCount: 10, exposureMs: 500 });
    const s = fixedMode.init(c);
    expect(fixedMode.plan(s, c)).toEqual({
      boardSize: 6,
      cellCount: 10,
      exposureMs: 500,
      patternStyle: "uniform",
      selectionLimit: true,
      autoSubmit: false,
      recallLimitMs: null,
    });
  });

  it("is done after `rounds` counted rounds", () => {
    const c = config({ rounds: 3 });
    expect(fixedMode.isDone(null, 2, c)).toBe(false);
    expect(fixedMode.isDone(null, 3, c)).toBe(true);
  });

  it("summarises as fixed", () => {
    expect(fixedMode.summarize(null, [])).toEqual({ kind: "fixed" });
  });
});
