import * as z from "zod/mini";
import { ModeIdSchema, SessionConfigSchema } from "./schema";

const ModeSummarySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fixed") }),
  z.object({
    kind: z.literal("capacity"),
    threshold: z.nullable(z.number()),
    spread: z.nullable(z.number()),
    exposureMs: z.number(),
    track: z.array(z.number()),
    reversalIndexes: z.array(z.number()),
  }),
  z.object({
    kind: z.literal("speed"),
    threshold: z.nullable(z.number()),
    spread: z.nullable(z.number()),
    cellCount: z.number(),
    track: z.array(z.number()),
    reversalIndexes: z.array(z.number()),
  }),
]);

const StoredRoundSchema = z.object({
  index: z.int(),
  boardSize: z.int(),
  cellCount: z.int(),
  exposureTargetMs: z.number(),
  exposureActualMs: z.number(),
  frames: z.int(),
  seed: z.number(),
  pattern: z.string(),
  selection: z.string(),
  hits: z.int(),
  misses: z.int(),
  falseTaps: z.int(),
  accuracy: z.number(),
  recallMs: z.number(),
  firstTapMs: z.nullable(z.number()),
  timedOut: z.boolean(),
  events: z.array(z.tuple([z.number(), z.number(), z.union([z.literal(0), z.literal(1)])])),
});

const StoredSessionSchema = z.object({
  id: z.string(),
  completedAt: z.number(),
  modeId: ModeIdSchema,
  signature: z.string(),
  config: SessionConfigSchema,
  seed: z.number(),
  counted: z.int(),
  voids: z.int(),
  meanAccuracy: z.number(),
  meanHits: z.number(),
  meanTarget: z.number(),
  perfectRounds: z.int(),
  meanRecallMs: z.number(),
  meanFirstTapMs: z.nullable(z.number()),
  mode: ModeSummarySchema,
  rounds: z.array(StoredRoundSchema),
});

const MonthlyAggregateSchema = z.object({
  month: z.string(),
  signature: z.string(),
  modeId: ModeIdSchema,
  sessions: z.int(),
  rounds: z.int(),
  meanAccuracy: z.number(),
  bestMeanAccuracy: z.number(),
});

export const HistorySchema = z.object({
  sessions: z.array(StoredSessionSchema),
  aggregates: z.array(MonthlyAggregateSchema),
});
