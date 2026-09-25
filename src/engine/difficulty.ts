/**
 * Information load of a pattern: log2 C(n², k) bits — how many bits it takes
 * to name one specific k-cell pattern among all possible ones. Summed in log
 * space so it never overflows. 8×8 with k=18 ≈ 51.7 bits.
 */
export function informationBits(n: number, k: number): number {
  const total = n * n;
  if (k < 0 || k > total) return 0;
  let bits = 0;
  for (let i = 1; i <= k; i++) bits += Math.log2(total - k + i) - Math.log2(i);
  return bits;
}

/** Bits per second of exposure — a rough "how hard is this" rate. */
export function bitsPerSecond(n: number, k: number, exposureMs: number): number {
  if (exposureMs <= 0) return 0;
  return informationBits(n, k) / (exposureMs / 1000);
}
