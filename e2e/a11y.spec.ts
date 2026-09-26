import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { playPerfectRound, startSession, warmUp } from "./helpers";

// WCAG 2.2 AA on every non-game screen (PRD §17). Axe is engine-independent,
// so Chromium desktop + Pixel 7 cover it.
test.skip(({ browserName }) => browserName !== "chromium", "axe runs on Chromium");

async function expectNoSeriousViolations(page: Page, name: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const report = serious.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
  );
  expect(report, `${name}: serious/critical axe violations`).toEqual([]);
}

test("landing", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expectNoSeriousViolations(page, "landing");
});

test("privacy", async ({ page }) => {
  await page.goto("/privacy");
  await expectNoSeriousViolations(page, "privacy");
});

test("setup: presets, tests, custom tabs", async ({ page }) => {
  await page.goto("/train");
  await page.waitForLoadState("networkidle");
  await expectNoSeriousViolations(page, "setup presets");
  await page.getByRole("tab", { name: "Tests" }).click();
  await expectNoSeriousViolations(page, "setup tests");
  await page.getByRole("tab", { name: "Custom" }).click();
  await expectNoSeriousViolations(page, "setup custom");
});

test("settings sheet", async ({ page }) => {
  await page.goto("/train");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await expectNoSeriousViolations(page, "settings");
});

test("round result, summary and progress", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/train?seed=123");
  await page.getByRole("tab", { name: "Custom" }).click();
  const fewer = page.getByRole("button", { name: "Decrease Rounds" });
  for (let i = 0; i < 4; i++) await fewer.click();
  await page.getByRole("button", { name: "Start training" }).last().click();
  await playPerfectRound(page, { ...warmUp(), rounds: 1 }, 0);
  await expect(page.getByTestId("accuracy")).toBeVisible();
  await expectNoSeriousViolations(page, "result");
  await page.getByRole("button", { name: "See summary" }).click();
  await expect(page.getByText("Session complete", { exact: true })).toBeVisible();
  await expectNoSeriousViolations(page, "summary");
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expectNoSeriousViolations(page, "progress");
});

test("ready and recall screens", async ({ page }) => {
  await startSession(page, "Warm-up");
  await expectNoSeriousViolations(page, "ready");
});
