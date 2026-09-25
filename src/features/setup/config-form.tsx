"use client";

import { Stepper } from "@/components/stepper";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { LIMITS, maxCellCount } from "@/engine/config";
import type { SessionConfig } from "@/engine/types";
import { framesAt } from "@/lib/format";
import { Chips, Field, SwitchRow } from "./field";

const BOARD_CHOICES = ["6", "7", "8", "9", "10", "custom"] as const;
const EXPOSURE_CHIPS = [500, 750, 1000, 1500, 2000] as const;
const ROUND_CHIPS = [5, 10, 20, 30] as const;
const RECALL = [
  { value: "none", label: "None" },
  { value: "5000", label: "5 s" },
  { value: "10000", label: "10 s" },
  { value: "15000", label: "15 s" },
  { value: "30000", label: "30 s" },
] as const;

const secs = (ms: number) => `${ms / 1000} s`;

/** Every §10 parameter for a custom (fixed-mode) session. */
export function ConfigForm({
  config,
  onChange,
}: {
  config: SessionConfig;
  onChange: (patch: Partial<SessionConfig>) => void;
}) {
  const n = config.boardSize;
  const kMax = maxCellCount(n);
  const boardChoice = n >= 6 && n <= 10 ? String(n) : "custom";

  const setBoard = (size: number) =>
    onChange({ boardSize: size, cellCount: Math.min(config.cellCount, maxCellCount(size)) });

  return (
    <div className="flex flex-col gap-7">
      <Field
        label="Board"
        helper={
          n > 10 ? (
            <span className="hidden max-[389px]:inline">
              Cells will be small on this screen — consider a smaller board.
            </span>
          ) : undefined
        }
      >
        {() => (
          <div className="flex flex-col gap-3">
            <Segmented
              value={boardChoice}
              onChange={(v) => setBoard(v === "custom" ? (n >= 6 && n <= 10 ? 12 : n) : Number(v))}
              options={BOARD_CHOICES.map((c) => ({
                value: c,
                label: c === "custom" ? "Custom" : `${c}×${c}`,
              }))}
              label="Board size"
              className="w-full overflow-x-auto"
            />
            {boardChoice === "custom" && (
              <Stepper
                label="Board size"
                value={n}
                min={LIMITS.boardSize.min}
                max={LIMITS.boardSize.max}
                onChange={setBoard}
                format={(v) => `${v}×${v}`}
              />
            )}
          </div>
        )}
      </Field>

      <Field
        label="Cells to remember"
        helper={`2 – ${kMax} on a ${n}×${n} board (more than half is easier to memorise as blanks).`}
      >
        {() => (
          <div className="flex flex-col gap-1">
            <Stepper
              label="Cells"
              value={config.cellCount}
              min={2}
              max={kMax}
              onChange={(cellCount) => onChange({ cellCount })}
            />
            <Slider
              aria-label="Cells"
              min={2}
              max={kMax}
              step={1}
              value={[config.cellCount]}
              onValueChange={([v]) => v !== undefined && onChange({ cellCount: v })}
            />
          </div>
        )}
      </Field>

      <Field
        label="Exposure"
        helper={`≈ ${framesAt(config.exposureMs)} frames @ 60 Hz. Browsers can only show whole frames, so the actual time is the nearest frame.`}
      >
        {() => (
          <div className="flex flex-col gap-3">
            <Chips
              values={EXPOSURE_CHIPS}
              value={config.exposureMs}
              onPick={(exposureMs) => onChange({ exposureMs })}
              format={secs}
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
            <Slider
              aria-label="Exposure"
              min={LIMITS.exposureMs.min}
              max={LIMITS.exposureMs.max}
              step={LIMITS.exposureMs.step}
              value={[config.exposureMs]}
              onValueChange={([v]) => v !== undefined && onChange({ exposureMs: v })}
            />
          </div>
        )}
      </Field>

      <Field label="Rounds">
        {() => (
          <div className="flex flex-col gap-3">
            <Chips
              values={ROUND_CHIPS}
              value={config.rounds}
              onPick={(rounds) => onChange({ rounds })}
              format={String}
              label="Round presets"
            />
            <Stepper
              label="Rounds"
              value={config.rounds}
              min={LIMITS.rounds.min}
              max={LIMITS.rounds.max}
              onChange={(rounds) => onChange({ rounds })}
            />
          </div>
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <SwitchRow
          label="Limit selection to the cell count"
          helper="Submit becomes available as you select."
        >
          <Switch
            checked={config.selectionLimit}
            onCheckedChange={(selectionLimit) =>
              onChange({ selectionLimit, autoSubmit: selectionLimit && config.autoSubmit })
            }
          />
        </SwitchRow>
        <SwitchRow
          label="Auto-submit at the cell count"
          helper={config.selectionLimit ? undefined : "Needs the selection limit."}
        >
          <Switch
            checked={config.autoSubmit}
            disabled={!config.selectionLimit}
            onCheckedChange={(autoSubmit) => onChange({ autoSubmit })}
          />
        </SwitchRow>
      </div>

      <Field label="Recall time limit">
        {() => (
          <Segmented
            value={config.recallLimitMs === null ? "none" : String(config.recallLimitMs)}
            onChange={(v) => onChange({ recallLimitMs: v === "none" ? null : Number(v) })}
            options={RECALL}
            label="Recall time limit"
            className="w-full"
          />
        )}
      </Field>

      <Field label="Feedback">
        {() => (
          <Segmented
            value={config.feedback}
            onChange={(feedback) => onChange({ feedback })}
            options={[
              { value: "each-round", label: "After each round" },
              { value: "end", label: "End of session" },
            ]}
            label="Feedback"
            className="w-full"
          />
        )}
      </Field>

      <Field label="Round start">
        {() => (
          <Segmented
            value={config.roundStart}
            onChange={(roundStart) => onChange({ roundStart })}
            options={[
              { value: "tap", label: "Tap to start" },
              { value: "auto", label: "Automatic (1.5 s)" },
            ]}
            label="Round start"
            className="w-full"
          />
        )}
      </Field>

      <details className="group rounded-card border border-border bg-surface px-4">
        <summary className="flex min-h-12 cursor-pointer items-center text-small font-medium">
          Advanced
        </summary>
        <div className="pb-4">
          <Field
            label="Pattern style"
            helper="Uniform is what competitions use. Spread avoids clumps; clustered builds shapes."
          >
            {() => (
              <Segmented
                value={config.patternStyle}
                onChange={(patternStyle) => onChange({ patternStyle })}
                options={[
                  { value: "uniform", label: "Uniform" },
                  { value: "spread", label: "Spread" },
                  { value: "clustered", label: "Clustered" },
                ]}
                label="Pattern style"
                className="w-full"
              />
            )}
          </Field>
        </div>
      </details>
    </div>
  );
}
