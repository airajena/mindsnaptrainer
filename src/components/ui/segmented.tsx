"use client";

import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Segmented control: shadcn/ui ToggleGroup (type="single") adapted to our
 * tokens. A selection can't be cleared — clicking the active item is ignored.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as T);
      }}
      aria-label={label}
      className={cn(
        "inline-flex gap-1 rounded-button border border-border bg-surface-2 p-1",
        className,
      )}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            "flex-1 rounded-[9px] px-3 font-medium text-text-muted whitespace-nowrap hover:text-text data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-[inset_0_0_0_1px_var(--border-strong)]",
            size === "md" ? "min-h-10 text-small" : "min-h-9 text-small",
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
