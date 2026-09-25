import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { generatePattern } from "../generator";
import { INITIAL_STATE, reduce, selectionFromEvents } from "../machine";
import type { PhaseKind, SessionEvent, SessionState } from "../types";
import { config, exposure, playPerfect, recallPhase, run, toRecall } from "./helpers";

const ALL_EVENTS: SessionEvent[] = [
  { type: "START_SESSION", config: config(), seed: 1 },
  { type: "BEGIN_ROUND" },
  { type: "COUNTDOWN_DONE" },
  { type: "EXPOSURE_DONE", exposure: exposure(), recallStartedAt: 2000 },
  { type: "TOGGLE", cell: 0, op: "add", t: 2100 },
  { type: "CLEAR", t: 2100 },
  { type: "SUBMIT", t: 2100 },
  { type: "RECALL_TIMEOUT", t: 2100 },
  { type: "VOID", reason: "hidden" },
  { type: "NEXT" },
  { type: "ABORT" },
];

/** One representative state per phase. */
function statesByPhase(): Record<PhaseKind, SessionState> {
  const ready = run([{ type: "START_SESSION", config: config({ rounds: 1 }), seed: 1 }]);
  const countdown = reduce(ready, { type: "BEGIN_ROUND" });
  const memorize = reduce(countdown, { type: "COUNTDOWN_DONE" });
  const recall = reduce(memorize, {
    type: "EXPOSURE_DONE",
    exposure: exposure(),
    recallStartedAt: 2000,
  });
  const recallWithOne = reduce(recall, {
    type: "TOGGLE",
    cell: recallPhase(recall).pattern[0]!,
    op: "add",
    t: 2050,
  });
  const result = reduce(recallWithOne, { type: "SUBMIT", t: 3000 });
  const voided = reduce(memorize, { type: "VOID", reason: "hidden" });
  const complete = reduce(result, { type: "NEXT" });
  return {
    setup: INITIAL_STATE,
    ready,
    countdown,
    memorize,
    recall: recallWithOne,
    result,
    void: voided,
    complete,
  };
}

/** Which (phase, event) pairs cause a transition. Everything else must be a no-op. */
const TRANSITIONS: Record<PhaseKind, Partial<Record<SessionEvent["type"], PhaseKind>>> = {
  setup: { START_SESSION: "ready" },
  ready: { BEGIN_ROUND: "countdown", ABORT: "setup" },
  countdown: { COUNTDOWN_DONE: "memorize", VOID: "void", ABORT: "setup" },
  memorize: { EXPOSURE_DONE: "recall", VOID: "void", ABORT: "setup" },
  recall: {
    TOGGLE: "recall",
    CLEAR: "recall",
    SUBMIT: "result",
    RECALL_TIMEOUT: "result",
    ABORT: "setup",
  },
  result: { NEXT: "complete", ABORT: "setup" },
  void: { NEXT: "ready", ABORT: "setup" },
  complete: { START_SESSION: "ready", ABORT: "setup" },
};

describe("reduce: every event × every phase", () => {
  const states = statesByPhase();
  for (const [kind, state] of Object.entries(states) as [PhaseKind, SessionState][]) {
    it(`fixture for ${kind} is in ${kind}`, () => expect(state.phase.kind).toBe(kind));
    for (const event of ALL_EVENTS) {
      const expected = TRANSITIONS[kind][event.type];
      it(`${kind} + ${event.type} → ${expected ?? "no-op"}`, () => {
        const next = reduce(state, event);
        if (expected === undefined) {
          expect(next).toBe(state);
        } else {
          expect(next.phase.kind).toBe(expected);
        }
      });
    }
  }
});

