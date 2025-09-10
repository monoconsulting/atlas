const { test, expect } = require('@playwright/test');

test('Fast loading check', async ({ page }) => {
  await page.goto('http://localhost:8199/fortigatelog');

  // Wait for 5 seconds and check if the loading message is visible.
  await expect(page.locator('text=Loading...')).not.toBeVisible({ timeout: 5000 });
});