
import { test, expect } from '@playwright/test';

test('fast check: loading, code block, and kanban cards', async ({ page }) => {
  await page.goto('http://localhost:8199/');

  // 1. Check if the "Loading" is gone.
  // Assuming "Loading..." text appears in a div or similar element.
  // We wait for it to be hidden or disappear.
  const loadingIndicator = page.locator('text="Loading..."');
  await expect(loadingIndicator).toBeHidden({ timeout: 10000 }); // Wait up to 10 seconds for it to disappear

  // 2. Check if the large code block is gone.
  // This is an assumption. A common pattern for code blocks is <pre><code>...</code></pre>
  // or a div with a specific class. I'll look for a generic pre tag or a div that might contain code.
  // If this fails, I'll need to inspect the page to find the correct selector.
  const codeBlock = page.locator('pre'); // Adjust this selector if needed
  await expect(codeBlock).toBeHidden({ timeout: 5000 }); // Wait up to 5 seconds for it to disappear

  // 3. Do we have cards in the kanban?
  // Assuming kanban cards have a common class, e.g., 'kanban-card' or 'task-card'.
  // I'll look for an element that represents a card and expect at least one to be visible.
  const kanbanCard = page.locator('.task-card').first(); // Common class for task cards
  await expect(kanbanCard).toBeVisible({ timeout: 10000 }); // Wait up to 10 seconds for a card to appear
});
