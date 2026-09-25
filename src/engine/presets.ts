import { DEFAULT_SESSION_CONFIG } from "./config";
import type { SessionConfig } from "./types";

export interface Preset {
  id: string;
  /** Descriptive name. Never another product's name (PRD §5). */
  name: string;
  config: SessionConfig;
}

const base = DEFAULT_SESSION_CONFIG;

/** Built-in presets, PRD §9.2. */
export const PRESETS: readonly Preset[] = [
  {
    id: "warm-up",
    name: "Warm-up",
    config: { ...base, boardSize: 8, cellCount: 10, exposureMs: 1500, rounds: 5 },
  },
  {
    id: "competition",
    name: "Competition",
    config: {
      ...base,
      boardSize: 8,
      cellCount: 18,
      exposureMs: 1000,
      rounds: 10,
      selectionLimit: true,
      feedback: "end",
    },
  },
  {
    id: "speed-drill",
    name: "Speed drill",
    config: { ...base, boardSize: 8, cellCount: 18, exposureMs: 750, rounds: 10 },
  },
  {
    id: "small-fast",
    name: "Small & fast",
    config: { ...base, boardSize: 6, cellCount: 10, exposureMs: 500, rounds: 10 },
  },
  {
    id: "big-board",
    name: "Big board",
    config: { ...base, boardSize: 10, cellCount: 20, exposureMs: 2000, rounds: 10 },
  },
];

export const DEFAULT_PRESET_ID = "warm-up";

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** "8×8 · 18 · 1.0 s" — the parameter signature presets are labelled with. */
export function presetSignature(
  config: Pick<SessionConfig, "boardSize" | "cellCount" | "exposureMs">,
): string {
  const s = config.exposureMs / 1000;
  const secs = Number.isInteger(s * 10) ? s.toFixed(1) : s.toFixed(2);
  return `${config.boardSize}×${config.boardSize} · ${config.cellCount} · ${secs} s`;
}
