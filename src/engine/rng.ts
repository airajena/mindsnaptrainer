/** Seeded PRNG. Returns floats in [0, 1). Fast, 32-bit state, good enough for patterns. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 32-bit integer hash. Used to derive independent seeds from structured inputs. */
export function splitmix32(x: number): number {
  let z = (x + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
  return (z ^ (z >>> 16)) >>> 0;
}

/**
 * Seed for a round: a hash of (session seed, round index, replay attempt).
 * A voided round replays with attempt + 1, so it gets a fresh pattern, but
 * the whole session is still reproducible from the session seed.
 */
export function roundSeed(sessionSeed: number, roundIndex: number, attempt: number): number {
  const a = splitmix32(sessionSeed >>> 0);
  const b = splitmix32((a ^ Math.imul(roundIndex + 1, 0x27d4eb2f)) >>> 0);
  return splitmix32((b ^ Math.imul(attempt + 1, 0x165667b1)) >>> 0);
}

/** Integer in [0, max). */
export function randInt(rand: () => number, max: number): number {
  return Math.floor(rand() * max);
}
