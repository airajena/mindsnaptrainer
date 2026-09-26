/**
 * Hand-rolled SVG line chart over session order (x = session #, not wall
 * time, so gaps between training days don't squash the line). The last point
 * is labelled; the y axis shows min / max ticks.
 */
export function LineChart({
  values,
  min,
  max,
  format,
  label,
}: {
  values: readonly number[];
  min?: number;
  max?: number;
  format: (v: number) => string;
  label: string;
}) {
  if (values.length === 0) return null;
  const W = 320;
  const H = 150;
  const pad = { l: 44, r: 12, t: 12, b: 20 };
  let lo = min ?? Math.min(...values);
  let hi = max ?? Math.max(...values);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const x = (i: number) =>
    values.length === 1 ? W / 2 : pad.l + (i / (values.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join("");
  const last = values[values.length - 1]!;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full">
      {[lo, hi].map((t) => (
        <g key={t}>
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={y(t)}
            y2={y(t)}
            className="stroke-border"
            strokeWidth="1"
          />
          <text
            x={pad.l - 6}
            y={y(t)}
            dy="0.32em"
            textAnchor="end"
            className="fill-text-faint font-mono text-[10px]"
          >
            {format(t)}
          </text>
        </g>
      ))}
      <text x={pad.l} y={H - 4} className="fill-text-faint font-mono text-[10px]">
        session 1
      </text>
      <text
        x={W - pad.r}
        y={H - 4}
        textAnchor="end"
        className="fill-text-faint font-mono text-[10px]"
      >
        {values.length}
      </text>
      <path
        d={d}
        fill="none"
        className="stroke-accent"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={values.map((v, i) => `M${x(i).toFixed(1)} ${y(v).toFixed(1)}h0`).join("")}
        className="stroke-accent"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <text
        x={x(values.length - 1)}
        y={y(last) - 10}
        textAnchor={values.length === 1 ? "middle" : "end"}
        className="fill-text font-mono text-[11px]"
      >
        {format(last)}
      </text>
    </svg>
  );
}
