import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type BoardGeometry, cellsOnLine, hitTest, moveFocus } from "./geometry";

const geo = (over: Partial<BoardGeometry> = {}): BoardGeometry => ({
  left: 10,
  top: 20,
  size: 360,
  gap: 8,
  n: 8,
  ...over,
});

/** Cell i's box: starts at i·(c+g), width c, where n·c + (n−1)·g = size. */
function cellBox(g: BoardGeometry, i: number) {
  const c = (g.size - (g.n - 1) * g.gap) / g.n;
  return { start: i * (c + g.gap), end: i * (c + g.gap) + c };
}

describe("hitTest", () => {
  it("hits every cell at its centre", () => {
    const g = geo();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const bx = cellBox(g, c);
        const by = cellBox(g, r);
        const x = g.left + (bx.start + bx.end) / 2;
        const y = g.top + (by.start + by.end) / 2;
        expect(hitTest(x, y, g)).toBe(r * 8 + c);
      }
    }
  });

  it("has no dead zones: every point on the board hits exactly one cell", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 12 }),
        fc.double({ min: 0, max: 0.999999, noNaN: true }),
        fc.double({ min: 0, max: 0.999999, noNaN: true }),
        (n, fx, fy) => {
          const g = geo({ n, gap: 6 });
          const cell = hitTest(g.left + fx * g.size, g.top + fy * g.size, g);
          return cell >= 0 && cell < n * n;
        },
      ),
    );
  });

  it("splits gaps down the middle between neighbouring cells", () => {
    const g = geo();
    const a = cellBox(g, 2);
    const mid = a.end + g.gap / 2;
    const y = g.top + 1;
    expect(hitTest(g.left + mid - 0.1, y, g)).toBe(2);
    expect(hitTest(g.left + mid + 0.1, y, g)).toBe(3);
  });

  it("returns -1 outside the board", () => {
    const g = geo();
    expect(hitTest(g.left - 1, g.top + 5, g)).toBe(-1);
    expect(hitTest(g.left + 5, g.top - 1, g)).toBe(-1);
    expect(hitTest(g.left + g.size, g.top + 5, g)).toBe(-1);
    expect(hitTest(g.left + 5, g.top + g.size, g)).toBe(-1);
  });

  it("maps the far edges to the last row/column", () => {
    const g = geo();
    expect(hitTest(g.left + g.size - 0.01, g.top + g.size - 0.01, g)).toBe(63);
  });
});

describe("cellsOnLine", () => {
  it("fills a full row, excluding the start and including the end", () => {
    expect(cellsOnLine(0, 7, 8)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(cellsOnLine(7, 0, 8)).toEqual([6, 5, 4, 3, 2, 1, 0]);
  });

  it("fills a column", () => {
    expect(cellsOnLine(3, 59, 8)).toEqual([11, 19, 27, 35, 43, 51, 59]);
  });

  it("fills a diagonal", () => {
    expect(cellsOnLine(0, 63, 8)).toEqual([9, 18, 27, 36, 45, 54, 63]);
  });

  it("returns [] for the same cell and just the end for neighbours", () => {
    expect(cellsOnLine(5, 5, 8)).toEqual([]);
    expect(cellsOnLine(5, 6, 8)).toEqual([6]);
  });

  it("produces a 8-connected path of adjacent cells ending at `to`", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 12 }), fc.nat(), fc.nat(), (n, a, b) => {
        const from = a % (n * n);
        const to = b % (n * n);
        const path = cellsOnLine(from, to, n);
        if (from === to) return path.length === 0;
        let prev = from;
        for (const c of path) {
          const dr = Math.abs(Math.floor(c / n) - Math.floor(prev / n));
          const dc = Math.abs((c % n) - (prev % n));
          if (dr > 1 || dc > 1 || c < 0 || c >= n * n) return false;
          prev = c;
        }
        return path[path.length - 1] === to;
      }),
    );
  });
});

describe("moveFocus", () => {
  it("moves with arrows and clamps at edges", () => {
    expect(moveFocus(0, "ArrowLeft", 8)).toBe(0);
    expect(moveFocus(0, "ArrowUp", 8)).toBe(0);
    expect(moveFocus(0, "ArrowRight", 8)).toBe(1);
    expect(moveFocus(0, "ArrowDown", 8)).toBe(8);
    expect(moveFocus(63, "ArrowRight", 8)).toBe(63);
    expect(moveFocus(63, "ArrowDown", 8)).toBe(63);
    expect(moveFocus(63, "ArrowLeft", 8)).toBe(62);
    expect(moveFocus(63, "ArrowUp", 8)).toBe(55);
  });

  it("Home/End jump within the row; other keys do nothing", () => {
    expect(moveFocus(12, "Home", 8)).toBe(8);
    expect(moveFocus(12, "End", 8)).toBe(15);
    expect(moveFocus(12, "x", 8)).toBe(12);
  });
});
