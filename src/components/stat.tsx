import { cn } from "@/lib/cn";

/** Label + mono value. */
export function Stat({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "hit" | "miss" | "false";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <dt className="label-caps text-label text-text-muted">{label}</dt>
      <dd
        className={cn(
          "font-mono text-h2 tabular",
          tone === "hit" && "text-hit",
          tone === "miss" && "text-miss",
          tone === "false" && "text-false",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** "16 / 18" headline. */
export function ScoreHeadline({
  hits,
  target,
  className,
  ref,
}: {
  hits: number | string;
  target: number | string;
  className?: string;
  ref?: React.Ref<HTMLParagraphElement>;
}) {
  return (
    <p
      ref={ref}
      tabIndex={-1}
      className={cn("font-mono text-score tabular outline-none", className)}
    >
      {hits}
      <span className="text-text-faint"> / {target}</span>
    </p>
  );
}
