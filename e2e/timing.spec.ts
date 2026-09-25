import { expect, test } from "@playwright/test";

type Sample =
  | {
      kind: "done";
      targetMs: number;
      actualMs: number;
      frames: number;
      framePeriod: number;
      reliable: boolean;
      maxFrameGapMs: number;
    }
  | { kind: "void"; reason: string };

// PRD §22: "50 rounds at 1000 ms, every measured exposure within ±1 frame."
// Mobile projects share engines with the desktop ones, so desktop covers it.
test.describe("exposure timing", () => {
  test.skip(({ isMobile }) => isMobile, "engine already covered by desktop projects");

  test("50 exposures at 1000 ms are each within ±1 frame @timing", async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(240_000);
    await page.goto("/lab");
    const runs = page.getByLabel("Runs");
    await runs.fill("50");
    await page.getByLabel("Target (ms)").fill("1000");
    await page.getByTestId("timing-start").click();
    await expect(page.getByTestId("timing-stats")).toHaveAttribute("data-status", "done", {
      timeout: 200_000,
    });

    const samples = (await page.evaluate(() => window.__lab?.timing?.samples ?? [])) as Sample[];
    expect(samples).toHaveLength(50);
    const done = samples.filter((s): s is Extract<Sample, { kind: "done" }> => s.kind === "done");

    const errors = done.map((s) => s.actualMs - s.targetMs);
    const period = done.reduce((a, s) => a + s.framePeriod, 0) / done.length;
    const outside = done.filter((s) => Math.abs(s.actualMs - s.targetMs) > s.framePeriod + 0.5);
    const unreliable = done.filter((s) => !s.reliable);
    const summary = {
      project: testInfo.project.name,
      counted: done.length,
      voided: samples.length - done.length,
      unreliable: unreliable.length,
      framePeriodMs: +period.toFixed(3),
      meanActualMs: +(done.reduce((a, s) => a + s.actualMs, 0) / done.length).toFixed(2),
      minActualMs: +Math.min(...done.map((s) => s.actualMs)).toFixed(2),
      maxActualMs: +Math.max(...done.map((s) => s.actualMs)).toFixed(2),
      maxAbsErrorMs: +Math.max(...errors.map(Math.abs)).toFixed(2),
      framesHistogram: done.reduce<Record<number, number>>((h, s) => {
        h[s.frames] = (h[s.frames] ?? 0) + 1;
        return h;
      }, {}),
    };
    console.log(`TIMING ${JSON.stringify(summary)}`);
    await testInfo.attach("timing-summary", {
      body: JSON.stringify(summary, null, 2),
      contentType: "application/json",
    });

    // 1. The algorithm: with no dropped frame, the error is at most ½ frame
    //    (+1 ms for engines that quantise timestamps). Holds on every engine.
    const clean = done.filter((s) => s.maxFrameGapMs <= s.framePeriod * 1.5);
    const cleanOff = clean.filter((s) => Math.abs(s.actualMs - s.targetMs) > s.framePeriod / 2 + 1);
    expect(cleanOff).toEqual([]);

    // 2. Honest classification: nothing that would be counted is off by more
    //    than ±1 frame (dropped-frame rounds are voided and replayed).
    expect(outside.filter((s) => s.reliable)).toEqual([]);

    // 3. Environment health: a browser at a steady refresh rate should rarely
    //    drop frames. Playwright's Windows WebKit port has irregular rAF and
    //    says nothing about Safari, so there it's reported, not asserted.
    const reliable = done.filter((s) => s.reliable);
    if (process.platform === "win32" && browserName === "webkit") {
      testInfo.annotations.push({
        type: "info",
        description: `Windows WebKit: ${reliable.length}/50 reliable (reported, not asserted)`,
      });
    } else {
      expect(reliable.length).toBeGreaterThanOrEqual(48);
    }
  });
});
