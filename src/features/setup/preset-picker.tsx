"use client";

import { XIcon } from "lucide-react";
import { useStore } from "zustand";
import { informationBits } from "@/engine/difficulty";
import { PRESETS, presetSignature } from "@/engine/presets";
import type { SessionConfig } from "@/engine/types";
import { cn } from "@/lib/cn";
import { deletePreset, settingsStore } from "@/stores/settings-store";

function sameParams(a: SessionConfig, b: SessionConfig): boolean {
  return (
    a.boardSize === b.boardSize &&
    a.cellCount === b.cellCount &&
    a.exposureMs === b.exposureMs &&
    a.rounds === b.rounds &&
    a.selectionLimit === b.selectionLimit &&
    a.feedback === b.feedback &&
    a.recallLimitMs === b.recallLimitMs &&
    a.patternStyle === b.patternStyle
  );
}

/** Built-in + saved presets. Chip row on mobile, grid on desktop. Tapping fills the config. */
export function PresetPicker({
  config,
  onPick,
}: {
  config: SessionConfig;
  onPick: (config: SessionConfig) => void;
}) {
  const saved = useStore(settingsStore, (s) => s.savedPresets);

  return (
    <div className="flex flex-col gap-5">
      <ul
        className="-mx-gutter flex snap-x gap-3 overflow-x-auto px-gutter pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3"
        aria-label="Presets"
      >
        {PRESETS.map((p) => (
          <li key={p.id} className="shrink-0 snap-start">
            <PresetCard
              name={p.name}
              config={p.config}
              active={sameParams(p.config, config)}
              onPick={() => onPick(p.config)}
            />
          </li>
        ))}
      </ul>

      {saved.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="label-caps text-label text-text-muted">Your presets</h3>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {saved.map((p) => (
              <li key={p.id} className="relative">
                <PresetCard
                  name={p.name}
                  config={p.config}
                  active={sameParams(p.config, config)}
                  onPick={() => onPick(p.config)}
                  wide
                />
                <button
                  type="button"
                  onClick={() => deletePreset(p.id)}
                  className="absolute top-1 right-1 grid size-11 place-items-center rounded-button text-text-faint hover:text-danger"
                >
                  <XIcon className="size-4" aria-hidden />
                  <span className="sr-only">Delete preset {p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PresetCard({
  name,
  config,
  active,
  onPick,
  wide,
}: {
  name: string;
  config: SessionConfig;
  active: boolean;
  onPick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={cn(
        "flex h-full flex-col items-start gap-1 rounded-card border bg-surface p-4 pr-10 text-left transition-colors duration-[var(--dur-fast)] hover:border-border-strong",
        wide ? "w-full" : "w-56 md:w-full",
        active ? "border-accent" : "border-border",
      )}
    >
      <span className="font-medium">{name}</span>
      <span className="font-mono text-small text-text-muted tabular">
        {presetSignature(config)}
      </span>
      <span className="font-mono text-small text-text-faint tabular">
        {Math.round(informationBits(config.boardSize, config.cellCount))} bits · {config.rounds}{" "}
        rounds
        {config.feedback === "end" ? " · results at end" : ""}
      </span>
    </button>
  );
}
