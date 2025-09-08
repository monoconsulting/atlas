
const { test, expect } = require('@playwright/test');

test('fortigatelog fix verification', async ({ page }) => {
  await page.goto('http://localhost:8199/fortigatelog');

  // Check that the "Loading..." message is no longer visible.
  await expect(page.locator('text=Loading...')).not.toBeVisible();

  // Check that the tasks are visible.
  await expect(page.locator('.task-card')).toHaveCount(14);

  // Check that the log at the bottom is gone.
  const pageContent = await page.content();
  expect(pageContent).not.toContain('logrefine-tasks.json');

  // Take a screenshot.
  await page.screenshot({ path: 'fortigatelog-fix-screenshot.png' });
});
