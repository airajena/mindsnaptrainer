import { describe, expect, it } from "vitest";
import { decodeCells } from "../bitset";
import {
  buildStoredSession,
  groupBySignature,
  monthKey,
  personalBestCallouts,
  pruneHistory,
  type StoredSession,
  sessionSignature,
  signatureLabel,
} from "../history";
import type { ModeSummary, RoundResult } from "../types";
import { config, exposure } from "./helpers";

function session(over: Partial<StoredSession> = {}): StoredSession {
  return {
    id: "a",
    completedAt: Date.UTC(2026, 8, 20),
    modeId: "fixed",
    signature: "8x18@1000",
    config: config(),
    seed: 1,
    counted: 10,
    voids: 0,
    meanAccuracy: 0.8,
    meanHits: 15,
    meanTarget: 18,
    perfectRounds: 2,
    meanRecallMs: 3000,
    meanFirstTapMs: 500,
    mode: { kind: "fixed" },
    rounds: [],
    ...over,
  };
}

const capacity = (threshold: number | null): ModeSummary => ({
  kind: "capacity",
  threshold,
  spread: 1,
  exposureMs: 1000,
  track: [],
  reversalIndexes: [],
});

const speed = (threshold: number): ModeSummary => ({
  kind: "speed",
  threshold,
  spread: 10,
  cellCount: 18,
  track: [],
  reversalIndexes: [],
});

describe("buildStoredSession", () => {
  it("compacts rounds: bitset patterns, event times relative to recall start", () => {
    const r: RoundResult = {
      plan: { index: 0, attempt: 0, seed: 5, config: config() },
      pattern: [1, 2, 3],
      selection: [2, 3, 9],
      hits: 2,
      misses: 1,
      falseTaps: 1,
      accuracy: 0.5,
      perfect: false,
      passed: false,
      exposure: exposure({ hiddenAt: 2000 }),
      recallTimeMs: 1234.4,
      firstTapMs: 300.6,
      timedOut: false,
      events: [
        { cell: 2, t: 2300.6, op: "add" },
        { cell: 4, t: 2400, op: "add" },
        { cell: 4, t: 2500, op: "remove" },
      ],
    };
    const s = buildStoredSession({
      id: "x",
      completedAt: 1,
      config: config(),
      seed: 7,
      summary: {
        counted: 1,
        voids: 0,
        meanAccuracy: 0.5,
        meanHits: 2,
        meanTarget: 3,
        perfectRounds: 0,
        bestIndex: 0,
        worstIndex: 0,
        meanRecallMs: 1234,
        meanFirstTapMs: 300,
        mode: { kind: "fixed" },
      },
      results: [r],
    });
    const round = s.rounds[0]!;
    expect(decodeCells(round.pattern, 64)).toEqual([1, 2, 3]);
    expect(decodeCells(round.selection, 64)).toEqual([2, 3, 9]);
    expect(round.events).toEqual([
      [2, 301, 1],
      [4, 400, 1],
      [4, 500, 0],
    ]);
    expect(round.recallMs).toBe(1234);
    expect(round.firstTapMs).toBe(301);
    expect(s.signature).toBe("8x18@1000");
  });
});

describe("sessionSignature / signatureLabel", () => {
  it("groups tests by their fixed parameter and labels signatures readably", () => {
    expect(sessionSignature(config({ modeId: "capacity", exposureMs: 750 }))).toBe(
      "capacity:8x@750",
    );
    expect(sessionSignature(config({ modeId: "speed", cellCount: 18 }))).toBe("speed:8x18");
    expect(sessionSignature(config())).toBe("8x18@1000");
    expect(signatureLabel("capacity:8x@750")).toBe("capacity · 8×8 @ 0.75 s");
    expect(signatureLabel("speed:8x18")).toBe("speed · 8×8 · 18 cells");
    expect(signatureLabel("8x18@1000")).toBe("8×8 · 18 · 1.00 s");
    expect(signatureLabel("8x18@1000+free+r5000")).toBe("8×8 · 18 · 1.00 s free r5000");
    expect(signatureLabel("weird")).toBe("weird");
  });
});

describe("personalBestCallouts", () => {
  it("is silent for the first session of a config", () => {
    expect(personalBestCallouts(session(), [])).toEqual([]);
  });

  it("calls out better mean accuracy and more perfect rounds", () => {
    const earlier = [session({ id: "b", meanAccuracy: 0.7, perfectRounds: 1 })];
    expect(personalBestCallouts(session({ meanAccuracy: 0.9, perfectRounds: 3 }), earlier)).toEqual(
      ["mean accuracy for 8×8 · 18 · 1.00 s", "perfect rounds for 8×8 · 18 · 1.00 s"],
    );
    expect(personalBestCallouts(session({ meanAccuracy: 0.6, perfectRounds: 0 }), earlier)).toEqual(
      [],
    );
  });

  it("capacity: a higher threshold wins", () => {
    const cap = (id: string, t: number | null) =>
      session({ id, signature: "capacity:8x@1000", modeId: "capacity", mode: capacity(t) });
    const msg = "highest capacity for capacity · 8×8 @ 1.00 s";
    expect(personalBestCallouts(cap("n", 14), [cap("o", 12)])).toEqual([msg]);
    expect(personalBestCallouts(cap("n", 11), [cap("o", 12)])).toEqual([]);
    expect(personalBestCallouts(cap("n", 11), [cap("o", null)])).toEqual([msg]);
  });

  it("speed: a lower threshold wins", () => {
    const spd = (id: string, t: number) =>
      session({ id, signature: "speed:8x18", modeId: "speed", mode: speed(t) });
    expect(personalBestCallouts(spd("n", 800), [spd("o", 900)])).toEqual([
      "fastest threshold for speed · 8×8 · 18 cells",
    ]);
    expect(personalBestCallouts(spd("n", 950), [spd("o", 900)])).toEqual([]);
  });
});

