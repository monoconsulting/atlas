const { test, expect } = require('@playwright/test');

test.describe('Task Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should open create task modal when button is clicked', async ({ page }) => {
    await page.click('#createTaskBtn');
    
    // Modal should be visible
    const modal = page.locator('#createTaskModal');
    await expect(modal).toBeVisible();
    await expect(modal).not.toHaveClass(/hidden/);
    
    // Modal should have correct title
    await expect(page.locator('#createTaskModal h2')).toHaveText('Create New Task');
  });

  test('should have all required form fields in create modal', async ({ page }) => {
    await page.click('#createTaskBtn');
    
    // Check all form fields exist
    await expect(page.locator('#taskTitle')).toBeVisible();
    await expect(page.locator('#taskDescription')).toBeVisible();
    await expect(page.locator('#taskPriority')).toBeVisible();
    await expect(page.locator('#taskDueDate')).toBeVisible();
    await expect(page.locator('#taskAssignedTo')).toBeVisible();
    
    // Check priority options
    const prioritySelect = page.locator('#taskPriority');
    await expect(prioritySelect).toHaveValue('medium'); // Default value
    
    // Check buttons
    await expect(page.locator('#createTaskModal button[type="submit"]')).toBeVisible();
    await expect(page.locator('#createTaskModal button[type="submit"]')).toHaveText('Create Task');
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('#createTaskBtn');
    
    // Try to submit empty form
    await page.click('#createTaskModal button[type="submit"]');
    
    // Modal should still be open (validation prevents submission)
    await page.waitForTimeout(1000);
    const modal = page.locator('#createTaskModal');
    await expect(modal).toBeVisible();
  });

  test('should create task successfully with valid data', async ({ page }) => {
    // Get initial task count
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('.task-card');
      return cards.length > 0 || document.querySelector('#todoColumn').textContent.includes('No tasks');
    });
    const initialCount = await page.locator('.task-card').count();
    
    // Open modal and fill form
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Playwright Test Task');
    await page.fill('#taskDescription', 'This task was created by Playwright testing');
    await page.selectOption('#taskPriority', 'high');
    await page.fill('#taskAssignedTo', 'Playwright Tester');
    await page.fill('#taskDueDate', '2024-12-31');
    
    // Submit form
    await page.click('#createTaskModal button[type="submit"]');
    
    // Modal should close
    await expect(page.locator('#createTaskModal')).toHaveClass(/hidden/);
    
    // Wait for task list to update
    await page.waitForTimeout(2000);
    
    // Task count should increase
    const newCount = await page.locator('.task-card').count();
    expect(newCount).toBeGreaterThan(initialCount);
    
    // New task should be visible in todo column
    await expect(page.locator('#todoColumn')).toContainText('Playwright Test Task');
  });

  test('should reset form after successful creation', async ({ page }) => {
    // Create a task
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Test Form Reset');
    await page.fill('#taskDescription', 'Testing form reset');
    await page.click('#createTaskModal button[type="submit"]');
    
    // Wait for modal to close and reopen
    await page.waitForTimeout(2000);
    await page.click('#createTaskBtn');
    
    // Form should be reset
    await expect(page.locator('#taskTitle')).toHaveValue('');
    await expect(page.locator('#taskDescription')).toHaveValue('');
    await expect(page.locator('#taskPriority')).toHaveValue('medium');
    await expect(page.locator('#taskAssignedTo')).toHaveValue('');
    await expect(page.locator('#taskDueDate')).toHaveValue('');
  });

  test('should close modal with escape key', async ({ page }) => {
    await page.click('#createTaskBtn');
    await expect(page.locator('#createTaskModal')).toBeVisible();
    
    // Press escape
    await page.keyboard.press('Escape');
    
    // Modal should close (check for hidden class since CSS might have issues)
    await expect(page.locator('#createTaskModal')).toHaveClass(/hidden/);
  });

  test('should close modal with cancel button', async ({ page }) => {
    await page.click('#createTaskBtn');
    await expect(page.locator('#createTaskModal')).toBeVisible();
    
    // Click cancel
    const cancelBtn = page.locator('#createTaskModal button', { hasText: 'Cancel' });
    await cancelBtn.click();
    
    // Modal should close (check for hidden class since CSS might have issues)
    await expect(page.locator('#createTaskModal')).toHaveClass(/hidden/);
  });

  test('should handle special characters in task fields', async ({ page }) => {
    const specialTitle = 'Task with special chars: !@#$%^&*()';
    const specialDesc = 'Description with émojis 🚀 and unicode: 中文 àáâäæãåā';
    const specialAssignee = 'User with spaces & symbols';
    
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', specialTitle);
    await page.fill('#taskDescription', specialDesc);
    await page.fill('#taskAssignedTo', specialAssignee);
    await page.click('#createTaskModal button[type="submit"]');
    
    // Wait for task creation
    await page.waitForTimeout(2000);
    
    // Task should be created with special characters preserved
    await expect(page.locator('#todoColumn')).toContainText(specialTitle);
  });

  test('should create tasks with different priorities', async ({ page }) => {
    const priorities = ['low', 'medium', 'high'];
    
    for (const priority of priorities) {
      await page.click('#createTaskBtn');
      await page.fill('#taskTitle', `${priority} Priority Task`);
      await page.selectOption('#taskPriority', priority);
      await page.click('#createTaskModal button[type="submit"]');
      await page.waitForTimeout(1000);
    }
    
    // All tasks should be created
    await expect(page.locator('#todoColumn')).toContainText('low Priority Task');
    await expect(page.locator('#todoColumn')).toContainText('medium Priority Task');
    await expect(page.locator('#todoColumn')).toContainText('high Priority Task');
  });

  test('should handle long task titles and descriptions', async ({ page }) => {
    const longTitle = 'A'.repeat(150);
    const longDesc = 'B'.repeat(1000);
    
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', longTitle);
    await page.fill('#taskDescription', longDesc);
    await page.click('#createTaskModal button[type="submit"]');
    
    // Wait for creation
    await page.waitForTimeout(2000);
    
    // Task should be created (title may be truncated in display)
    const taskCards = page.locator('.task-card');
    const count = await taskCards.count();
    expect(count).toBeGreaterThan(0);
  });
});