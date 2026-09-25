import { z } from "zod";
import { SessionConfigSchema } from "./schema";

const ModeSummarySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fixed") }),
  z.object({
    kind: z.literal("capacity"),
    threshold: z.number().nullable(),
    spread: z.number().nullable(),
    exposureMs: z.number(),
    track: z.array(z.number()),
    reversalIndexes: z.array(z.number()),
  }),
  z.object({
    kind: z.literal("speed"),
    threshold: z.number().nullable(),
    spread: z.number().nullable(),
    cellCount: z.number(),
    track: z.array(z.number()),
    reversalIndexes: z.array(z.number()),
  }),
]);

const StoredRoundSchema = z.object({
  index: z.number().int(),
  boardSize: z.number().int(),
  cellCount: z.number().int(),
  exposureTargetMs: z.number(),
  exposureActualMs: z.number(),
  frames: z.number().int(),
  seed: z.number(),
  pattern: z.string(),
  selection: z.string(),
  hits: z.number().int(),
  misses: z.number().int(),
  falseTaps: z.number().int(),
  accuracy: z.number(),
  recallMs: z.number(),
  firstTapMs: z.number().nullable(),
  timedOut: z.boolean(),
  events: z.array(z.tuple([z.number(), z.number(), z.union([z.literal(0), z.literal(1)])])),
});

const StoredSessionSchema = z.object({
  id: z.string(),
  completedAt: z.number(),
  modeId: SessionConfigSchema.shape.modeId,
  signature: z.string(),
  config: SessionConfigSchema,
  seed: z.number(),
  counted: z.number().int(),
  voids: z.number().int(),
  meanAccuracy: z.number(),
  meanHits: z.number(),
  meanTarget: z.number(),
  perfectRounds: z.number().int(),
  meanRecallMs: z.number(),
  meanFirstTapMs: z.number().nullable(),
  mode: ModeSummarySchema,
  rounds: z.array(StoredRoundSchema),
});

const MonthlyAggregateSchema = z.object({
  month: z.string(),
  signature: z.string(),
  modeId: SessionConfigSchema.shape.modeId,
  sessions: z.number().int(),
  rounds: z.number().int(),
  meanAccuracy: z.number(),
  bestMeanAccuracy: z.number(),
});

export const HistorySchema = z.object({
  sessions: z.array(StoredSessionSchema),
  aggregates: z.array(MonthlyAggregateSchema),
});

export const HISTORY_KEY = "mindsnap:history";
export const HISTORY_VERSION = 1;
