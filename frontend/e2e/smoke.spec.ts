import { test, expect } from "@playwright/test";

test.describe("Core navigation smoke", () => {
  test("library page loads with a heading", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("today page loads with the app shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // The rebuilt shell renders sidebar navigation on every in-app page.
    await expect(page.getByRole("navigation").first()).toBeVisible({ timeout: 20_000 });
  });

  test("profile page loads with a heading", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  // Retired routes now redirect into the consolidated 4-destination nav.
  test("stats redirects to profile", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForURL(/\/profile/, { timeout: 10_000 });
  });

  test("progress redirects to profile", async ({ page }) => {
    await page.goto("/progress");
    await page.waitForURL(/\/profile/, { timeout: 10_000 });
  });

  test("tracks redirects to library", async ({ page }) => {
    await page.goto("/tracks");
    await page.waitForURL(/\/library/, { timeout: 10_000 });
  });
});
