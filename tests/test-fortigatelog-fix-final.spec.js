const { test, expect } = require('@playwright/test');

test.use({ headless: true, video: 'on', screenshot: 'on' });

test.describe('Fortigate Log Fix Verification', () => {
  test('should not show loading message and log content', async ({ page }) => {
    await page.goto('http://localhost:8199/fortigatelog');

    // Check that the "Loading..." message is no longer visible.
    await expect(page.locator('text=Loading...')).not.toBeVisible();

    // Check that the log at the bottom is gone.
    const pageContent = await page.content();
    expect(pageContent).not.toContain('logrefine-tasks.json');
  });
});