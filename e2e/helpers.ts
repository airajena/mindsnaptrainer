import { expect, type Page } from "@playwright/test";
import { normalizeSessionConfig } from "../src/engine/config";
import { generatePattern } from "../src/engine/generator";
import { findPreset } from "../src/engine/presets";
import { roundSeed } from "../src/engine/rng";
import type { SessionConfig } from "../src/engine/types";

export const SEED = 123;

/** The pattern the app will show for a round — same pure engine, same seed. */
export function expectedPattern(config: SessionConfig, seed: number, index: number, attempt = 0) {
  return generatePattern(normalizeSessionConfig(config), roundSeed(seed, index, attempt));
}

export const warmUp = () => findPreset("warm-up")!.config;

export async function startSession(page: Page, presetName: string, seed = SEED) {
  await page.goto(`/train?seed=${seed}`);
  await page.getByRole("button", { name: new RegExp(`^${presetName}`) }).click();
  await page
    .getByRole("button", { name: /^Start (training|capacity test|speed test)$/ })
    .last()
    .click();
  await expect(page.getByText("Get ready", { exact: true })).toBeVisible();
}

/**
 * Starts the current round and waits for recall. A busy CI machine can drop
 * frames, which (correctly) voids the round; then replay, like a player
 * would, and the next attempt's seed applies. Returns the attempt reached.
 */
export async function reachRecall(
  page: Page,
  startAttempt = 0,
  exposureMs = 1500,
): Promise<number> {
  let attempt = startAttempt;
  // Standard countdown (1.2 s) + fixation (0.3 s) + exposure. Sitting still
  // meanwhile matters: polling the page during the exposure can cost a
  // frame in Firefox at 144 Hz and void the round.
  const timedMs = 1500 + exposureMs + 300;
  await page.getByRole("button", { name: /^Start round/ }).click();
  await page.waitForTimeout(timedMs);
  for (;;) {
    const recall = page.getByText("Select the squares", { exact: true });
    const voided = page.getByRole("button", { name: "Replay round" });
    await expect(recall.or(voided)).toBeVisible({ timeout: 15_000 });
    if (await recall.isVisible()) return attempt;
    attempt++;
    await voided.click();
    await page.getByRole("button", { name: /^Start round/ }).click();
    await page.waitForTimeout(timedMs);
  }
}

/** Plays round `index` selecting exactly the expected pattern, then submits. */
export async function playPerfectRound(
  page: Page,
  config: SessionConfig,
  index: number,
  startAttempt = 0,
) {
  const attempt = await reachRecall(page, startAttempt, config.exposureMs);
  const board = page.getByRole("grid");
  for (const c of expectedPattern(config, SEED, index, attempt))
    await board.locator(`[data-cell="${c}"]`).click();
  await page.getByRole("button", { name: "Submit" }).click();
  return attempt;
}
