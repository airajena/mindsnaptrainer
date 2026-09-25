/**
 * Hand-rolled SVG sparkline (no chart library). Values in [min, max]; the
 * line scales to the container width via viewBox + non-scaling strokes.
 */
export function Sparkline({
  values,
  min = 0,
  max = 1,
  height = 56,
  label,
}: {
  values: readonly number[];
  min?: number;
  max?: number;
  height?: number;
  label: string;
}) {
  const w = 100;
  const h = height;
  const pad = 4;
  if (values.length === 0) return null;
  const x = (i: number) => (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w);
  const y = (v: number) =>
    pad + (1 - (Math.min(max, Math.max(min, v)) - min) / (max - min || 1)) * (h - 2 * pad);
  const points = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className="block h-14 w-full overflow-visible"
    >
      <line
        x1="0"
        x2={w}
        y1={y(max)}
        y2={y(max)}
        className="stroke-border"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="2 3"
      />
      <line
        x1="0"
        x2={w}
        y1={y(min)}
        y2={y(min)}
        className="stroke-border"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={points}
        fill="none"
        className="stroke-accent"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* All dots as one path of zero-length segments with round caps. */}
      <path
        d={values.map((v, i) => `M${x(i).toFixed(2)} ${y(v).toFixed(2)}h0`).join("")}
        className="stroke-accent"
        strokeWidth="5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
