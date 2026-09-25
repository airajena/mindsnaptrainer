import { z } from "zod";

/** Zod mirrors of engine types for persisted data. External data is `unknown` until parsed here. */

export const PatternStyleSchema = z.enum(["uniform", "spread", "clustered"]);

export const SessionConfigSchema = z.object({
  modeId: z.enum(["fixed", "capacity", "speed", "ladder", "endurance"]),
  boardSize: z.number().int().min(4).max(12),
  cellCount: z.number().int().min(2).max(72),
  exposureMs: z.number().min(150).max(5000),
  patternStyle: PatternStyleSchema,
  selectionLimit: z.boolean(),
  autoSubmit: z.boolean(),
  recallLimitMs: z.number().positive().nullable(),
  rounds: z.number().int().min(1).max(100),
  feedback: z.enum(["each-round", "end"]),
  roundStart: z.enum(["tap", "auto"]),
  passThreshold: z.number().min(0.5).max(1),
});

export const SavedPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  config: SessionConfigSchema,
  createdAt: z.number(),
});
export type SavedPreset = z.infer<typeof SavedPresetSchema>;

export const SettingsSchema = z.object({
  haptics: z.boolean(),
  swipe: z.boolean(),
  countdown: z.enum(["standard", "quick", "off"]),
  progressBar: z.boolean(),
  autoAdvance: z.boolean(),
  reducedMotion: z.enum(["system", "reduce"]),
  lastConfig: SessionConfigSchema,
  lastTab: z.enum(["presets", "tests", "custom"]),
  savedPresets: z.array(SavedPresetSchema).max(20),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SETTINGS_KEY = "mindsnap:settings";
export const SETTINGS_VERSION = 1;
