import type * as React from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-hover disabled:bg-surface-2 disabled:text-text-faint",
  secondary:
    "border border-border bg-surface-2 text-text hover:border-border-strong disabled:text-text-faint",
  ghost: "text-text-muted hover:bg-surface-2 hover:text-text disabled:text-text-faint",
  danger: "bg-danger text-bg hover:opacity-90 disabled:opacity-40",
};

const SIZE: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-small",
  lg: "min-h-13 px-6 text-body",
};

/** Class string for button-looking things (buttons and links). */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    // Press state on pointer-down (:active), transform only.
    "inline-flex items-center justify-center gap-2 rounded-button font-medium select-none transition-transform duration-[var(--dur-press)] ease-[var(--ease-out)] active:scale-[0.97] disabled:pointer-events-none motion-reduce:transition-none motion-reduce:active:scale-100",
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
