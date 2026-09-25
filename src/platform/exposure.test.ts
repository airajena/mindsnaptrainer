import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isReliable, runExposure } from "./exposure";

/**
 * A deterministic display: frames at a fixed period, with optional dropped
 * frames. Each tick runs the rAF callbacks registered before it, like a
 * browser does, with the frame's start time as the timestamp.
 */
class FakeDisplay {
  private queue = new Map<number, FrameRequestCallback>();
  private id = 0;
  private frameIndex = 0;
  constructor(
    private period: number,
    private dropped: ReadonlySet<number> = new Set(),
    private t0 = 1000,
  ) {}

  request = (cb: FrameRequestCallback) => {
    this.id++;
    this.queue.set(this.id, cb);
    return this.id;
  };

  cancel = (id: number) => {
    this.queue.delete(id);
  };

  /** Advance one presented frame. Dropped frame indexes are skipped (no callbacks). */
  tick() {
    do this.frameIndex++;
    while (this.dropped.has(this.frameIndex));
    const t = this.t0 + this.frameIndex * this.period;
    const callbacks = [...this.queue.values()];
    this.queue.clear();
    for (const cb of callbacks) cb(t);
  }

  async runUntil(p: Promise<unknown>, maxFrames = 2000) {
    let settled = false;
    p.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    for (let i = 0; i < maxFrames && !settled; i++) {
      this.tick();
      await Promise.resolve();
    }
  }
}

function fakeBoard() {
  return { dataset: {} as DOMStringMap } as unknown as HTMLElement;
}

let display: FakeDisplay;

function install(d: FakeDisplay) {
  display = d;
  vi.stubGlobal("requestAnimationFrame", d.request);
  vi.stubGlobal("cancelAnimationFrame", d.cancel);
}

beforeEach(() => install(new FakeDisplay(1000 / 60)));
afterEach(() => vi.unstubAllGlobals());

async function expose(targetMs: number, period: number, dropped: number[] = []) {
  install(new FakeDisplay(period, new Set(dropped)));
  const board = fakeBoard();
  const p = runExposure(board, targetMs, period, new AbortController().signal);
  await display.runUntil(p);
  return { m: await p, board };
}

describe("runExposure", () => {
  for (const hz of [60, 90, 120, 144]) {
    it(`${hz} Hz: 1000 ms target is within ½ frame and reliable`, async () => {
      const period = 1000 / hz;
      const { m, board } = await expose(1000, period);
      expect(Math.abs(m.actualMs - 1000)).toBeLessThanOrEqual(period / 2 + 1e-9);
      expect(m.frames).toBe(Math.round(1000 / period));
      expect(m.reliable).toBe(true);
      expect(board.dataset.reveal).toBe("false");
    });
  }

  it("targets that aren't a whole number of frames round to the nearest frame", async () => {
    const period = 1000 / 60;
    for (const target of [150, 500, 750, 1010, 1234, 5000]) {
      const { m } = await expose(target, period);
      expect(Math.abs(m.actualMs - target)).toBeLessThanOrEqual(period / 2 + 1e-9);
      expect(m.actualMs).toBeCloseTo(Math.round(target / period) * period, 6);
    }
  });

  it("a dropped frame mid-exposure is tolerated (gap = 2 frames)", async () => {
    const period = 1000 / 60;
    const { m } = await expose(1000, period, [20]);
    expect(m.maxFrameGapMs).toBeCloseTo(2 * period, 6);
    expect(m.actualMs).toBeCloseTo(1000, 6);
    expect(m.reliable).toBe(true);
  });

  it("a stall longer than 2 frames is unreliable", async () => {
    const period = 1000 / 60;
    const { m } = await expose(1000, period, [20, 21]);
    expect(m.maxFrameGapMs).toBeCloseTo(3 * period, 6);
    expect(m.reliable).toBe(false);
  });

  it("a dropped hide frame overshoots by exactly 1 frame: still within the promise", async () => {
    const period = 1000 / 60;
    // The reveal is display frame 1, so the hide belongs on frame 61 (1000 ms
    // later); it's dropped, so frame 62 hides.
    const { m } = await expose(1000, period, [61]);
    expect(m.actualMs).toBeCloseTo(61 * period, 6);
    expect(m.reliable).toBe(true);
  });

  it("a dropped hide frame that overshoots by more than 1 frame is unreliable (D11)", async () => {
    const period = 1000 / 60;
    // 1010 ms → ideal hide on frame 62 (1016.7 ms, +0.4 frame). Frame 62 is
    // dropped, so frame 63 hides at 1033.3 ms: +1.4 frames. The gap is only 2
    // frames, so PRD's gap rule alone would have counted this round.
    const { m } = await expose(1010, period, [62]);
    expect(m.actualMs).toBeCloseTo(62 * period, 6);
    expect(m.maxFrameGapMs).toBeCloseTo(2 * period, 6);
    expect(m.reliable).toBe(false);
  });

  it("aborting rejects and hides the pattern", async () => {
    const board = fakeBoard();
    const controller = new AbortController();
    const p = runExposure(board, 1000, 1000 / 60, controller.signal);
    display.tick();
    expect(board.dataset.reveal).toBe("true");
    display.tick();
    controller.abort(new Error("hidden"));
    await expect(p).rejects.toThrow("hidden");
    expect(board.dataset.reveal).toBe("false");
  });

  it("rejects immediately when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort(new Error("gone"));
    await expect(runExposure(fakeBoard(), 1000, 16.7, controller.signal)).rejects.toThrow("gone");
  });
});

describe("isReliable", () => {
  const p = 1000 / 60;
  it("accepts on-target exposures with normal gaps", () => {
    expect(isReliable(1000, 1000, p, p)).toBe(true);
  });
  it("rejects stalls above 2 frames", () => {
    expect(isReliable(1000, 1000, 2 * p + 0.4, p)).toBe(true);
    expect(isReliable(1000, 1000, 2 * p + 0.6, p)).toBe(false);
  });
  it("rejects errors above 1 frame (+0.5 ms quantisation)", () => {
    expect(isReliable(1000 + p + 0.4, 1000, p, p)).toBe(true);
    expect(isReliable(1000 + p + 0.6, 1000, p, p)).toBe(false);
    expect(isReliable(1000 - p - 0.6, 1000, p, p)).toBe(false);
  });
});
