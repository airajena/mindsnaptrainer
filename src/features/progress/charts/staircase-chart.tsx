/**
 * Staircase chart (hand-rolled SVG): the level per round as steps, reversals
 * marked with rings, the threshold as a dashed line. For speed tests,
 * `invert` puts shorter (harder) exposures higher so "up" always means harder.
 */
export function StaircaseChart({
  track,
  reversalIndexes,
  threshold,
  invert = false,
  format,
  label,
}: {
  track: readonly number[];
  reversalIndexes: readonly number[];
  threshold: number | null;
  invert?: boolean;
  format: (v: number) => string;
  label: string;
}) {
  if (track.length === 0) return null;
  const W = 320;
  const H = 160;
  const pad = { l: 44, r: 8, t: 10, b: 22 };
  const values = threshold === null ? track : [...track, threshold];
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  lo -= span * 0.08;
  hi += span * 0.08;
  const x = (i: number) => pad.l + (i / Math.max(1, track.length - 1)) * (W - pad.l - pad.r);
  const yRaw = (v: number) => (v - lo) / (hi - lo);
  const y = (v: number) => pad.t + (invert ? yRaw(v) : 1 - yRaw(v)) * (H - pad.t - pad.b);

  // Step path: horizontal at each level until the next round.
  let d = `M${x(0)} ${y(track[0]!)}`;
  for (let i = 1; i < track.length; i++) d += `H${x(i)}V${y(track[i]!)}`;

  const ticks = [lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full">
      {ticks.map((t) => (
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
      <text
        x={W - pad.r}
        y={H - 4}
        textAnchor="end"
        className="fill-text-faint font-mono text-[10px]"
      >
        round {track.length}
      </text>
      {threshold !== null && (
        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={y(threshold)}
          y2={y(threshold)}
          className="stroke-text-muted"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      )}
      <path d={d} fill="none" className="stroke-accent" strokeWidth="2" strokeLinejoin="round" />
      {reversalIndexes.map((i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(track[i]!)}
          r="4"
          className="fill-bg stroke-text"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}