describe("pruneHistory", () => {
  it("keeps the newest sessions and rolls the rest into monthly aggregates", () => {
    const sessions = [
      session({ id: "1", completedAt: Date.UTC(2026, 0, 5), meanAccuracy: 0.5, counted: 10 }),
      session({ id: "2", completedAt: Date.UTC(2026, 0, 20), meanAccuracy: 0.9, counted: 30 }),
      session({ id: "3", completedAt: Date.UTC(2026, 5, 1) }),
    ];
    const out = pruneHistory({ sessions, aggregates: [] }, 1);
    expect(out.sessions.map((s) => s.id)).toEqual(["3"]);
    expect(out.aggregates).toEqual([
      {
        month: "2026-01",
        signature: "8x18@1000",
        modeId: "fixed",
        sessions: 2,
        rounds: 40,
        meanAccuracy: (0.5 * 10 + 0.9 * 30) / 40,
        bestMeanAccuracy: 0.9,
      },
    ]);
  });

  it("is a no-op under the cap", () => {
    const h = { sessions: [session()], aggregates: [] };
    expect(pruneHistory(h)).toBe(h);
  });
});

describe("history edge cases", () => {
  it("compacts a round with no first tap", () => {
    const s = buildStoredSession({
      id: "x",
      completedAt: 1,
      config: config(),
      seed: 1,
      summary: {
        counted: 1,
        voids: 0,
        meanAccuracy: 0,
        meanHits: 0,
        meanTarget: 18,
        perfectRounds: 0,
        bestIndex: 0,
        worstIndex: 0,
        meanRecallMs: 0,
        meanFirstTapMs: null,
        mode: { kind: "fixed" },
      },
      results: [
        {
          plan: { index: 0, attempt: 0, seed: 1, config: config() },
          pattern: [1],
          selection: [],
          hits: 0,
          misses: 1,
          falseTaps: 0,
          accuracy: 0,
          perfect: false,
          passed: false,
          exposure: exposure(),
          recallTimeMs: 10000,
          firstTapMs: null,
          timedOut: true,
          events: [],
        },
      ],
    });
    expect(s.rounds[0]!.firstTapMs).toBeNull();
  });

  it("ignores earlier test sessions without a threshold when comparing", () => {
    const spd = (id: string, t: number | null) =>
      session({
        id,
        signature: "speed:8x18",
        modeId: "speed",
        mode: {
          kind: "speed",
          threshold: t,
          spread: 10,
          cellCount: 18,
          track: [],
          reversalIndexes: [],
        },
      });
    expect(personalBestCallouts(spd("n", 800), [spd("o", null), spd("p", 700)])).toEqual([]);
    expect(personalBestCallouts(spd("n", null), [spd("o", 900)])).toEqual([]);
  });

  it("aggregates sessions with zero counted rounds without dividing by zero", () => {
    const out = pruneHistory(
      {
        sessions: [
          session({ id: "1", completedAt: 1, counted: 0, meanAccuracy: 0 }),
          session({ id: "2", completedAt: 2, counted: 0, meanAccuracy: 0 }),
          session({ id: "3", completedAt: 3 }),
        ],
        aggregates: [],
      },
      1,
    );
    expect(out.aggregates[0]).toMatchObject({ sessions: 2, rounds: 0, meanAccuracy: 0 });
  });
});

describe("monthKey", () => {
  it("matches Date for a spread of timestamps", () => {
    for (let t = Date.UTC(1999, 0, 1); t < Date.UTC(2101, 0, 1); t += 86_400_000 * 13.7) {
      const d = new Date(t);
      expect(monthKey(t)).toBe(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      );
    }
  });
});

describe("groupBySignature", () => {
  it("groups, orders by recency and picks bests by mode", () => {
    const groups = groupBySignature([
      session({ id: "1", completedAt: 1, meanAccuracy: 0.6, perfectRounds: 1 }),
      session({ id: "2", completedAt: 3, meanAccuracy: 0.8, perfectRounds: 4 }),
      session({
        id: "3",
        completedAt: 2,
        signature: "capacity:8x@1000",
        modeId: "capacity",
        mode: capacity(12),
      }),
      session({
        id: "4",
        completedAt: 4,
        signature: "capacity:8x@1000",
        modeId: "capacity",
        mode: capacity(null),
      }),
      session({
        id: "5",
        completedAt: 0,
        signature: "speed:8x18",
        modeId: "speed",
        mode: speed(900),
      }),
      session({
        id: "6",
        completedAt: 0.5,
        signature: "speed:8x18",
        modeId: "speed",
        mode: speed(700),
      }),
    ]);
    expect(groups.map((g) => g.signature)).toEqual(["capacity:8x@1000", "8x18@1000", "speed:8x18"]);
    const [cap, fixed, spd] = groups;
    expect(cap!.series).toEqual([{ at: 2, value: 12 }]);
    expect(cap!.best).toBe(12);
    expect(cap!.bestPerfect).toBeNull();
    expect(fixed!.best).toBe(0.8);
    expect(fixed!.bestPerfect).toBe(4);
    expect(fixed!.series.map((p) => p.value)).toEqual([0.6, 0.8]);
    expect(spd!.best).toBe(700);
  });

  it("best is null when no session has a value", () => {
    const [g] = groupBySignature([
      session({ signature: "capacity:8x@1000", modeId: "capacity", mode: capacity(null) }),
    ]);
    expect(g!.best).toBeNull();
  });
});
