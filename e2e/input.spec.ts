import { expect, type Locator, type Page, test } from "@playwright/test";

const latencyBoard = (page: Page) => page.getByRole("grid", { name: "Latency test board" });

async function cellCenter(board: Locator, index: number) {
  const box = await board.locator(`[data-cell="${index}"]`).boundingBox();
  if (!box) throw new Error(`cell ${index} not visible`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

const selected = (board: Locator) => board.locator("[data-selected]");

test.beforeEach(async ({ page }) => {
  await page.goto("/lab");
  await latencyBoard(page).scrollIntoViewIfNeeded();
});

test.describe("pointer input", () => {
  test.skip(({ hasTouch }) => hasTouch, "mouse tests run on desktop projects");

  test("a cell toggles on pointer-down, before release", async ({ page }) => {
    const board = latencyBoard(page);
    const p = await cellCenter(board, 10);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await expect(board.locator('[data-cell="10"]')).toHaveAttribute("data-selected", "");
    await page.mouse.up();
    // A second tap deselects.
    await page.mouse.down();
    await page.mouse.up();
    await expect(board.locator('[data-cell="10"]')).not.toHaveAttribute("data-selected");
  });

  test("a fast swipe across a full row selects every cell in it", async ({ page }) => {
    const board = latencyBoard(page);
    const start = await cellCenter(board, 24);
    const end = await cellCenter(board, 31);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    // Two move events for 8 cells: only line-fill can catch the skipped ones.
    await page.mouse.move(end.x, end.y, { steps: 2 });
    await page.mouse.up();
    const cells = await selected(board).evaluateAll((els) =>
      els.map((e) => Number(e.getAttribute("data-cell"))),
    );
    expect(cells).toEqual([24, 25, 26, 27, 28, 29, 30, 31]);
  });

  test("a drag that starts on a selected cell deselects", async ({ page }) => {
    const board = latencyBoard(page);
    for (const i of [0, 1, 2, 3]) {
      const p = await cellCenter(board, i);
      await page.mouse.click(p.x, p.y);
    }
    const a = await cellCenter(board, 0);
    const b = await cellCenter(board, 5);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 3 });
    await page.mouse.up();
    await expect(selected(board)).toHaveCount(0);
  });

  test("gaps between cells are not dead zones", async ({ page }) => {
    const board = latencyBoard(page);
    const a = await board.locator('[data-cell="0"]').boundingBox();
    const b = await board.locator('[data-cell="1"]').boundingBox();
    if (!a || !b) throw new Error("no boxes");
    const gapX = (a.x + a.width + b.x) / 2; // middle of the gap
    await page.mouse.click(gapX - 0.5, a.y + a.height / 2);
    await expect(selected(board)).toHaveCount(1);
  });

  test("keyboard: arrows move focus, Space toggles", async ({ page }) => {
    const board = latencyBoard(page);
    await board.locator('[data-cell="0"]').focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(board.locator('[data-cell="9"]')).toHaveAttribute("data-selected", "");
    await expect(board.locator('[data-cell="9"]')).toBeFocused();
  });

  // Tagged @perf: runs in the serial pass (see `test:e2e`) so other workers
  // don't steal the CPU it's measuring.
  test("tap latency sample @perf", async ({ page, browserName }, testInfo) => {
    const board = latencyBoard(page);
    // One read of all centres (the board doesn't move) instead of 40 round-trips.
    const centres = await board.locator("[data-cell]").evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }),
    );
    for (let i = 0; i < 40; i++) {
      const p = centres[(i * 7) % 64]!;
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(30);
    }
    await page.waitForFunction(() => (window.__lab?.latency?.length ?? 0) >= 40);
    const lat = (await page.evaluate(() => window.__lab?.latency ?? [])).sort((x, y) => x - y);
    const pct = (p: number) => lat[Math.max(0, Math.ceil((p / 100) * lat.length) - 1)]!;
    const summary = {
      project: testInfo.project.name,
      n: lat.length,
      p50: +pct(50).toFixed(2),
      p95: +pct(95).toFixed(2),
      max: +lat[lat.length - 1]!.toFixed(2),
    };
    console.log(`LATENCY ${JSON.stringify(summary)}`);
    // Budget: one frame + 8 ms. Headless isn't a phone; this is a regression
    // guard. Playwright's Windows WebKit port has irregular frame scheduling
    // and says nothing about Safari, so there it's reported only.
    if (process.platform === "win32" && browserName === "webkit") {
      testInfo.annotations.push({
        type: "info",
        description: `Windows WebKit latency p95 ${summary.p95} ms (reported only)`,
      });
    } else {
      expect(summary.p95).toBeLessThan(16.7 + 8);
    }
  });
});

test.describe("touch input", () => {
  test.skip(({ hasTouch }) => !hasTouch, "touch tests run on mobile projects");

  test("tap selects a cell", async ({ page }) => {
    const board = latencyBoard(page);
    const p = await cellCenter(board, 20);
    await page.touchscreen.tap(p.x, p.y);
    await expect(board.locator('[data-cell="20"]')).toHaveAttribute("data-selected", "");
  });

  test("touch swipe across a row selects every cell, and the page doesn't scroll", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "raw touch sequences need CDP");
    const board = latencyBoard(page);
    const start = await cellCenter(board, 16);
    const end = await cellCenter(board, 23);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", x: number, y: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }],
      });
    await touch("touchStart", start.x, start.y);
    await touch("touchMove", (start.x + end.x) / 2, start.y);
    await touch("touchMove", end.x, end.y);
    await touch("touchEnd", end.x, end.y);
    const cells = await selected(board).evaluateAll((els) =>
      els.map((e) => Number(e.getAttribute("data-cell"))),
    );
    expect(cells).toEqual([16, 17, 18, 19, 20, 21, 22, 23]);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });
});
