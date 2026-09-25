"use client";

import { Stepper } from "@/components/stepper";
import { Segmented } from "@/components/ui/segmented";
import { LIMITS, maxCellCount } from "@/engine/config";
import type { SessionConfig } from "@/engine/types";
import { cn } from "@/lib/cn";
import { Chips, Field } from "./field";

const BOARDS = ["6", "7", "8", "9", "10"] as const;
const EXPOSURES = [500, 750, 1000, 1500, 2000] as const;

/**
 * Capacity and speed tests (PRD §9.3–9.4): pick the test, set the parameter
 * that stays fixed; the staircase varies the other.
 */
export function TestPicker({
  config,
  onChange,
}: {
  config: SessionConfig;
  onChange: (patch: Partial<SessionConfig>) => void;
}) {
  const n = config.boardSize;

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="grid min-w-0 gap-3 md:grid-cols-2">
        <legend className="sr-only">Test</legend>
        <TestCard
          active={config.modeId === "capacity"}
          title="Capacity test"
          body="How many cells can you hold at a fixed exposure? The cell count adapts to you until it settles."
          onPick={() => onChange({ modeId: "capacity" })}
        />
        <TestCard
          active={config.modeId === "speed"}
          title="Speed test"
          body="How short can the exposure be for a fixed cell count? The time adapts until it settles."
          onPick={() => onChange({ modeId: "speed" })}
        />
      </fieldset>

      <Field label="Board">
        {() => (
          <Segmented
            value={String(n)}
            onChange={(v) =>
              onChange({
                boardSize: Number(v),
                cellCount: Math.min(config.cellCount, maxCellCount(Number(v))),
              })
            }
            options={BOARDS.map((b) => ({ value: b, label: `${b}×${b}` }))}
            label="Board size"
            className="w-full"
          />
        )}
      </Field>

      {config.modeId === "capacity" ? (
        <Field label="Exposure (fixed)">
          {() => (
            <div className="flex flex-col gap-3">
              <Chips
                values={EXPOSURES}
                value={config.exposureMs}
                onPick={(exposureMs) => onChange({ exposureMs })}
                format={(v) => `${v / 1000} s`}
                label="Exposure presets"
              />
              <Stepper
                label="Exposure"
                value={config.exposureMs}
                min={LIMITS.exposureMs.min}
                max={LIMITS.exposureMs.max}
                step={LIMITS.exposureMs.step}
                onChange={(exposureMs) => onChange({ exposureMs })}
                format={(v) => (v / 1000).toFixed(2)}
                parse={(t) => Number(t) * 1000}
                unit="s"
              />
            </div>
          )}
        </Field>
      ) : (
        <Field label="Cells (fixed)">
          {() => (
            <Stepper
              label="Cells"
              value={config.cellCount}
              min={2}
              max={maxCellCount(n)}
              onChange={(cellCount) => onChange({ cellCount })}
            />
          )}
        </Field>
      )}

      <p className="text-small text-text-muted">
        Starts at {config.modeId === "capacity" ? "8 cells" : "2.0 s"}. Two passes in a row make it
        harder, one miss makes it easier. A round passes at {Math.round(config.passThreshold * 100)}
        % accuracy or better. Ends after 8 direction changes or 30 rounds — usually 15–25 rounds.
      </p>

      <details className="rounded-card border border-border bg-surface px-4">
        <summary className="flex min-h-12 cursor-pointer items-center text-small font-medium">
          Advanced
        </summary>
        <div className="pb-4">
          <Field label="Pass threshold" helper="Accuracy a round needs to count as a pass.">
            {() => (
              <Stepper
                label="Pass threshold"
                value={Math.round(config.passThreshold * 100)}
                min={LIMITS.passThreshold.min * 100}
                max={LIMITS.passThreshold.max * 100}
                step={5}
                onChange={(v) => onChange({ passThreshold: v / 100 })}
                unit="%"
              />
            )}
          </Field>
        </div>
      </details>
    </div>
  );
}

function TestCard({
  active,
  title,
  body,
  onPick,
}: {
  active: boolean;
  title: string;
  body: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPick}
      className={cn(
        "flex flex-col gap-1 rounded-card border bg-surface p-4 text-left transition-colors duration-[var(--dur-fast)] hover:border-border-strong",
        active ? "border-accent" : "border-border",
      )}
    >
      <span className="font-medium">{title}</span>
      <span className="text-small text-text-muted">{body}</span>
    </button>
  );
}
