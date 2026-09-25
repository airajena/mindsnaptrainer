/** Mark: a 3×3 grid with a lit diagonal-ish pattern. Inline SVG, tokens only. */
export function Logo({ className }: { className?: string }) {
  const lit = new Set([0, 4, 5, 8]);
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional cells.
          key={i}
          x={1 + (i % 3) * 8}
          y={1 + Math.floor(i / 3) * 8}
          width="6"
          height="6"
          rx="1.5"
          className={lit.has(i) ? "fill-accent" : "fill-surface-2"}
        />
      ))}
    </svg>
  );
}
