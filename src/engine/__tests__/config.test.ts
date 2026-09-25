import { describe, expect, it } from "vitest";
import {
  configSignature,
  DEFAULT_SESSION_CONFIG,
  maxCellCount,
  normalizeConfig,
  normalizeSessionConfig,
} from "../config";
import { findPreset, PRESETS, presetSignature } from "../presets";

describe("normalizeConfig", () => {
  it("leaves a valid config unchanged", () => {
    expect(normalizeSessionConfig(DEFAULT_SESSION_CONFIG)).toEqual(DEFAULT_SESSION_CONFIG);
  });

  it("clamps board size, cell count and exposure", () => {
    const c = normalizeConfig({
      ...DEFAULT_SESSION_CONFIG,
      boardSize: 20,
      cellCount: 999,
      exposureMs: 12,
    });
    expect(c.boardSize).toBe(12);
    expect(c.cellCount).toBe(72);
    expect(c.exposureMs).toBe(150);
  });

  it("caps k at half the board and floors it at 2", () => {
    expect(
      normalizeConfig({ ...DEFAULT_SESSION_CONFIG, boardSize: 4, cellCount: 12 }).cellCount,
    ).toBe(8);
    expect(normalizeConfig({ ...DEFAULT_SESSION_CONFIG, cellCount: 0 }).cellCount).toBe(2);
  });

  it("snaps exposure to 50 ms steps", () => {
    expect(normalizeConfig({ ...DEFAULT_SESSION_CONFIG, exposureMs: 1024 }).exposureMs).toBe(1000);
    expect(normalizeConfig({ ...DEFAULT_SESSION_CONFIG, exposureMs: 1026 }).exposureMs).toBe(1050);
    expect(normalizeConfig({ ...DEFAULT_SESSION_CONFIG, exposureMs: 9000 }).exposureMs).toBe(5000);
  });

  it("drops auto-submit without a selection limit", () => {
    const c = normalizeConfig({
      ...DEFAULT_SESSION_CONFIG,
      selectionLimit: false,
      autoSubmit: true,
    });
    expect(c.autoSubmit).toBe(false);
  });

  it("treats a non-positive recall limit as none", () => {
    expect(
      normalizeConfig({ ...DEFAULT_SESSION_CONFIG, recallLimitMs: 0 }).recallLimitMs,
    ).toBeNull();
    expect(normalizeConfig({ ...DEFAULT_SESSION_CONFIG, recallLimitMs: 10000 }).recallLimitMs).toBe(
      10000,
    );
  });

  it("clamps rounds and pass threshold", () => {
    const c = normalizeSessionConfig({ ...DEFAULT_SESSION_CONFIG, rounds: 500, passThreshold: 2 });
    expect(c.rounds).toBe(100);
    expect(c.passThreshold).toBe(1);
  });
});

describe("maxCellCount", () => {
  it("is ⌊n²/2⌋", () => {
    expect(maxCellCount(8)).toBe(32);
    expect(maxCellCount(7)).toBe(24);
  });
});

describe("configSignature", () => {
  it("is n x k @ exposure for the default recall rules", () => {
    expect(configSignature(DEFAULT_SESSION_CONFIG)).toBe("8x18@1000");
  });

  it("includes non-default recall rules and pattern style", () => {
    expect(
      configSignature({
        ...DEFAULT_SESSION_CONFIG,
        selectionLimit: false,
        recallLimitMs: 10000,
        patternStyle: "spread",
      }),
    ).toBe("8x18@1000+free+r10000+spread");
  });
});

describe("presets", () => {
  it("match PRD §9.2", () => {
    const rows = PRESETS.map((p) => [
      p.id,
      p.config.boardSize,
      p.config.cellCount,
      p.config.exposureMs,
      p.config.rounds,
    ]);
    expect(rows).toEqual([
      ["warm-up", 8, 10, 1500, 5],
      ["competition", 8, 18, 1000, 10],
      ["speed-drill", 8, 18, 750, 10],
      ["small-fast", 6, 10, 500, 10],
      ["big-board", 10, 20, 2000, 10],
    ]);
  });

  it("competition limits selection and gives feedback at the end", () => {
    const c = findPreset("competition")!.config;
    expect(c.selectionLimit).toBe(true);
    expect(c.feedback).toBe("end");
  });

  it("are all already normalised", () => {
    for (const p of PRESETS) expect(normalizeSessionConfig(p.config)).toEqual(p.config);
  });

  it("are labelled by parameters", () => {
    expect(presetSignature(findPreset("competition")!.config)).toBe("8×8 · 18 · 1.0 s");
    expect(presetSignature({ boardSize: 8, cellCount: 18, exposureMs: 750 })).toBe(
      "8×8 · 18 · 0.75 s",
    );
  });

  it("findPreset returns undefined for unknown ids", () => {
    expect(findPreset("nope")).toBeUndefined();
  });
});
