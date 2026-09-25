"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/cn";

// shadcn/ui Slider (single thumb) adapted to our tokens.
export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex h-11 w-full touch-none items-center select-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-2">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block size-6 rounded-full border-2 border-accent bg-bg shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label={props["aria-label"]}
      />
    </SliderPrimitive.Root>
  );
}
