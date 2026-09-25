import { createStore } from "zustand/vanilla";
import { DEFAULT_SESSION_CONFIG, normalizeSessionConfig } from "@/engine/config";
import { DEFAULT_PRESET_ID, findPreset } from "@/engine/presets";
import type { SessionConfig } from "@/engine/types";
import { decode, encode, quarantineKey } from "@/platform/storage/envelope";
import { safeLocal } from "@/platform/storage/local";
import {
  type SavedPreset,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  type Settings,
  SettingsSchema,
} from "@/platform/storage/schema";
import { uuidv7 } from "@/platform/uuid";
import { pushNotice } from "./notice-store";

export const MAX_SAVED_PRESETS = 20;

export const DEFAULT_SETTINGS: Settings = {
  haptics: true,
  swipe: true,
  countdown: "standard",
  progressBar: false,
  autoAdvance: false,
  reducedMotion: "system",
  // First-time users start on the Warm-up preset (PRD §9.2).
  lastConfig: findPreset(DEFAULT_PRESET_ID)?.config ?? DEFAULT_SESSION_CONFIG,
  lastTab: "presets",
  savedPresets: [],
};

export const settingsStore = createStore<Settings & { hydrated: boolean }>(() => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
}));

/** Loads persisted settings once, on the client. Corrupt data is quarantined, never fatal. */
export function hydrateSettings(): void {
  if (settingsStore.getState().hydrated) return;
  const raw = safeLocal.get(SETTINGS_KEY);
  const decoded = decode(raw, SettingsSchema, SETTINGS_VERSION);
  if (decoded.kind === "ok") {
    settingsStore.setState({ ...decoded.data, hydrated: true });
  } else {
    if (decoded.kind === "corrupt") {
      safeLocal.set(quarantineKey(SETTINGS_KEY, Date.now()), decoded.raw);
      safeLocal.remove(SETTINGS_KEY);
      pushNotice("settings-corrupt", "Your saved settings couldn't be read, so they were reset.");
    }
    settingsStore.setState({ hydrated: true });
  }
  settingsStore.subscribe(persist);
}

let failedOnce = false;
function persist(state: Settings & { hydrated: boolean }): void {
  const { hydrated: _h, ...data } = state;
  const ok = safeLocal.set(SETTINGS_KEY, encode(SETTINGS_VERSION, data));
  if (!ok && !failedOnce) {
    failedOnce = true;
    pushNotice("storage-blocked", "Settings and history can't be saved in this browser mode.");
  }
}

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.setState(patch);
}

export function setLastConfig(config: SessionConfig): void {
  settingsStore.setState({ lastConfig: normalizeSessionConfig(config) });
}

export function savePreset(name: string, config: SessionConfig): SavedPreset | null {
  const { savedPresets } = settingsStore.getState();
  if (savedPresets.length >= MAX_SAVED_PRESETS) return null;
  const preset: SavedPreset = {
    id: uuidv7(),
    name: name.trim().slice(0, 40) || "My preset",
    config: normalizeSessionConfig(config),
    createdAt: Date.now(),
  };
  settingsStore.setState({ savedPresets: [...savedPresets, preset] });
  return preset;
}

export function deletePreset(id: string): void {
  settingsStore.setState({
    savedPresets: settingsStore.getState().savedPresets.filter((p) => p.id !== id),
  });
}

export function resetSettings(): void {
  settingsStore.setState({ ...DEFAULT_SETTINGS });
}
