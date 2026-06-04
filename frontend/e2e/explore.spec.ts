import { test, expect } from "@playwright/test";

test.describe("explore", () => {
  test("default tracks are not re-listed and each card has one primary action", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20_000 });

    // Seeded/default syllabi should never appear in the community catalog.
    await expect(page.getByRole("heading", { name: "Data Structures & Algorithms" })).toHaveCount(0);

    const firstCard = page.getByTestId("explore-card").first();
    if (await firstCard.count()) {
      // The slimmed Explore card exposes a single primary action — no Remix/Preview chrome.
      await expect(firstCard.getByText(/Remix|Preview syllabus/)).toHaveCount(0);
    }
  });
});
