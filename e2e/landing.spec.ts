import { expect, type Page, test } from "@playwright/test";

/** Quick countdown (500 ms) + fixation (300 ms) + 1.5 s exposure + slack. */
const DEMO_TIMED_MS = 2_600;

/** Starts collecting every layout shift (including ones right after input). Chromium only. */
async function watchLayoutShifts(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __shifts: number[] };
    w.__shifts = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          w.__shifts.push((e as unknown as { value: number }).value);
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // Not supported (Firefox/WebKit).
    }
  });
}
const totalShift = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __shifts: number[] }).__shifts.reduce((a, b) => a + b, 0),
  );

// @perf: timing-sensitive (a real exposure), so it runs in the serial pass.
test("landing: headline, demo round, no layout shift @perf", async ({ page, browserName }) => {
  await watchLayoutShifts(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "One second. Eighteen squares. Remember them all.",
  );

  // "Try it right here" moves focus to the demo.
  await page.getByRole("link", { name: "Try it right here" }).click();
  await expect(page.locator("#demo-play")).toBeFocused();

  // One real round: flash → recall → result.
  // Don't poll the page while the pattern is on screen: Playwright's polling
  // round-trips can cost Firefox a frame at 144 Hz and (correctly) void the
  // round. Real visitors have no automation polling their page.
  await page.waitForLoadState("networkidle");
  await page.locator("#demo-play").click();
  await page.waitForTimeout(DEMO_TIMED_MS);
  const recall = page.getByText("Tap the squares you saw");
  const voided = page.locator(".demo-caption[data-void-reason]");
  for (let attempt = 0; ; attempt++) {
    await expect(recall.or(voided)).toBeVisible({ timeout: 10_000 });
    if (await recall.isVisible()) break;
    const reason = await voided.getAttribute("data-void-reason");
    // Playwright's Windows WebKit drops frames constantly (DECISIONS D14):
    // voiding is the correct behaviour there, so record it and stop.
    if (attempt >= 2 && process.platform === "win32" && browserName === "webkit") {
      test
        .info()
        .annotations.push({ type: "info", description: `Windows WebKit demo voided: ${reason}` });
      return;
    }
    expect(attempt, `demo voided: ${reason}`).toBeLessThan(4);
    await page.getByRole("button", { name: "Try again" }).click();
    await page.waitForTimeout(DEMO_TIMED_MS);
  }
  const cells = page.getByRole("grid", { name: /Demo board/ }).locator("[data-cell]");
  for (const i of [0, 6, 12, 18, 24, 3]) await cells.nth(i).click();
  await expect(page.getByText(/\/ 6/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();

  if (browserName === "chromium") expect(await totalShift(page)).toBe(0);
});

test("landing: sticky CTA appears after the hero on phones", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only bar");
  await page.goto("/");
  const bar = page.locator(".sticky-cta");
  await expect(bar).toHaveAttribute("data-visible", "false");
  await page.getByRole("heading", { name: "Questions" }).scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute("data-visible", "true");
  await expect(bar.getByRole("link", { name: "Start training" })).toBeVisible();
});

test("privacy page and 404 render", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your data stays on your device.",
  );
  await expect(page.getByText(/not affiliated/i).first()).toBeVisible();
  const res = await page.goto("/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Nothing flashed here." })).toBeVisible();
});

test("no third-party requests on any page", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const foreign: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith("http") && url.origin !== origin) foreign.push(req.url());
  });
  for (const path of ["/", "/train", "/progress", "/privacy"]) {
    await page.goto(path);
    await page.waitForTimeout(500);
  }
  expect(foreign).toEqual([]);
});

test.describe("session layout stability", () => {
  test.skip(
    ({ browserName, isMobile }) => browserName !== "chromium" || isMobile,
    "layout-shift API is Chromium",
  );

  test("the board never moves and CLS is 0 from ready through recall", async ({ page }) => {
    await watchLayoutShifts(page);
    await page.goto("/train?seed=123");
    await page.getByRole("button", { name: /^Warm-up/ }).click();
    await page.getByRole("button", { name: "Start training" }).last().click();
    const board = page.getByRole("grid");
    const rects: string[] = [];
    const snap = async () => {
      const b = await board.boundingBox();
      rects.push(JSON.stringify(b));
    };
    await expect(page.getByText("Get ready", { exact: true })).toBeVisible();
    await page.waitForTimeout(300);
    const before = await totalShift(page);
    await snap();
    await page.getByRole("button", { name: /^Start round/ }).click();
    await page.waitForTimeout(200);
    await snap(); // countdown
    await page.waitForTimeout(1100);
    await snap(); // fixation / memorize
    const recall = page.getByText("Select the squares", { exact: true });
    const replay = page.getByRole("button", { name: "Replay round" });
    await expect(recall.or(replay)).toBeVisible({ timeout: 10_000 });
    await snap(); // recall (or void)
    expect(new Set(rects).size).toBe(1);
    expect((await totalShift(page)) - before).toBe(0);
  });
});
