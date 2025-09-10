const { test, expect } = require('@playwright/test');

test.describe('UI Fixes Comprehensive Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for tasks to load
    await page.waitForFunction(() => {
      const todoColumn = document.querySelector('#todoColumn');
      return todoColumn && !todoColumn.textContent.includes('Loading...');
    });
  });

  test('should click on subtask and open edit modal (task #59)', async ({ page }) => {
    // Look for task #59 specifically
    const task59 = page.locator('.task-card:has-text("#59")');
    
    if (await task59.isVisible()) {
      // Check if task 59 has subtasks visible
      const subtasksSection = task59.locator('text=📂 Subtasks');
      await expect(subtasksSection).toBeVisible();
      
      // Find clickable subtask items
      const subtaskItems = task59.locator('div.text-xs.text-slate-300.hover\\:text-blue-300.cursor-pointer');
      const subtaskCount = await subtaskItems.count();
      
      expect(subtaskCount).toBeGreaterThan(0);
      
      // Click on the first subtask
      await subtaskItems.first().click();
      
      // Edit modal should open
      const editModal = page.locator('#editModal');
      await expect(editModal).toBeVisible();
      
      console.log('✅ Subtask clicking works - modal opened');
    } else {
      console.log('Task #59 not found, skipping subtask click test');
    }
  });

  test('should show Create Subtask section in Create Task modal', async ({ page }) => {
    // Click Create Task button
    await page.click('#createTaskBtn');
    
    const createModal = page.locator('#createTaskModal');
    await expect(createModal).toBeVisible();
    
    // Check for Subtasks section
    const subtasksHeader = createModal.locator('h3:has-text("📂 Subtasks (Optional)")');
    await expect(subtasksHeader).toBeVisible();
    
    // Check for Add Subtask button
    const addSubtaskBtn = createModal.locator('#addCreateSubtaskBtn');
    await expect(addSubtaskBtn).toBeVisible();
    await expect(addSubtaskBtn).toHaveText(/Add Subtask/);
    
    // Click Add Subtask button
    await addSubtaskBtn.click();
    
    // Should add a subtask form
    const subtaskForm = createModal.locator('[data-create-subtask-id]');
    await expect(subtaskForm).toBeVisible();
    
    // Should have title input and priority selector
    await expect(subtaskForm.locator('input[placeholder="Subtask title"]')).toBeVisible();
    await expect(subtaskForm.locator('select')).toBeVisible();
    
    console.log('✅ Create Task subtask functionality works');
  });

  test('should handle long titles with proper text wrapping', async ({ page }) => {
    // Create a task with a very long title
    await page.click('#createTaskBtn');
    
    const createModal = page.locator('#createTaskModal');
    await expect(createModal).toBeVisible();
    
    const longTitle = 'This is a very long task title that should wrap properly within the task card boundaries and not overflow outside the container even with extremely long text that goes on and on and on';
    
    await page.fill('#taskTitle', longTitle);
    await page.fill('#taskDescription', 'Test description');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    // Find the created task
    const taskCards = page.locator('.task-card');
    const lastCard = taskCards.last();
    
    // Get the task card and title dimensions
    const cardBounds = await lastCard.boundingBox();
    const titleElement = lastCard.locator('h3');
    
    if (await titleElement.isVisible()) {
      const titleBounds = await titleElement.boundingBox();
      
      // Title should not exceed card width
      expect(titleBounds.width).toBeLessThanOrEqual(cardBounds.width);
      console.log('✅ Long title text wrapping works correctly');
    }
  });

  test('should create task with subtasks successfully', async ({ page }) => {
    await page.click('#createTaskBtn');
    
    const createModal = page.locator('#createTaskModal');
    await expect(createModal).toBeVisible();
    
    // Fill main task info
    await page.fill('#taskTitle', 'Test Task with Subtasks');
    await page.fill('#taskDescription', 'Testing subtask creation');
    
    // Add a subtask
    await page.click('#addCreateSubtaskBtn');
    
    const subtaskForm = createModal.locator('[data-create-subtask-id="1"]');
    await expect(subtaskForm).toBeVisible();
    
    // Fill subtask details
    await subtaskForm.locator('input[placeholder="Subtask title"]').fill('Test Subtask 1');
    await subtaskForm.locator('textarea').fill('Subtask description');
    await subtaskForm.locator('select').selectOption('high');
    
    // Add another subtask
    await page.click('#addCreateSubtaskBtn');
    const secondSubtask = createModal.locator('[data-create-subtask-id="2"]');
    await secondSubtask.locator('input[placeholder="Subtask title"]').fill('Test Subtask 2');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(5000);
    
    // Verify task was created with subtasks
    const taskCards = page.locator('.task-card:has-text("Test Task with Subtasks")');
    await expect(taskCards).toBeVisible();
    
    // Should show subtasks section
    const subtasksSection = taskCards.locator('text=📂 Subtasks');
    await expect(subtasksSection).toBeVisible();
    
    console.log('✅ Task creation with subtasks works');
  });
});