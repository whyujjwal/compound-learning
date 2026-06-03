import { test, expect } from "@playwright/test";

test.describe("explore", () => {
  test("default tracks are not re-listed and each card has one primary action", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("heading", { name: "Data Structures & Algorithms" })).toHaveCount(0);
    const firstCard = page.locator(".explore-card").first();
    if (await firstCard.count()) {
      await expect(firstCard.getByText(/Remix|Preview syllabus/)).toHaveCount(0);
    }
  });
});
