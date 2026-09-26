import { expect, test } from "@playwright/test";
import { expectedPattern, SEED, warmUp } from "./helpers";

// Round start "Automatic": after the first countdown, rounds run back to back
// with only the fixation dot — no 3-2-1, no waiting, no Start button.
// Behaviour is engine-independent; runs in the serial perf pass (real exposures).
test.skip(
  ({ browserName, isMobile }) => browserName !== "chromium" || isMobile,
  "flow check on Chromium",
);

test("automatic rounds flow back to back without a countdown @perf", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(`/train?seed=${SEED}`);
  await page.getByRole("tab", { name: "Custom" }).click();
  const fewer = page.getByRole("button", { name: "Decrease Rounds" });
  for (let i = 0; i < 3; i++) await fewer.click(); // Warm-up 5 → 2 rounds
  await page.getByRole("radio", { name: "Automatic" }).click();
  await page.getByRole("radio", { name: "End of session" }).click();
  await page.getByRole("button", { name: "Start training" }).last().click();

  // Round 1: starts by itself, with the configured 3-2-1 (1.2 s) + dot (0.3 s) + 1.5 s exposure.
  await page.waitForTimeout(3_400);
  const recall = page.getByText("Select the squares", { exact: true });
  await expect(recall).toBeVisible();
  const config = { ...warmUp(), rounds: 2, roundStart: "auto" as const, feedback: "end" as const };
  const board = page.getByRole("grid");
  for (const c of expectedPattern(config, SEED, 0))
    await board.locator(`[data-cell="${c}"]`).click();

  // Watch the countdown overlay and the controls from here on.
  await page.evaluate(() => {
    const w = window as unknown as { __overlay: string[]; __startButtons: number };
    w.__overlay = [];
    w.__startButtons = 0;
    const overlay = document.querySelector(".countdown")!;
    new MutationObserver(() => w.__overlay.push(overlay.textContent ?? "")).observe(overlay, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    new MutationObserver(() => {
      if (
        [...document.querySelectorAll("button")].some((b) =>
          /^Start round/.test(b.textContent ?? ""),
        )
      ) {
        w.__startButtons++;
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  const submittedAt = Date.now();
  await page.getByRole("button", { name: "Submit" }).click();

  // Round 2: fixation dot (0.3 s) + 1.5 s exposure, no tap needed. Stay still meanwhile.
  await page.waitForTimeout(2_200);
  await expect(page.getByText(/^Round 2 \/ 2/)).toBeVisible();
  await expect(recall).toBeVisible();
  const elapsed = Date.now() - submittedAt;

  const seen = await page.evaluate(() => {
    const w = window as unknown as { __overlay: string[]; __startButtons: number };
    return { overlay: w.__overlay, startButtons: w.__startButtons };
  });
  expect(
    seen.overlay.filter((t) => /\d/.test(t)),
    "no countdown digits in round 2",
  ).toEqual([]);
  expect(seen.startButtons, "no Start round button in automatic mode").toBe(0);
  // Submit → recall of round 2 is just fixation + exposure (+ test overhead), well under the old ~4.5 s.
  expect(elapsed).toBeLessThan(3_500);
});
