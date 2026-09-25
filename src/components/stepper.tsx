"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * − value + stepper. Long-press repeats (accelerating); tap the value to type
 * one. Always clamps to [min, max] and snaps to `step`.
 */
export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  format = String,
  parse = Number,
  unit,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  format?: (v: number) => string;
  parse?: (text: string) => number;
  unit?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const repeat = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const nudge = (dir: 1 | -1) => {
    const next = clamp(valueRef.current + dir * step);
    if (next !== valueRef.current) {
      valueRef.current = next;
      onChange(next);
    }
  };

  const stop = () => {
    if (repeat.current) clearTimeout(repeat.current);
    repeat.current = null;
  };
  useEffect(
    () => () => {
      if (repeat.current) clearTimeout(repeat.current);
    },
    [],
  );

  const startRepeat = (dir: 1 | -1) => {
    nudge(dir);
    let delay = 400;
    const tick = () => {
      nudge(dir);
      delay = Math.max(50, delay * 0.8);
      repeat.current = setTimeout(tick, delay);
    };
    repeat.current = setTimeout(tick, delay);
  };

  const commit = () => {
    const parsed = parse(draft);
    if (Number.isFinite(parsed)) onChange(clamp(parsed));
    setEditing(false);
  };

  const btn =
    "grid size-11 shrink-0 place-items-center rounded-button text-text hover:bg-surface disabled:text-text-faint touch-manipulation select-none";

  return (
    <fieldset
      className={cn(
        "flex min-w-0 items-center gap-1 rounded-button border border-border bg-surface-2 p-0.5",
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      <button
        type="button"
        className={btn}
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          startRepeat(-1);
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            nudge(-1);
          }
        }}
      >
        <MinusIcon className="size-4" aria-hidden />
      </button>
      {editing ? (
        <input
          // biome-ignore lint/a11y/noAutofocus: the user just tapped the value to type into it.
          autoFocus
          inputMode="decimal"
          className="h-11 min-w-0 flex-1 bg-transparent text-center font-mono text-body text-text tabular outline-none"
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="h-11 min-w-0 flex-1 rounded-button text-center font-mono text-body tabular hover:bg-surface"
          aria-label={`${label}: ${format(value)}${unit ? ` ${unit}` : ""}. Tap to type a value.`}
          onClick={() => {
            setDraft(format(value));
            setEditing(true);
          }}
        >
          {format(value)}
          {unit && <span className="ml-1 text-text-muted">{unit}</span>}
        </button>
      )}
      <button
        type="button"
        className={btn}
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          startRepeat(1);
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            nudge(1);
          }
        }}
      >
        <PlusIcon className="size-4" aria-hidden />
      </button>
    </fieldset>
  );
}
