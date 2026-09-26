import { encodeCells } from "./bitset";
import { configSignature } from "./config";
import type { ModeSummary, RoundResult, SessionConfig, SessionSummary } from "./types";

/**
 * Persisted history shapes and the pure logic over them (compaction, personal
 * bests, pruning). Storage I/O lives in stores/history-store.ts.
 */

/** A counted round, compact: patterns as base64url bitsets, events as tuples. */
export interface StoredRound {
  index: number;
  boardSize: number;
  cellCount: number;
  exposureTargetMs: number;
  exposureActualMs: number;
  frames: number;
  seed: number;
  pattern: string;
  selection: string;
  hits: number;
  misses: number;
  falseTaps: number;
  accuracy: number;
  recallMs: number;
  firstTapMs: number | null;
  timedOut: boolean;
  /** [cell, ms since recall start, 1 = add / 0 = remove] */
  events: [number, number, 0 | 1][];
}

export interface StoredSession {
  id: string;
  completedAt: number;
  modeId: SessionConfig["modeId"];
  signature: string;
  config: SessionConfig;
  seed: number;
  counted: number;
  voids: number;
  meanAccuracy: number;
  meanHits: number;
  meanTarget: number;
  perfectRounds: number;
  meanRecallMs: number;
  meanFirstTapMs: number | null;
  mode: ModeSummary;
  rounds: StoredRound[];
}

/** Older sessions roll into one of these per (month, signature, mode). */
export interface MonthlyAggregate {
  month: string; // "2026-09"
  signature: string;
  modeId: SessionConfig["modeId"];
  sessions: number;
  rounds: number;
  /** Round-weighted mean accuracy. */
  meanAccuracy: number;
  bestMeanAccuracy: number;
}

export interface History {
  sessions: StoredSession[];
  aggregates: MonthlyAggregate[];
}

export const EMPTY_HISTORY: History = { sessions: [], aggregates: [] };
export const MAX_SESSIONS = 1000;

export function compactRound(r: RoundResult, recallStartedAt: number): StoredRound {
  const total = r.plan.config.boardSize ** 2;
  return {
    index: r.plan.index,
    boardSize: r.plan.config.boardSize,
    cellCount: r.plan.config.cellCount,
    exposureTargetMs: r.plan.config.exposureMs,
    exposureActualMs: Math.round(r.exposure.actualMs * 100) / 100,
    frames: r.exposure.frames,
    seed: r.plan.seed,
    pattern: encodeCells(r.pattern, total),
    selection: encodeCells(r.selection, total),
    hits: r.hits,
    misses: r.misses,
    falseTaps: r.falseTaps,
    accuracy: r.accuracy,
    recallMs: Math.round(r.recallTimeMs),
    firstTapMs: r.firstTapMs === null ? null : Math.round(r.firstTapMs),
    timedOut: r.timedOut,
    events: r.events.map((e) => [
      e.cell,
      Math.round(e.t - recallStartedAt),
      e.op === "add" ? 1 : 0,
    ]),
  };
}

export function buildStoredSession(input: {
  id: string;
  completedAt: number;
  config: SessionConfig;
  seed: number;
  summary: SessionSummary;
  results: readonly RoundResult[];
}): StoredSession {
  const { summary, config } = input;
  return {
    id: input.id,
    completedAt: input.completedAt,
    modeId: config.modeId,
    signature: sessionSignature(config),
    config,
    seed: input.seed,
    counted: summary.counted,
    voids: summary.voids,
    meanAccuracy: summary.meanAccuracy,
    meanHits: summary.meanHits,
    meanTarget: summary.meanTarget,
    perfectRounds: summary.perfectRounds,
    meanRecallMs: summary.meanRecallMs,
    meanFirstTapMs: summary.meanFirstTapMs,
    mode: summary.mode,
    rounds: input.results.map((r) => compactRound(r, r.exposure.hiddenAt)),
  };
}

/**
 * Signature used to group history. Fixed sessions group by round config;
 * tests group by their fixed parameter (capacity: board + exposure; speed:
 * board + k), since the other one is what the test measures.
 */
export function sessionSignature(config: SessionConfig): string {
  switch (config.modeId) {
    case "capacity":
      return `capacity:${config.boardSize}x@${config.exposureMs}`;
    case "speed":
      return `speed:${config.boardSize}x${config.cellCount}`;
    default:
      return configSignature(config);
  }
}

/** Personal-best callouts for a just-finished session vs. earlier history (excluding itself). */
export function personalBestCallouts(
  session: StoredSession,
  earlier: readonly StoredSession[],
): string[] {
  const same = earlier.filter((s) => s.signature === session.signature && s.id !== session.id);
  if (same.length === 0) return [];
  const out: string[] = [];
  const label = signatureLabel(session.signature);
  if (session.mode.kind === "capacity" && session.mode.threshold !== null) {
    const prev = best(same, (s) => (s.mode.kind === "capacity" ? s.mode.threshold : null), "max");
    if (prev === null || session.mode.threshold > prev) out.push(`highest capacity for ${label}`);
    return out;
  }
  if (session.mode.kind === "speed" && session.mode.threshold !== null) {
    const prev = best(same, (s) => (s.mode.kind === "speed" ? s.mode.threshold : null), "min");
    if (prev === null || session.mode.threshold < prev) out.push(`fastest threshold for ${label}`);
    return out;
  }
  const prevAcc = best(same, (s) => s.meanAccuracy, "max");
  if (prevAcc !== null && session.meanAccuracy > prevAcc) out.push(`mean accuracy for ${label}`);
  const prevPerfect = best(same, (s) => s.perfectRounds, "max");
  if (prevPerfect !== null && session.perfectRounds > prevPerfect && session.perfectRounds > 0) {
    out.push(`perfect rounds for ${label}`);
  }
  return out;
}

