import * as z from "zod/mini";

/**
 * Zod mirrors of engine types for persisted data. External data is `unknown`
 * until parsed here. Uses `zod/mini` (tree-shakable functional API) to keep
 * /train's first-load JS small — see DECISIONS D24.
 */

const int = (min: number, max: number) => z.int().check(z.minimum(min), z.maximum(max));
const num = (min: number, max: number) => z.number().check(z.minimum(min), z.maximum(max));

export const PatternStyleSchema = z.enum(["uniform", "spread", "clustered"]);
export const ModeIdSchema = z.enum(["fixed", "capacity", "speed", "ladder", "endurance"]);

export const SessionConfigSchema = z.object({
  modeId: ModeIdSchema,
  boardSize: int(4, 12),
  cellCount: int(2, 72),
  exposureMs: num(150, 5000),
  patternStyle: PatternStyleSchema,
  selectionLimit: z.boolean(),
  autoSubmit: z.boolean(),
  recallLimitMs: z.nullable(z.number().check(z.positive())),
  rounds: int(1, 100),
  feedback: z.enum(["each-round", "end"]),
  roundStart: z.enum(["tap", "auto"]),
  passThreshold: num(0.5, 1),
});

export const SavedPresetSchema = z.object({
  id: z.string().check(z.minLength(1)),
  name: z.string().check(z.minLength(1), z.maxLength(40)),
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
  savedPresets: z.array(SavedPresetSchema).check(z.maxLength(20)),
});
export type Settings = z.infer<typeof SettingsSchema>;
