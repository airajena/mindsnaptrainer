"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/cn";

// shadcn/ui Switch adapted to our tokens. The 44 px hit area comes from the wrapping label row.
export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-border-strong bg-surface-2 p-0.5 transition-colors duration-[var(--dur-fast)] data-[state=checked]:border-accent data-[state=checked]:bg-accent disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 rounded-full bg-text-muted transition-transform duration-[var(--dur-fast)] data-[state=checked]:translate-x-5 data-[state=checked]:bg-accent-ink" />
    </SwitchPrimitive.Root>
  );
}
