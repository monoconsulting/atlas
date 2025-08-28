import { test, expect } from "@playwright/test";

test.describe("Kanban Task Board", () => {
  test("renders task cards without loading indicator", async ({ page }) => {
  // The app is exposed on host port 8199 (see docker-compose.yml HOST_PORT)
  await page.goto("http://localhost:8199");

    // Wait until task cards have loaded
    await page.waitForSelector(".task-card");

    const cards = await page.locator(".task-card").count();
    expect(cards).toBeGreaterThan(0);

    // Ensure loading text is not visible
    await expect(page.locator("text=Loading")).toHaveCount(0);

    // Snapshot of board
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot("kanban-board.png");
  });
});
