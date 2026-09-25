import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { decodeCells, encodeCells, fromBase64Url, fromBits, toBase64Url, toBits } from "../bitset";

const cellSet = (maxN = 12) =>
  fc
    .integer({ min: 1, max: maxN })
    .chain((n) =>
      fc
        .uniqueArray(fc.integer({ min: 0, max: n * n - 1 }), { maxLength: n * n })
        .map((cells) => ({ n, cells: [...cells].sort((a, b) => a - b) })),
    );

describe("bitset", () => {
  it("round-trips cells through bits", () => {
    fc.assert(
      fc.property(cellSet(), ({ n, cells }) => {
        expect(fromBits(toBits(cells, n * n), n * n)).toEqual(cells);
      }),
    );
  });

  it("round-trips cells through base64url", () => {
    fc.assert(
      fc.property(cellSet(), ({ n, cells }) => {
        expect(decodeCells(encodeCells(cells, n * n), n * n)).toEqual(cells);
      }),
    );
  });

  it("round-trips arbitrary bytes through base64url", () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 40 }), (bytes) => {
        expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
      }),
    );
  });

  it("encodes 8×8 in 8 bytes / 11 chars", () => {
    expect(toBits([0, 63], 64)).toHaveLength(8);
    expect(encodeCells([0, 63], 64)).toHaveLength(11);
  });

  it("matches standard base64url for known bytes", () => {
    expect(toBase64Url(new Uint8Array([0xfb, 0xff]))).toBe("-_8");
    expect(toBase64Url(new Uint8Array([104, 105]))).toBe("aGk");
  });

  it("rejects out-of-range cells", () => {
    expect(() => toBits([64], 64)).toThrow(RangeError);
    expect(() => toBits([-1], 64)).toThrow(RangeError);
    expect(() => toBits([1.5], 64)).toThrow(RangeError);
  });

  it("rejects malformed text", () => {
    expect(() => fromBase64Url("A")).toThrow(SyntaxError);
    expect(() => fromBase64Url("A*==")).toThrow(SyntaxError);
    expect(() => decodeCells("AAAA", 64)).toThrow(RangeError);
  });
});
