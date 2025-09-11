const { test, expect } = require('@playwright/test');

test.describe('Prompt Filter', () => {
  test('shows only tasks with prompts when enabled', async ({ page }) => {
    // Create two tasks via API: one with prompt, one without
    const createResults = await page.evaluate(async () => {
      const created = [];
      const res1 = await fetch('/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Prompt Filter A',
          description: 'Has a prompt',
          status: 'todo',
          priority: 'medium',
          prompt: 'Agent: please execute A.'
        })
      });
      created.push(await res1.json());

      const res2 = await fetch('/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Prompt Filter B',
          description: 'No prompt',
          status: 'todo',
          priority: 'medium'
        })
      });
      created.push(await res2.json());
      return created;
    });

    // Open UI and wait
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Enable Has Prompt filter
    const hasPrompt = page.locator('#filterHasPrompt');
    await hasPrompt.check();

    // Wait a moment for filtering to apply
    await page.waitForTimeout(200);

    // Fetch all cards and assert each shows the Prompt badge
    const cards = page.locator('[data-testid="card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      await expect(card).toContainText('Prompt');
    }
  });
});

