import { test, expect } from "@playwright/test";

// These exercise a seeded syllabus ("dsa"). When no backend/DB is attached the
// page renders its empty state, so the data-dependent assertions skip cleanly.
test.describe("course views", () => {
  test("outline shows modules -> sections -> materials", async ({ page }) => {
    await page.goto("/library/dsa");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20_000 });

    const modules = page.getByTestId("outline-module");
    if ((await modules.count()) === 0) {
      test.skip(true, "no seeded syllabus data (backend not attached)");
    }
    // The first module is expanded by default, revealing its materials.
    await expect(page.getByTestId("resource-chip").first()).toBeVisible();
  });

  test("roadmap renders nodes and a legend", async ({ page }) => {
    await page.goto("/library/dsa?tab=map");

    const legend = page.getByTestId("roadmap-legend");
    if ((await legend.count()) === 0) {
      test.skip(true, "no seeded roadmap data (backend not attached)");
    }
    await expect(legend).toBeVisible();
    await expect(page.getByTestId("roadmap-node").first()).toBeVisible();
  });
});
