import { expect, test } from "@playwright/test";
import { findPreset } from "../src/engine/presets";
import {
  expectedPattern,
  playPerfectRound,
  reachRecall,
  SEED,
  startSession,
  warmUp,
} from "./helpers";

test.describe("seeded session", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "flow is engine-independent; mobile covers input separately",
  );

  test("tapping the known pattern scores 100% every round", async ({ page }) => {
    test.setTimeout(120_000);
    await startSession(page, "Warm-up");
    const config = warmUp();
    for (let i = 0; i < config.rounds; i++) {
      await playPerfectRound(page, config, i);
      await expect(page.getByTestId("accuracy")).toContainText("100%");
      await expect(
        page.getByText(`${config.cellCount} / ${config.cellCount}`).first(),
      ).toBeVisible();
      await page
        .getByRole("button", { name: i + 1 < config.rounds ? "Next round" : "See summary" })
        .click();
    }
    await expect(page.getByText("Session complete", { exact: true })).toBeVisible();
    await expect(page.getByText("100%").first()).toBeVisible();
  });

  test("end-of-session feedback skips per-round results", async ({ page }) => {
    test.setTimeout(120_000);
    await startSession(page, "Competition");
    const config = findPreset("competition")!.config;
    await playPerfectRound(page, config, 0);
    // Straight to the next round, no result screen.
    await expect(page.getByText(/^Round 2 \/ 10/)).toBeVisible();
  });

  test("tab switch during the countdown voids the round and replays it with a new pattern", async ({
    page,
  }) => {
    await startSession(page, "Warm-up");
    await page.getByRole("button", { name: /^Start round/ }).click();
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
    });
    await expect(page.getByText("Timing interrupted", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Replay round" }).click();
    // The replay is round 1 again, attempt 1 → a different seed.
    await playPerfectRound(page, warmUp(), 0, 1);
    await expect(page.getByTestId("accuracy")).toContainText("100%");
  });

  test("browser Back mid-session asks before ending", async ({ page }) => {
    await startSession(page, "Warm-up");
    await page.goBack();
    await expect(page.getByRole("dialog", { name: "End session?" })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/train");
    await page.getByRole("button", { name: "Keep training" }).click();
    await expect(page.getByText("Get ready", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "End session" }).last().click();
    await expect(page.getByRole("tab", { name: "Presets" })).toBeVisible();
  });

  test("keyboard-only: start, select with arrows + Space, submit", async ({ page }) => {
    await startSession(page, "Warm-up");
    let attempt = 0;
    for (;;) {
      await page.keyboard.press("Space");
      const recall = page.getByText("Select the squares", { exact: true });
      const replay = page.getByRole("button", { name: "Replay round" });
      await expect(recall.or(replay)).toBeVisible({ timeout: 15_000 });
      if (await recall.isVisible()) break;
      // Dropped frames voided it (busy machine): replay with the keyboard.
      attempt++;
      await replay.focus();
      await page.keyboard.press("Enter");
      await page.locator("body").focus();
    }
    const n = 8;
    let focus = 0;
    for (const target of expectedPattern(warmUp(), SEED, 0, attempt)) {
      const [r0, c0, r1, c1] = [
        Math.floor(focus / n),
        focus % n,
        Math.floor(target / n),
        target % n,
      ];
      for (let i = 0; i < Math.abs(r1 - r0); i++)
        await page.keyboard.press(r1 > r0 ? "ArrowDown" : "ArrowUp");
      for (let i = 0; i < Math.abs(c1 - c0); i++)
        await page.keyboard.press(c1 > c0 ? "ArrowRight" : "ArrowLeft");
      await page.keyboard.press("Space");
      focus = target;
    }
    // Enter on the board toggles, so Tab out to Submit.
    await page.getByRole("button", { name: "Submit" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("accuracy")).toContainText("100%");
    await page.keyboard.press("Space");
    await expect(page.getByText(/^Round 2 \/ 5/)).toBeVisible();
  });

  test("the pattern isn't in the DOM during recall", async ({ page }) => {
    await startSession(page, "Warm-up");
    await reachRecall(page);
    await expect(page.locator("[data-lit]")).toHaveCount(0);
  });
});
