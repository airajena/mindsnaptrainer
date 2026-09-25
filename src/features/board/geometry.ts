import type { CellIndex } from "@/engine/types";

export interface BoardGeometry {
  left: number;
  top: number;
  /** Board edge length in CSS px (the board is square). */
  size: number;
  /** Gap between cells in CSS px. */
  gap: number;
  n: number;
}

/**
 * Maps a point to a cell with no dead zones: each gap is split down the
 * middle between its two cells, so every point on the board hits exactly one
 * cell. Returns -1 outside the board.
 *
 * With cell size c and gap g, n·c + (n−1)·g = size, and cell i starts at
 * i·(c+g). Shifting by g/2 puts each boundary in the middle of a gap.
 */
export function hitTest(x: number, y: number, geo: BoardGeometry): CellIndex {
  const dx = x - geo.left;
  const dy = y - geo.top;
  if (dx < 0 || dy < 0 || dx >= geo.size || dy >= geo.size) return -1;
  const pitch = (geo.size + geo.gap) / geo.n;
  const col = Math.min(geo.n - 1, Math.floor((dx + geo.gap / 2) / pitch));
  const row = Math.min(geo.n - 1, Math.floor((dy + geo.gap / 2) / pitch));
  return row * geo.n + col;
}

/**
 * Cells on the straight line from `from` to `to` (Bresenham), excluding
 * `from`, including `to`. Fills cells a fast swipe jumped over between two
 * pointer samples.
 */
export function cellsOnLine(from: CellIndex, to: CellIndex, n: number): CellIndex[] {
  let x0 = from % n;
  let y0 = Math.floor(from / n);
  const x1 = to % n;
  const y1 = Math.floor(to / n);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const out: CellIndex[] = [];
  while (x0 !== x1 || y0 !== y1) {
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
    out.push(y0 * n + x0);
  }
  return out;
}

/** Arrow-key focus movement, clamped at the edges (no wrap — predictable for spatial recall). */
export function moveFocus(cell: CellIndex, key: string, n: number): CellIndex {
  const row = Math.floor(cell / n);
  const col = cell % n;
  switch (key) {
    case "ArrowUp":
      return row > 0 ? cell - n : cell;
    case "ArrowDown":
      return row < n - 1 ? cell + n : cell;
    case "ArrowLeft":
      return col > 0 ? cell - 1 : cell;
    case "ArrowRight":
      return col < n - 1 ? cell + 1 : cell;
    case "Home":
      return row * n;
    case "End":
      return row * n + n - 1;
    default:
      return cell;
  }
}