describe("session flow", () => {
  it("plays a full fixed session and completes after `rounds` counted rounds", () => {
    let s = run([{ type: "START_SESSION", config: config({ rounds: 3 }), seed: 42 }]);
    for (let i = 0; i < 3; i++) {
      expect(s.phase.kind).toBe("ready");
      s = run(
        [
          { type: "BEGIN_ROUND" },
          { type: "COUNTDOWN_DONE" },
          { type: "EXPOSURE_DONE", exposure: exposure(), recallStartedAt: 2000 },
        ],
        s,
      );
      s = playPerfect(s);
      expect(s.phase.kind).toBe("result");
      s = reduce(s, { type: "NEXT" });
    }
    expect(s.phase.kind).toBe("complete");
    if (s.phase.kind !== "complete") return;
    expect(s.phase.summary.counted).toBe(3);
    expect(s.phase.summary.meanAccuracy).toBe(1);
    expect(s.phase.summary.perfectRounds).toBe(3);
  });

  it("is reproducible from the session seed", () => {
    const a = toRecall({}, 777);
    const b = toRecall({}, 777);
    expect(recallPhase(a).pattern).toEqual(recallPhase(b).pattern);
    expect(recallPhase(toRecall({}, 778)).pattern).not.toEqual(recallPhase(a).pattern);
  });

  it("uses the plan seed to generate the pattern", () => {
    const s = toRecall();
    const phase = recallPhase(s);
    expect(phase.pattern).toEqual(generatePattern(phase.plan.config, phase.plan.seed));
  });

  it("normalises the config on start", () => {
    const s = run([{ type: "START_SESSION", config: config({ cellCount: 999 }), seed: 1 }]);
    expect(s.config?.cellCount).toBe(32);
  });

  it("ignores START_SESSION for a mode that isn't available yet", () => {
    const s = run([{ type: "START_SESSION", config: config({ modeId: "ladder" }), seed: 1 }]);
    expect(s).toBe(INITIAL_STATE);
  });

  it("goes straight to the next round with end-of-session feedback", () => {
    let s = toRecall({ feedback: "end", rounds: 2 });
    s = playPerfect(s);
    expect(s.phase.kind).toBe("ready");
    if (s.phase.kind === "ready") expect(s.phase.plan.index).toBe(1);
    s = run(
      [
        { type: "BEGIN_ROUND" },
        { type: "COUNTDOWN_DONE" },
        { type: "EXPOSURE_DONE", exposure: exposure(), recallStartedAt: 2000 },
      ],
      s,
    );
    s = playPerfect(s);
    expect(s.phase.kind).toBe("complete");
  });

  it("NEXT without a config is a no-op", () => {
    expect(reduce(INITIAL_STATE, { type: "NEXT" })).toBe(INITIAL_STATE);
  });
});

describe("recall", () => {
  it("records add/remove events and keeps the selection sorted", () => {
    let s = toRecall({ selectionLimit: false });
    s = run(
      [
        { type: "TOGGLE", cell: 9, op: "add", t: 2100 },
        { type: "TOGGLE", cell: 3, op: "add", t: 2200 },
        { type: "TOGGLE", cell: 5, op: "add", t: 2300 },
        { type: "TOGGLE", cell: 3, op: "remove", t: 2400 },
      ],
      s,
    );
    const phase = recallPhase(s);
    expect(phase.selection).toEqual([5, 9]);
    expect(phase.events.map((e) => [e.cell, e.op])).toEqual([
      [9, "add"],
      [3, "add"],
      [5, "add"],
      [3, "remove"],
    ]);
    expect(selectionFromEvents(phase.events)).toEqual(phase.selection);
  });

  it("ignores duplicate adds, removes of unselected cells and out-of-range cells", () => {
    const s = run([{ type: "TOGGLE", cell: 4, op: "add", t: 2100 }], toRecall());
    expect(reduce(s, { type: "TOGGLE", cell: 4, op: "add", t: 2200 })).toBe(s);
    expect(reduce(s, { type: "TOGGLE", cell: 5, op: "remove", t: 2200 })).toBe(s);
    expect(reduce(s, { type: "TOGGLE", cell: 64, op: "add", t: 2200 })).toBe(s);
    expect(reduce(s, { type: "TOGGLE", cell: -1, op: "add", t: 2200 })).toBe(s);
    expect(reduce(s, { type: "TOGGLE", cell: 1.5, op: "add", t: 2200 })).toBe(s);
  });

  it("enforces the selection limit", () => {
    let s = toRecall({ boardSize: 4, cellCount: 3, selectionLimit: true });
    for (const cell of [0, 1, 2]) s = reduce(s, { type: "TOGGLE", cell, op: "add", t: 2100 });
    const full = s;
    expect(reduce(full, { type: "TOGGLE", cell: 3, op: "add", t: 2200 })).toBe(full);
    // Removing frees a slot.
    s = reduce(full, { type: "TOGGLE", cell: 0, op: "remove", t: 2300 });
    s = reduce(s, { type: "TOGGLE", cell: 3, op: "add", t: 2400 });
    expect(recallPhase(s).selection).toEqual([1, 2, 3]);
  });

  it("allows more than k without a selection limit", () => {
    let s = toRecall({ boardSize: 4, cellCount: 3, selectionLimit: false });
    for (const cell of [0, 1, 2, 3, 4]) s = reduce(s, { type: "TOGGLE", cell, op: "add", t: 2100 });
    expect(recallPhase(s).selection).toHaveLength(5);
  });

  it("auto-submits at k when enabled", () => {
    let s = toRecall({ boardSize: 4, cellCount: 3, selectionLimit: true, autoSubmit: true });
    s = reduce(s, { type: "TOGGLE", cell: 0, op: "add", t: 2100 });
    s = reduce(s, { type: "TOGGLE", cell: 1, op: "add", t: 2200 });
    expect(s.phase.kind).toBe("recall");
    s = reduce(s, { type: "TOGGLE", cell: 2, op: "add", t: 2300 });
    expect(s.phase.kind).toBe("result");
    if (s.phase.kind === "result") expect(s.phase.result.recallTimeMs).toBe(300);
  });

  it("CLEAR removes everything and logs removes; empty CLEAR is a no-op", () => {
    let s = toRecall();
    expect(reduce(s, { type: "CLEAR", t: 2100 })).toBe(s);
    s = run(
      [
        { type: "TOGGLE", cell: 1, op: "add", t: 2100 },
        { type: "TOGGLE", cell: 2, op: "add", t: 2200 },
        { type: "CLEAR", t: 2300 },
      ],
      s,
    );
    const phase = recallPhase(s);
    expect(phase.selection).toEqual([]);
    expect(phase.events.filter((e) => e.op === "remove")).toHaveLength(2);
  });

  it("SUBMIT with zero selections is a no-op", () => {
    const s = toRecall();
    expect(reduce(s, { type: "SUBMIT", t: 3000 })).toBe(s);
  });

  it("RECALL_TIMEOUT submits even an empty selection", () => {
    const s = reduce(toRecall(), { type: "RECALL_TIMEOUT", t: 12000 });
    expect(s.phase.kind).toBe("result");
    if (s.phase.kind !== "result") return;
    expect(s.phase.result.timedOut).toBe(true);
    expect(s.phase.result.hits).toBe(0);
    expect(s.phase.result.accuracy).toBe(0);
    expect(s.phase.result.firstTapMs).toBeNull();
  });
});

