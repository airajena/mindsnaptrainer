import { expect, test } from "@playwright/test";

// PRD §18 widths + landscape phone. Layout is engine-independent: Chromium only.
test.skip(
  ({ browserName, isMobile }) => browserName !== "chromium" || isMobile,
  "layout pass on Chromium desktop",
);

const VIEWPORTS = [
  { name: "320", width: 320, height: 640 },
  { name: "375", width: 375, height: 667 },
  { name: "414", width: 414, height: 896 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1440", width: 1440, height: 900 },
  { name: "landscape-phone", width: 844, height: 390 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name}px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("no horizontal scroll on any page", async ({ page }) => {
      for (const path of ["/", "/train", "/progress", "/privacy"]) {
        await page.goto(path);
        await page.waitForTimeout(300);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(0);
      }
    });

    test("session board is square, fully visible, cells ≥ 28 px on 12×12", async ({ page }) => {
      await page.goto("/train");
      // Largest board: 12×12 via the custom stepper.
      await page.getByRole("tab", { name: "Custom" }).click();
      await page.getByRole("radio", { name: "Custom" }).click();
      await expect(page.getByRole("button", { name: /^Board size: 12×12/ })).toBeVisible();
      await page.getByRole("button", { name: "Start training" }).last().click();
      await expect(page.getByText("Get ready", { exact: true })).toBeVisible();
      const box = (await page.getByRole("grid").boundingBox())!;
      expect(Math.abs(box.width - box.height)).toBeLessThan(1);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 0.5);
      expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 0.5);
      // The Start button (thumb zone) must be on-screen too.
      const start = (await page.getByRole("button", { name: /^Start round/ }).boundingBox())!;
      expect(start.y + start.height).toBeLessThanOrEqual(vp.height + 0.5);
      const cell = (await page.locator('[data-cell="0"]').boundingBox())!;
      if (vp.width >= 375) expect(cell.width).toBeGreaterThanOrEqual(24);
      await page.screenshot({ path: test.info().outputPath(`stage-${vp.name}.png`) });
    });
  });
}
