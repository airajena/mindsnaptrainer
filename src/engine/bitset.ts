import type { CellIndex } from "./types";

/**
 * Compact cell sets: 1 bit per cell, ⌈n²/8⌉ bytes, bit i of the set = cell i
 * (LSB-first within each byte). Used for persisted patterns/selections and
 * later for V2 `bytea` columns. 8×8 = 8 bytes = 11 base64url chars.
 */

export function toBits(cells: readonly CellIndex[], total: number): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(total / 8));
  for (const c of cells) {
    if (!Number.isInteger(c) || c < 0 || c >= total) {
      throw new RangeError(`cell ${c} out of range 0..${total - 1}`);
    }
    bytes[c >> 3]! |= 1 << (c & 7);
  }
  return bytes;
}

export function fromBits(bytes: Uint8Array, total: number): CellIndex[] {
  const cells: CellIndex[] = [];
  for (let c = 0; c < total; c++) {
    if (((bytes[c >> 3] ?? 0) >> (c & 7)) & 1) cells.push(c);
  }
  return cells;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const LOOKUP: Record<string, number> = Object.fromEntries(Array.from(ALPHABET, (ch, i) => [ch, i]));

/** base64url without padding. Hand-rolled so the engine needs no globals (btoa/Buffer). */
export function toBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += ALPHABET[b0 >> 2]!;
    out += ALPHABET[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)]!;
    if (b1 !== undefined) out += ALPHABET[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)]!;
    if (b2 !== undefined) out += ALPHABET[b2 & 63]!;
  }
  return out;
}

export function fromBase64Url(text: string): Uint8Array {
  if (text.length % 4 === 1) throw new SyntaxError("invalid base64url length");
  const bytes = new Uint8Array(Math.floor((text.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < text.length; i += 4) {
    const v = [0, 1, 2, 3].map((j) => {
      const ch = text[i + j];
      if (ch === undefined) return 0;
      const n = LOOKUP[ch];
      if (n === undefined) throw new SyntaxError(`invalid base64url character "${ch}"`);
      return n;
    });
    const [c0, c1, c2, c3] = v as [number, number, number, number];
    bytes[o++] = (c0 << 2) | (c1 >> 4);
    if (i + 2 < text.length) bytes[o++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (i + 3 < text.length) bytes[o++] = ((c2 & 3) << 6) | c3;
  }
  return bytes;
}

export function encodeCells(cells: readonly CellIndex[], total: number): string {
  return toBase64Url(toBits(cells, total));
}

export function decodeCells(text: string, total: number): CellIndex[] {
  const bytes = fromBase64Url(text);
  if (bytes.length !== Math.ceil(total / 8)) {
    throw new RangeError(`expected ${Math.ceil(total / 8)} bytes, got ${bytes.length}`);
  }
  return fromBits(bytes, total);
}