describe("result", () => {
  it("scores the round and records timing", () => {
    let s = toRecall({ selectionLimit: false });
    const pattern = recallPhase(s).pattern;
    const wrong = [...Array(64).keys()].find((c) => !pattern.includes(c))!;
    s = run(
      [
        { type: "TOGGLE", cell: pattern[0]!, op: "add", t: 2400 },
        { type: "TOGGLE", cell: wrong, op: "add", t: 2500 },
        { type: "SUBMIT", t: 5000 },
      ],
      s,
    );
    expect(s.phase.kind).toBe("result");
    if (s.phase.kind !== "result") return;
    const r = s.phase.result;
    expect(r.hits).toBe(1);
    expect(r.falseTaps).toBe(1);
    expect(r.misses).toBe(17);
    expect(r.accuracy).toBeCloseTo(1 / 19);
    expect(r.passed).toBe(false);
    expect(r.recallTimeMs).toBe(3000);
    expect(r.firstTapMs).toBe(400);
    expect(r.exposure.actualMs).toBe(1000);
    expect(r.timedOut).toBe(false);
  });

  it("passes at the threshold", () => {
    const s = playPerfect(toRecall({ passThreshold: 1 }));
    expect(s.phase.kind === "result" && s.phase.result.passed).toBe(true);
  });
});

