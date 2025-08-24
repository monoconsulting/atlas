const { test, expect } = require('@playwright/test');

test.describe('UI Fixes Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for tasks to load
    await page.waitForFunction(() => {
      const todoColumn = document.querySelector('#todoColumn');
      return todoColumn && !todoColumn.textContent.includes('Loading...');
    });
  });

  test('Create Task button moved to Advanced Search section', async ({ page }) => {
    // Verify Create Task button is in the Advanced Filter section
    const advancedFiltersSection = page.locator('.bg-slate-950.rounded-lg.border.border-slate-800');
    const createTaskBtn = advancedFiltersSection.locator('#createTaskBtn');
    
    await expect(createTaskBtn).toBeVisible();
    await expect(createTaskBtn).toHaveText(/Create New Task/);
    
    // Verify it's after the Advanced Search input
    const searchInput = page.locator('#searchTasks');
    await expect(searchInput).toBeVisible();
    
    const searchRect = await searchInput.boundingBox();
    const createRect = await createTaskBtn.boundingBox();
    expect(createRect.y).toBeGreaterThan(searchRect.y);
  });

  test('Subtasks displayed in task cards with sorting', async ({ page }) => {
    // Look for tasks with subtasks
    const taskCards = page.locator('.task-card');
    const cardCount = await taskCards.count();
    
    let foundSubtasks = false;
    
    for (let i = 0; i < cardCount && !foundSubtasks; i++) {
      const card = taskCards.nth(i);
      const subtasksHeader = card.locator('text=📂 Subtasks');
      
      if (await subtasksHeader.isVisible()) {
        foundSubtasks = true;
        
        // Should show individual subtask items, not just count
        const subtaskItems = card.locator('div.text-xs.text-slate-300');
        const itemCount = await subtaskItems.count();
        
        if (itemCount > 0) {
          // Verify first subtask has proper format (ID. Title)
          const firstItem = subtaskItems.first();
          const text = await firstItem.textContent();
          expect(text).toMatch(/\d+\./); // Should match pattern like "1." or "2."
        }
      }
    }
    
    console.log('Subtask visibility test completed');
  });

  test('Edit modal contains subtasks section', async ({ page }) => {
    // Click first task to open edit modal
    const firstTask = page.locator('.task-card').first();
    await firstTask.click();
    
    const editModal = page.locator('#editModal');
    await expect(editModal).toBeVisible();
    
    // Check for subtasks section
    const subtasksHeader = editModal.locator('h3:has-text("📂 Subtasks")');
    await expect(subtasksHeader).toBeVisible();
    
    // Check for Add Subtask button
    const addSubtaskBtn = editModal.locator('#addSubtaskBtn');
    await expect(addSubtaskBtn).toBeVisible();
    
    // Check for subtasks list area
    const subtasksList = editModal.locator('#subtasksList');
    await expect(subtasksList).toBeVisible();
  });

  test('Description text has overflow protection', async ({ page }) => {
    // Create a task with long description
    await page.click('#createTaskBtn');
    
    const modal = page.locator('#createTaskModal');
    await expect(modal).toBeVisible();
    
    // Fill with very long text
    const longText = 'This is a very long description that should be properly handled without overflowing the container boundaries. '.repeat(10);
    
    await page.fill('#taskTitle', 'Overflow Test Task');
    await page.fill('#taskDescription', longText);
    await page.click('#createTaskModal button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    // Find the created task and verify description handling
    const taskCards = page.locator('.task-card');
    const lastCard = taskCards.last();
    
    // Check that the task card has proper constraints
    const cardBounds = await lastCard.boundingBox();
    const descParagraph = lastCard.locator('p.text-xs');
    
    if (await descParagraph.isVisible()) {
      const descBounds = await descParagraph.boundingBox();
      
      // Description should not overflow the card
      expect(descBounds.width).toBeLessThanOrEqual(cardBounds.width);
    }
  });

  test('No user-facing alert dialogs for basic operations', async ({ page }) => {
    let userAlertCount = 0;
    
    // Only count user-facing alert dialogs, not console messages
    page.on('dialog', dialog => {
      if (dialog.type() === 'alert') {
        userAlertCount++;
        console.log('User alert detected:', dialog.message());
        dialog.accept();
      }
    });
    
    // Test basic operations - ensure create modal is closed first
    const createModal = page.locator('#createTaskModal');
    if (await createModal.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(createModal).toHaveClass(/hidden/);
    }
    
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Test Task');
    await page.click('#createTaskModal button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Ensure create modal is closed before proceeding
    await expect(createModal).toHaveClass(/hidden/);
    
    // Open task edit
    const firstTask = page.locator('.task-card').first();
    if (await firstTask.isVisible()) {
      await firstTask.click();
      const modal = page.locator('#editModal');
      await expect(modal).toBeVisible();
      await page.keyboard.press('Escape');
    }
    
    // Should have minimal or no user-facing alerts
    expect(userAlertCount).toBeLessThanOrEqual(1); // Allow for one potential browser validation alert
  });

  test('Subtask list properly formatted in edit modal', async ({ page }) => {
    const firstTask = page.locator('.task-card').first();
    await firstTask.click();
    
    const editModal = page.locator('#editModal');
    await expect(editModal).toBeVisible();
    
    const subtasksList = editModal.locator('#subtasksList');
    await expect(subtasksList).toBeVisible();
    
    // Should show either "No subtasks yet" or actual subtask items
    const noSubtasksMsg = subtasksList.locator('text=No subtasks yet');
    const subtaskItems = subtasksList.locator('div[data-subtask-id]');
    
    const hasMessage = await noSubtasksMsg.isVisible();
    const hasItems = await subtaskItems.count() > 0;
    
    expect(hasMessage || hasItems).toBeTruthy();
    
    // If there are subtask items, verify their structure
    if (hasItems) {
      const firstItem = subtaskItems.first();
      await expect(firstItem).toHaveClass(/bg-slate-900/);
      
      // Should have ID, priority, status dropdown, and title input
      await expect(firstItem.locator('span.font-mono')).toBeVisible(); // ID
      await expect(firstItem.locator('select')).toBeVisible(); // Status dropdown
      await expect(firstItem.locator('input[type="text"]')).toBeVisible(); // Title input
    }
  });
});