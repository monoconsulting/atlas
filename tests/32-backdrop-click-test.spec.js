const { test, expect } = require('@playwright/test');

test.describe('Backdrop Click Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Create Modal - Backdrop click should close modal', async ({ page }) => {
    console.log('Testing Create Modal backdrop click...');
    
    // Open create modal
    await page.click('#createTaskBtn');
    await expect(page.locator('#createTaskModal')).toBeVisible();
    
    // Click on backdrop area (outside modal content)
    await page.locator('#createTaskModal').click({
      position: { x: 100, y: 100 } // Click in backdrop area
    });
    
    // Modal should be hidden
    await expect(page.locator('#createTaskModal')).toBeHidden();
    console.log('✅ Create modal closes on backdrop click');
  });

  test('Edit Modal - Backdrop click should close modal', async ({ page }) => {
    console.log('Testing Edit Modal backdrop click...');
    
    // First create a task to edit
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Test Task for Backdrop Click');
    await page.fill('#taskDescription', 'Testing backdrop functionality');
    
    // Submit the form using the correct method
    await page.evaluate(() => {
      document.getElementById('addTaskForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(3000);
    
    // Find and click the task card to open edit modal
    const taskCard = page.locator('.task-card').filter({ hasText: 'Test Task for Backdrop Click' });
    await expect(taskCard).toBeVisible();
    await taskCard.click();
    
    // Edit modal should be visible
    await expect(page.locator('#editModal')).toBeVisible();
    
    // Click on backdrop area (outside modal content)
    await page.locator('#editModal').click({
      position: { x: 100, y: 100 } // Click in backdrop area
    });
    
    // Modal should be hidden
    await expect(page.locator('#editModal')).toBeHidden();
    console.log('✅ Edit modal closes on backdrop click');
  });

  test('Create Modal - Clicking modal content should NOT close modal', async ({ page }) => {
    console.log('Testing Create Modal content click...');
    
    // Open create modal
    await page.click('#createTaskBtn');
    await expect(page.locator('#createTaskModal')).toBeVisible();
    
    // Click on the modal content (form area)
    await page.click('#taskTitle');
    
    // Modal should still be visible
    await expect(page.locator('#createTaskModal')).toBeVisible();
    console.log('✅ Create modal stays open when clicking content');
  });
});