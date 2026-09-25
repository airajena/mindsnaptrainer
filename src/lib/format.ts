/** 1000 → "1.00 s", 750 → "0.75 s". */
export function formatSeconds(ms: number, digits = 2): string {
  return `${(ms / 1000).toFixed(digits)} s`;
}

/** 1008.3 → "1,008 ms". */
export function formatMs(ms: number): string {
  return `${Math.round(ms).toLocaleString("en-US")} ms`;
}

/** 0.8889 → "89%". */
export function formatPercent(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}

/** 16.4 → "16.4", 16 → "16". */
export function formatNumber(x: number, digits = 1): string {
  const r = Number(x.toFixed(digits));
  return Number.isInteger(r) ? String(r) : r.toFixed(digits);
}

/** Frame count at a refresh rate, for "≈ 60 frames @ 60 Hz". */
export function framesAt(ms: number, hz = 60): number {
  return Math.round((ms / 1000) * hz);
}