describe("void rounds", () => {
  it("VOID during countdown or memorize voids; NEXT replays the same index with a new seed", () => {
    const ready = run([{ type: "START_SESSION", config: config(), seed: 5 }]);
    if (ready.phase.kind !== "ready") throw new Error();
    const firstSeed = ready.phase.plan.seed;
    let s = run([{ type: "BEGIN_ROUND" }, { type: "VOID", reason: "hidden" }], ready);
    expect(s.phase.kind).toBe("void");
    expect(s.voids).toBe(1);
    expect(s.voidStreak).toBe(1);
    s = reduce(s, { type: "NEXT" });
    expect(s.phase.kind).toBe("ready");
    if (s.phase.kind !== "ready") return;
    expect(s.phase.plan.index).toBe(0);
    expect(s.phase.plan.attempt).toBe(1);
    expect(s.phase.plan.seed).not.toBe(firstSeed);
  });

  it("an unreliable exposure voids as dropped-frames", () => {
    const s = run([
      { type: "START_SESSION", config: config(), seed: 1 },
      { type: "BEGIN_ROUND" },
      { type: "COUNTDOWN_DONE" },
      {
        type: "EXPOSURE_DONE",
        exposure: exposure({ reliable: false, maxFrameGapMs: 50 }),
        recallStartedAt: 2000,
      },
    ]);
    expect(s.phase).toMatchObject({ kind: "void", reason: "dropped-frames" });
  });

  it("void rounds are excluded from results; a counted round resets the streak", () => {
    let s = run([
      { type: "START_SESSION", config: config({ rounds: 1 }), seed: 1 },
      { type: "BEGIN_ROUND" },
      { type: "VOID", reason: "resize" },
      { type: "NEXT" },
      { type: "BEGIN_ROUND" },
      { type: "COUNTDOWN_DONE" },
      { type: "VOID", reason: "hidden" },
      { type: "NEXT" },
    ]);
    expect(s.voidStreak).toBe(2);
    s = run(
      [
        { type: "BEGIN_ROUND" },
        { type: "COUNTDOWN_DONE" },
        { type: "EXPOSURE_DONE", exposure: exposure(), recallStartedAt: 2000 },
      ],
      s,
    );
    s = playPerfect(s);
    expect(s.voidStreak).toBe(0);
    s = reduce(s, { type: "NEXT" });
    expect(s.phase.kind).toBe("complete");
    if (s.phase.kind !== "complete") return;
    expect(s.phase.summary.counted).toBe(1);
    expect(s.phase.summary.voids).toBe(2);
  });
});

describe("reduce: property tests", () => {
  const eventArb: fc.Arbitrary<SessionEvent> = fc.oneof(
    fc.record({
      type: fc.constant("START_SESSION" as const),
      config: fc
        .record({
          boardSize: fc.integer({ min: -2, max: 20 }),
          cellCount: fc.integer({ min: -2, max: 200 }),
          exposureMs: fc.integer({ min: -100, max: 10000 }),
          rounds: fc.integer({ min: 0, max: 5 }),
          selectionLimit: fc.boolean(),
          autoSubmit: fc.boolean(),
          feedback: fc.constantFrom("each-round" as const, "end" as const),
          patternStyle: fc.constantFrom(
            "uniform" as const,
            "spread" as const,
            "clustered" as const,
          ),
        })
        .map((over) => config(over)),
      seed: fc.integer(),
    }),
    fc.constant({ type: "BEGIN_ROUND" as const }),
    fc.constant({ type: "COUNTDOWN_DONE" as const }),
    fc.record({
      type: fc.constant("EXPOSURE_DONE" as const),
      exposure: fc.boolean().map((reliable) => exposure({ reliable })),
      recallStartedAt: fc.nat(),
    }),
    fc.record({
      type: fc.constant("TOGGLE" as const),
      cell: fc.integer({ min: -5, max: 200 }),
      op: fc.constantFrom("add" as const, "remove" as const),
      t: fc.nat(),
    }),
    fc.record({ type: fc.constant("CLEAR" as const), t: fc.nat() }),
    fc.record({ type: fc.constant("SUBMIT" as const), t: fc.nat() }),
    fc.record({ type: fc.constant("RECALL_TIMEOUT" as const), t: fc.nat() }),
    fc.record({
      type: fc.constant("VOID" as const),
      reason: fc.constantFrom("hidden" as const, "resize" as const, "dropped-frames" as const),
    }),
    fc.constant({ type: "NEXT" as const }),
    fc.constant({ type: "ABORT" as const }),
  );

  it("never throws and keeps invariants on any event sequence", () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 80 }), (events) => {
        let s = INITIAL_STATE;
        for (const e of events) {
          s = reduce(s, e);
          const p = s.phase;
          if (p.kind === "recall") {
            const cfg = p.plan.config;
            // Selection is consistent with the event log, unique, in range, within limit.
            expect(selectionFromEvents(p.events)).toEqual(p.selection);
            expect(p.selection.every((c) => c >= 0 && c < cfg.boardSize ** 2)).toBe(true);
            if (cfg.selectionLimit) expect(p.selection.length).toBeLessThanOrEqual(cfg.cellCount);
          }
          if (p.kind === "result") {
            expect(p.result.hits + p.result.misses).toBe(p.result.pattern.length);
          }
          if (s.config) {
            expect(s.results.length).toBeLessThanOrEqual(s.config.rounds);
          }
        }
      }),
      { numRuns: 500 },
    );
  });
});