function best(
  sessions: readonly StoredSession[],
  pick: (s: StoredSession) => number | null,
  dir: "max" | "min",
): number | null {
  let out: number | null = null;
  for (const s of sessions) {
    const v = pick(s);
    if (v === null) continue;
    if (out === null || (dir === "max" ? v > out : v < out)) out = v;
  }
  return out;
}

/** "8x18@1000" → "8×8 · 18 · 1.0 s"; test signatures get readable names. */
export function signatureLabel(signature: string): string {
  const cap = /^capacity:(\d+)x@(\d+)$/.exec(signature);
  if (cap) return `capacity · ${cap[1]}×${cap[1]} @ ${(Number(cap[2]) / 1000).toFixed(2)} s`;
  const spd = /^speed:(\d+)x(\d+)$/.exec(signature);
  if (spd) return `speed · ${spd[1]}×${spd[1]} · ${spd[2]} cells`;
  const fixed = /^(\d+)x(\d+)@(\d+)(.*)$/.exec(signature);
  if (fixed) {
    const extras = fixed[4] ? ` ${fixed[4].split("+").filter(Boolean).join(" ")}` : "";
    return `${fixed[1]}×${fixed[1]} · ${fixed[2]} · ${(Number(fixed[3]) / 1000).toFixed(2)} s${extras}`;
  }
  return signature;
}

/**
 * Keeps the newest MAX_SESSIONS sessions; older ones are rolled into monthly
 * per-signature aggregates so long-term trends survive (PRD §16).
 */
export function pruneHistory(history: History, max = MAX_SESSIONS): History {
  if (history.sessions.length <= max) return history;
  const sorted = [...history.sessions].sort((a, b) => b.completedAt - a.completedAt);
  const keep = sorted.slice(0, max);
  const roll = sorted.slice(max);
  const aggregates = [...history.aggregates];
  for (const s of roll) {
    const month = monthKey(s.completedAt);
    let agg = aggregates.find(
      (a) => a.month === month && a.signature === s.signature && a.modeId === s.modeId,
    );
    if (!agg) {
      agg = {
        month,
        signature: s.signature,
        modeId: s.modeId,
        sessions: 0,
        rounds: 0,
        meanAccuracy: 0,
        bestMeanAccuracy: 0,
      };
      aggregates.push(agg);
    }
    const rounds = agg.rounds + s.counted;
    agg.meanAccuracy =
      rounds === 0 ? 0 : (agg.meanAccuracy * agg.rounds + s.meanAccuracy * s.counted) / rounds;
    agg.rounds = rounds;
    agg.sessions++;
    agg.bestMeanAccuracy = Math.max(agg.bestMeanAccuracy, s.meanAccuracy);
  }
  return { sessions: keep, aggregates };
}

/**
 * "YYYY-MM" (UTC) from epoch ms. Integer civil-from-days arithmetic (Howard
 * Hinnant's algorithm) instead of Date, keeping the engine free of clock APIs.
 */
export function monthKey(ms: number): string {
  const z = Math.floor(ms / 86_400_000) + 719_468;
  const era = Math.floor(z / 146_097);
  const doe = z - era * 146_097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** One config signature's history, for the progress page. */
export interface SignatureGroup {
  signature: string;
  label: string;
  modeId: SessionConfig["modeId"];
  sessions: number;
  lastAt: number;
  /** Fixed: mean accuracy per session. Tests: threshold per session (sessions without one are skipped). */
  series: { at: number; value: number }[];
  /** Fixed: best mean accuracy. Capacity: highest k*. Speed: lowest t*. Null if none. */
  best: number | null;
  /** Fixed only: most perfect rounds in one session. */
  bestPerfect: number | null;
}

/** Groups sessions by signature, most recently played first. */
export function groupBySignature(sessions: readonly StoredSession[]): SignatureGroup[] {
  const map = new Map<string, StoredSession[]>();
  for (const s of sessions) {
    const list = map.get(s.signature);
    if (list) list.push(s);
    else map.set(s.signature, [s]);
  }
  const groups: SignatureGroup[] = [];
  for (const [signature, list] of map) {
    const sorted = [...list].sort((a, b) => a.completedAt - b.completedAt);
    const first = sorted[0]!;
    const series = sorted.flatMap((s) => {
      const v = seriesValue(s);
      return v === null ? [] : [{ at: s.completedAt, value: v }];
    });
    const values = series.map((p) => p.value);
    const best =
      values.length === 0
        ? null
        : first.modeId === "speed"
          ? Math.min(...values)
          : Math.max(...values);
    groups.push({
      signature,
      label: signatureLabel(signature),
      modeId: first.modeId,
      sessions: sorted.length,
      lastAt: sorted[sorted.length - 1]!.completedAt,
      series,
      best,
      bestPerfect:
        first.modeId === "fixed" ? Math.max(...sorted.map((s) => s.perfectRounds)) : null,
    });
  }
  return groups.sort((a, b) => b.lastAt - a.lastAt);
}

function seriesValue(s: StoredSession): number | null {
  return s.mode.kind === "fixed" ? s.meanAccuracy : s.mode.threshold;
}
