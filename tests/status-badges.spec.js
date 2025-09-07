// Test Status Badge Functionality
const { test, expect } = require('@playwright/test');

test.describe('Task Status Badges', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Atlas project
    await page.goto('http://localhost:8199/atlas');
    await page.waitForTimeout(2000); // Let the page load
  });

  test('Status badges should appear on hover', async ({ page }) => {
    // Wait for task cards to load
    await page.waitForSelector('[data-testid="card"]', { timeout: 10000 });
    
    // Get the first task card
    const firstCard = page.locator('[data-testid="card"]').first();
    await expect(firstCard).toBeVisible();
    
    // Hover over the card to reveal status badges
    await firstCard.hover();
    
    // Check that status badges are visible
    const statusBadges = firstCard.locator('button:has-text("Done"), button:has-text("Todo"), button:has-text("In Progress"), button:has-text("Cancelled")');
    
    // Should have 4 status badges
    await expect(statusBadges).toHaveCount(4);
    
    // Check individual badges
    await expect(firstCard.locator('button:has-text("Done")')).toBeVisible();
    await expect(firstCard.locator('button:has-text("Todo")')).toBeVisible();
    await expect(firstCard.locator('button:has-text("In Progress")')).toBeVisible();
    await expect(firstCard.locator('button:has-text("Cancelled")')).toBeVisible();
  });

  test('Clicking status badges should change task status', async ({ page }) => {
    // Wait for task cards to load
    await page.waitForSelector('[data-testid="card"]', { timeout: 10000 });
    
    // Get the first task card 
    const firstCard = page.locator('[data-testid="card"]').first();
    const taskId = await firstCard.getAttribute('data-task-id');
    
    // Hover to show badges
    await firstCard.hover();
    
    // Click the "Done" badge
    await firstCard.locator('button:has-text("Done")').click();
    
    // Wait for the success message
    await expect(page.locator('.fixed:has-text("successfully")')).toBeVisible({ timeout: 5000 });
    
    // Verify the task appears in the "Done" column
    await page.waitForTimeout(2000); // Let the UI update
    const doneColumn = page.locator('[data-testid="column-done"]');
    const taskInDoneColumn = doneColumn.locator(`[data-task-id="${taskId}"]`);
    await expect(taskInDoneColumn).toBeVisible();
  });

  test('Badge colors should be correct', async ({ page }) => {
    // Wait for task cards to load
    await page.waitForSelector('[data-testid="card"]', { timeout: 10000 });
    
    // Get the first task card
    const firstCard = page.locator('[data-testid="card"]').first();
    await firstCard.hover();
    
    // Check badge colors
    const doneButton = firstCard.locator('button:has-text("Done")');
    const todoButton = firstCard.locator('button:has-text("Todo")');
    const inProgressButton = firstCard.locator('button:has-text("In Progress")');
    const cancelledButton = firstCard.locator('button:has-text("Cancelled")');
    
    // Check that Done badge has green background
    await expect(doneButton).toHaveClass(/bg-green-600/);
    
    // Check that Todo badge has blue background  
    await expect(todoButton).toHaveClass(/bg-blue-500/);
    
    // Check that In Progress badge has red background
    await expect(inProgressButton).toHaveClass(/bg-red-600/);
    
    // Check that Cancelled badge has red background
    await expect(cancelledButton).toHaveClass(/bg-red-700/);
  });
});