/** A fresh 32-bit session seed from the platform CSPRNG. Client-only. */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]!;
}

/** Parses a `?seed=` value; returns null unless it's a non-negative 32-bit integer. */
export function parseSeed(value: string | null): number | null {
  if (value === null || !/^\d{1,10}$/.test(value)) return null;
  const n = Number(value);
  return n <= 0xffffffff ? n : null;
}
