const { test, expect } = require('@playwright/test');

test.describe('Task Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure we have at least one task to edit
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('.task-card');
      return cards.length > 0;
    });
  });

  test('should open edit modal when task card is clicked', async ({ page }) => {
    // Click on the first task card
    const firstTask = page.locator('.task-card').first();
    await expect(firstTask).toBeVisible();
    await firstTask.click();
    
    // Edit modal should open
    const editModal = page.locator('#editModal');
    await expect(editModal).toBeVisible();
    await expect(editModal).not.toHaveClass(/hidden/);
    
    // Modal should have correct title
    await expect(page.locator('#editModal h2')).toHaveText('Edit Task');
  });

  test('should pre-populate edit form with existing task data', async ({ page }) => {
    // Get task data from the card first
    const firstTask = page.locator('.task-card').first();
    const taskTitle = await firstTask.locator('h3').textContent();
    
    // Click to open edit modal
    await firstTask.click();
    
    // Form should be pre-populated
    const titleField = page.locator('#editTaskTitle');
    await expect(titleField).toBeVisible();
    await expect(titleField).toHaveValue(taskTitle.trim());
    
    // Other fields should exist and have values
    await expect(page.locator('#editTaskDescription')).toBeVisible();
    await expect(page.locator('#editTaskPriority')).toBeVisible();
    await expect(page.locator('#editTaskStatus')).toBeVisible();
    await expect(page.locator('#editTaskDueDate')).toBeVisible();
    await expect(page.locator('#editTaskAssignedTo')).toBeVisible();
  });

  test('should have all edit form fields visible', async ({ page }) => {
    const firstTask = page.locator('.task-card').first();
    await firstTask.click();
    
    // Check all form fields exist in edit modal
    await expect(page.locator('#editTaskTitle')).toBeVisible();
    await expect(page.locator('#editTaskDescription')).toBeVisible();
    await expect(page.locator('#editTaskPriority')).toBeVisible();
    await expect(page.locator('#editTaskStatus')).toBeVisible();
    await expect(page.locator('#editTaskDueDate')).toBeVisible();
    await expect(page.locator('#editTaskAssignedTo')).toBeVisible();
    
    // Check status options
    const statusSelect = page.locator('#editTaskStatus');
    const statusOptions = await statusSelect.locator('option').allTextContents();
    expect(statusOptions).toContain('Todo');
    expect(statusOptions).toContain('In Progress');
    expect(statusOptions).toContain('Done');
    
    // Check save button
    await expect(page.locator('#saveTask')).toBeVisible();
    await expect(page.locator('#saveTask')).toHaveText('Save Changes');
  });

  test('should update task title and description', async ({ page }) => {
    const firstTask = page.locator('.task-card').first();
    await firstTask.click();
    
    const newTitle = 'Updated Task Title - Playwright';
    const newDesc = 'Updated description via Playwright test';
    
    // Update fields
    await page.fill('#editTaskTitle', newTitle);
    await page.fill('#editTaskDescription', newDesc);
    
    // Save changes
    await page.click('#saveTask');
    
    // Modal should close
    await expect(page.locator('#editModal')).toHaveClass(/hidden/);
    
    // Wait for update
    await page.waitForTimeout(2000);
    
    // Task should show updated title
    await expect(page.locator('#todoColumn')).toContainText(newTitle);
  });

  test('should move task between columns when status changes', async ({ page }) => {
    // Find a task in todo column
    const todoTask = page.locator('#todoColumn .task-card').first();
    await expect(todoTask).toBeVisible();
    
    const taskTitle = await todoTask.locator('h3').textContent();
    await todoTask.click();
    
    // Change status to in-progress
    await page.selectOption('#editTaskStatus', 'in-progress');
    await page.click('#saveTask');
    
    // Wait for update
    await page.waitForTimeout(2000);
    
    // Task should now be in in-progress column
    await expect(page.locator('#inProgressColumn')).toContainText(taskTitle.trim());
    
    // Task should no longer be in todo column
    const todoColumnText = await page.locator('#todoColumn').textContent();
    expect(todoColumnText).not.toContain(taskTitle.trim());
  });

  test('should update task priority and reflect visual changes', async ({ page }) => {
    const firstTask = page.locator('.task-card').first();
    await firstTask.click();
    
    // Change priority to high
    await page.selectOption('#editTaskPriority', 'high');
    await page.click('#saveTask');
    
    // Wait for update
    await page.waitForTimeout(2000);
    
    // Task should have high priority visual indicator
    const updatedTask = page.locator('.task-card').first();
    const priorityText = await updatedTask.locator('.text-red-400, .text-orange-400').textContent();
    expect(priorityText).toContain('high');
  });

  test('should update assigned user and due date', async ({ page }) => {
    const firstTask = page.locator('.task-card').first();
    await firstTask.click();
    
    const newAssignee = 'Playwright Test User';
    const newDueDate = '2024-12-25';
    
    // Update fields
    await page.fill('#editTaskAssignedTo', newAssignee);
    await page.fill('#editTaskDueDate', newDueDate);
    
    await page.click('#saveTask');
    await page.waitForTimeout(2000);
    
    // Check if assignee is shown (format may vary)
    const taskCard = page.locator('.task-card').first();
    await expect(taskCard).toContainText(newAssignee);
    await expect(taskCard).toContainText('2024-12-25');
  });

  test('should validate required fields in edit mode', async ({ page }) => {
    const firstTask = page.locator('.task-card').first();
    await firstTask.click();
    
    // Clear required title field
    await page.fill('#editTaskTitle', '');
    await page.click('#saveTask');
    
    // Modal should still be open (validation prevents save)
    await page.waitForTimeout(1000);
    const editModal = page.locator('#editModal');
    await expect(editModal).toBeVisible();
  });

  test('should close edit modal with escape key', async ({ page }) => {
    const firstTask = page.locator('.task-card').first();
    await firstTask.click();
    
    await expect(page.locator('#editModal')).toBeVisible();
    
    // Press escape
    await page.keyboard.press('Escape');
    
    // Modal should close
    await expect(page.locator('#editModal')).toHaveClass(/hidden/);
  });

  test('should close edit modal with cancel button', async ({ page }) => {
    const firstTask = page.locator('.task-card').first();
    await firstTask.click();
    
    await expect(page.locator('#editModal')).toBeVisible();
    
    // Click cancel
    const cancelBtn = page.locator('#editModal button', { hasText: 'Cancel' });
    await cancelBtn.click();
    
    // Modal should close
    await expect(page.locator('#editModal')).toHaveClass(/hidden/);
  });

  test('should handle multiple quick status changes', async ({ page }) => {
    const statuses = ['todo', 'in-progress', 'done'];
    
    for (let i = 0; i < statuses.length; i++) {
      // Find first task and click it
      const firstTask = page.locator('.task-card').first();
      const taskTitle = await firstTask.locator('h3').textContent();
      await firstTask.click();
      
      // Change status
      await page.selectOption('#editTaskStatus', statuses[i]);
      await page.click('#saveTask');
      
      await page.waitForTimeout(1500);
      
      // Verify task moved to correct column
      const columnMap = {
        'todo': '#todoColumn',
        'in-progress': '#inProgressColumn', 
        'done': '#doneColumn'
      };
      
      await expect(page.locator(columnMap[statuses[i]])).toContainText(taskTitle.trim());
    }
  });

  test('should preserve changes when reopening edit modal', async ({ page }) => {
    const firstTask = page.locator('.task-card').first();
    const originalTitle = await firstTask.locator('h3').textContent();
    
    // Edit and save
    await firstTask.click();
    const updatedTitle = 'Persistent Changes Test';
    await page.fill('#editTaskTitle', updatedTitle);
    await page.click('#saveTask');
    await page.waitForTimeout(2000);
    
    // Find the updated task and reopen edit modal
    const updatedTask = page.locator('.task-card', { hasText: updatedTitle }).first();
    await updatedTask.click();
    
    // Title should still show the updated value
    await expect(page.locator('#editTaskTitle')).toHaveValue(updatedTitle);
  });
});