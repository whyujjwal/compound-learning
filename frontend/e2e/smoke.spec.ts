import { test, expect } from "@playwright/test";

test.describe("Core navigation smoke", () => {
  test("library page loads", async ({ page }) => {
    await page.goto("/library");
    await expect(page.locator("h1.roadmap-title, h1")).toContainText(/Library|Syllabus/i, {
      timeout: 20_000,
    });
  });

  test("progress page loads", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("today page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("stats redirects to progress", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForURL(/\/progress/, { timeout: 10_000 });
  });

  test("tracks redirects to library", async ({ page }) => {
    await page.goto("/tracks");
    await page.waitForURL(/\/library/, { timeout: 10_000 });
  });
});
