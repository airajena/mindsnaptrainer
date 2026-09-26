import { expect, test } from "@playwright/test";
import { playPerfectRound, warmUp } from "./helpers";

test.skip(({ isMobile }) => isMobile, "storage behaviour is engine-level; desktop covers it");

test("history, presets and settings survive reload; delete-all wipes them", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/train?seed=123");

  // A one-round custom session, saved as a preset.
  await page.getByRole("tab", { name: "Custom" }).click();
  const fewer = page.getByRole("button", { name: "Decrease Rounds" });
  for (let i = 0; i < 4; i++) await fewer.click();
  await expect(page.getByRole("button", { name: /^Rounds: 1\./ })).toBeVisible();
  await page.getByRole("button", { name: "Save as preset" }).click();
  await page.getByLabel("Name").fill("One-shot");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await page.getByRole("button", { name: "Start training" }).last().click();
  await playPerfectRound(page, { ...warmUp(), rounds: 1 }, 0);
  await page.getByRole("button", { name: "See summary" }).click();
  await expect(page.getByText("Session complete", { exact: true })).toBeVisible();

  // Settings change.
  await page.getByRole("button", { name: "Change settings" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const haptics = page.getByRole("switch", { name: /Haptics/ });
  await expect(haptics).toBeChecked();
  await haptics.click();
  await page.keyboard.press("Escape");

  // Everything survives a reload.
  await page.goto("/progress");
  await expect(page.locator("li").getByText("8×8 · 10 · 1.50 s")).toBeVisible();
  await expect(page.getByText("100%").first()).toBeVisible();
  await page.reload();
  await expect(page.locator("li").getByText("8×8 · 10 · 1.50 s")).toBeVisible();
  await page.goto("/train");
  // The last-used tab (Custom) is restored; saved presets live under Presets.
  await expect(page.getByRole("tab", { name: "Custom" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Presets" }).click();
  await expect(page.getByText("Your presets")).toBeVisible();
  await expect(page.getByRole("button", { name: /^One-shot/ })).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("switch", { name: /Haptics/ })).not.toBeChecked();

  // Delete all.
  await page.getByRole("button", { name: "Delete all data" }).click();
  await page.getByRole("button", { name: "Delete everything" }).click();
  // Deleting is async (IndexedDB); the app confirms when it's done.
  await expect(page.getByText("All data deleted.")).toBeVisible();
  await page.goto("/progress");
  await expect(page.getByText("No sessions yet")).toBeVisible();
  await page.goto("/train");
  await page.getByRole("tab", { name: "Presets" }).click();
  await expect(page.getByText("Your presets")).toHaveCount(0);
});

test("corrupt stored settings are quarantined, never fatal", async ({ page }) => {
  await page.goto("/train");
  await page.evaluate(() => localStorage.setItem("mindsnap:settings", "{not json"));
  await page.reload();
  await expect(page.getByText("couldn't be read")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start training" }).last()).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.some((k) => k.startsWith("quarantine:mindsnap:settings:"))).toBe(true);
});
