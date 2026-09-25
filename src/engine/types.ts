/**
 * Engine types. The engine is pure: every timestamp and seed arrives in an
 * event payload, so a whole session is reproducible from its event log.
 */

/** 0 .. n*n-1, row-major. */
export type CellIndex = number;

export type PatternStyle = "uniform" | "spread" | "clustered";

export interface RoundConfig {
  /** Board edge length n. */
  boardSize: number;
  /** Target cell count k. */
  cellCount: number;
  exposureMs: number;
  patternStyle: PatternStyle;
  /** When on, at most k cells can be selected. */
  selectionLimit: boolean;
  /** Submit automatically when the k-th cell is selected (needs selectionLimit). */
  autoSubmit: boolean;
  /** Recall time limit; null = none. */
  recallLimitMs: number | null;
}

export type ModeId = "fixed" | "capacity" | "speed" | "ladder" | "endurance";

export interface SessionConfig extends RoundConfig {
  modeId: ModeId;
  rounds: number;
  feedback: "each-round" | "end";
  roundStart: "tap" | "auto";
  /** Jaccard accuracy needed for a round to count as passed (test modes). */
  passThreshold: number;
}

/** What a mode hands to the machine for the next round. */
export interface RoundPlan {
  /** Counted-round index (0-based). A void replay keeps the same index. */
  index: number;
  /** Replay attempt for this index; 0 for the first try. */
  attempt: number;
  seed: number;
  config: RoundConfig;
}

export interface ExposureMeasurement {
  /** rAF timestamp of the frame in which the pattern was revealed. */
  shownAt: number;
  /** rAF timestamp of the first blank frame. */
  hiddenAt: number;
  actualMs: number;
  /** Frames the pattern was on screen. */
  frames: number;
  maxFrameGapMs: number;
  /** False if any frame gap exceeded 2× the measured frame period. */
  reliable: boolean;
}

export type SelectionOp = "add" | "remove";

export interface SelectionEvent {
  cell: CellIndex;
  /** Timestamp in the same clock as the exposure measurement. */
  t: number;
  op: SelectionOp;
}

export interface RoundResult {
  plan: RoundPlan;
  /** Sorted. */
  pattern: CellIndex[];
  /** Sorted. */
  selection: CellIndex[];
  hits: number;
  misses: number;
  falseTaps: number;
  /** Jaccard index |T ∩ S| / |T ∪ S|. */
  accuracy: number;
  perfect: boolean;
  passed: boolean;
  exposure: ExposureMeasurement;
  recallTimeMs: number;
  firstTapMs: number | null;
  /** True when the recall time limit ran out and the selection was auto-submitted. */
  timedOut: boolean;
  events: SelectionEvent[];
}

export type VoidReason = "hidden" | "resize" | "dropped-frames";

/** Mode-specific result (threshold estimates etc.). */
export type ModeSummary =
  | { kind: "fixed" }
  | {
      kind: "capacity";
      /** Estimated k* (mean level at the last reversals), or null if too few reversals. */
      threshold: number | null;
      /** Standard deviation of the reversal levels used. */
      spread: number | null;
      exposureMs: number;
      /** Level per counted round, for the staircase chart. */
      track: number[];
      /** Round indexes where the staircase reversed. */
      reversalIndexes: number[];
    }
  | {
      kind: "speed";
      /** Estimated t* in ms, or null if too few reversals. */
      threshold: number | null;
      spread: number | null;
      cellCount: number;
      track: number[];
      reversalIndexes: number[];
    };

export interface SessionSummary {
  counted: number;
  voids: number;
  meanAccuracy: number;
  meanHits: number;
  meanTarget: number;
  perfectRounds: number;
  /** Index into results of the best / worst round by accuracy. */
  bestIndex: number;
  worstIndex: number;
  meanRecallMs: number;
  /** Null when no round had a first tap. */
  meanFirstTapMs: number | null;
  mode: ModeSummary;
}

export type Phase =
  | { kind: "setup" }
  | { kind: "ready"; plan: RoundPlan }
  | { kind: "countdown"; plan: RoundPlan; pattern: CellIndex[] }
  | { kind: "memorize"; plan: RoundPlan; pattern: CellIndex[] }
  | {
      kind: "recall";
      plan: RoundPlan;
      pattern: CellIndex[];
      exposure: ExposureMeasurement;
      startedAt: number;
      events: SelectionEvent[];
      /** Current selection, sorted. Kept alongside events for O(1)-ish reads by the UI. */
      selection: CellIndex[];
    }
  | { kind: "result"; result: RoundResult }
  | { kind: "void"; plan: RoundPlan; reason: VoidReason }
  | { kind: "complete"; summary: SessionSummary };

export type PhaseKind = Phase["kind"];

export type SessionEvent =
  | { type: "START_SESSION"; config: SessionConfig; seed: number }
  | { type: "BEGIN_ROUND" }
  | { type: "COUNTDOWN_DONE" }
  | { type: "EXPOSURE_DONE"; exposure: ExposureMeasurement; recallStartedAt: number }
  | { type: "TOGGLE"; cell: CellIndex; t: number; op: SelectionOp }
  | { type: "CLEAR"; t: number }
  | { type: "SUBMIT"; t: number }
  | { type: "RECALL_TIMEOUT"; t: number }
  | { type: "VOID"; reason: VoidReason }
  | { type: "NEXT" }
  | { type: "ABORT" };

export interface SessionState {
  phase: Phase;
  /** Null only before the first START_SESSION. */
  config: SessionConfig | null;
  /** Session seed; round seeds derive from it. */
  seed: number;
  /** Counted (non-void) rounds, in order. */
  results: RoundResult[];
  /** Total void rounds this session. */
  voids: number;
  /** Consecutive voids; reset by any counted round. */
  voidStreak: number;
  /** Opaque per-mode state (see modes/). */
  modeState: unknown;
}
