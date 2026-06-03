import { test, expect } from "@playwright/test";

test.describe("course views", () => {
  test("outline shows modules -> sections -> materials", async ({ page }) => {
    await page.goto("/library/dsa");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const firstModule = page.locator(".course-outline-module-head").first();
    await firstModule.click();
    await expect(page.locator(".course-chip").first()).toBeVisible();
  });

  test("roadmap renders nodes and a legend", async ({ page }) => {
    await page.goto("/library/dsa?tab=map");
    await expect(page.locator(".course-roadmap-legend")).toBeVisible();
    await expect(page.locator(".course-roadmap-node").first()).toBeVisible();
  });
});
