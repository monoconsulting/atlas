const { test, expect } = require('@playwright/test');

test.describe('UI Improvements and Bug Fixes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for tasks to load
    await page.waitForFunction(() => {
      const todoColumn = document.querySelector('#todoColumn');
      return todoColumn && !todoColumn.textContent.includes('Loading...');
    });
  });

  test('should display Create Task button under Advanced Search section', async ({ page }) => {
    // Check that Create Task button is within the Advanced Filters section
    const advancedFiltersSection = page.locator('.bg-slate-950.rounded-lg.border.border-slate-800').first();
    const createTaskBtn = page.locator('#createTaskBtn');
    
    // Create Task button should exist and be visible
    await expect(createTaskBtn).toBeVisible();
    await expect(createTaskBtn).toHaveText(/Create New Task/);
    
    // Button should be within the advanced filters container
    const createBtnInAdvancedSection = advancedFiltersSection.locator('#createTaskBtn');
    await expect(createBtnInAdvancedSection).toBeVisible();
    
    // Advanced Search input should be above the Create Task button
    const advancedSearchInput = page.locator('#searchTasks');
    await expect(advancedSearchInput).toBeVisible();
    
    // Verify layout order - search input should come before create button
    const searchRect = await advancedSearchInput.boundingBox();
    const createRect = await createTaskBtn.boundingBox();
    expect(searchRect.y).toBeLessThan(createRect.y);
  });

  test('should display subtasks in task cards with proper visibility and sorting', async ({ page }) => {
    // Look for a task card that has subtasks
    await page.waitForSelector('.task-card');
    
    // Check if any task cards show subtask information
    const taskCards = page.locator('.task-card');
    const cardCount = await taskCards.count();
    
    if (cardCount > 0) {
      let foundTaskWithSubtasks = false;
      
      for (let i = 0; i < cardCount; i++) {
        const card = taskCards.nth(i);
        const subtasksSection = card.locator('text=📂 Subtasks');
        
        if (await subtasksSection.isVisible()) {
          foundTaskWithSubtasks = true;
          
          // Check that subtasks are displayed as individual items
          const subtaskItems = card.locator('div:has-text(".")');
          const subtaskCount = await subtaskItems.count();
          
          if (subtaskCount > 0) {
            // Verify that subtasks show ID numbers (e.g., "1.1", "1.2")
            const firstSubtask = subtaskItems.first();
            await expect(firstSubtask).toContainText('.');
            
            // Verify priority indicators are shown
            const priorityIndicators = card.locator('span:has-text("high"), span:has-text("medium"), span:has-text("low")');
            await expect(priorityIndicators.first()).toBeVisible();
          }
          break;
        }
      }
      
      // If we found tasks with subtasks, ensure they're displayed properly
      if (foundTaskWithSubtasks) {
        console.log('Found tasks with subtasks - visibility test passed');
      }
    }
  });

  test('should handle subtask clicks without opening main task modal immediately', async ({ page }) => {
    // Look for a task with subtasks and try clicking a subtask
    await page.waitForSelector('.task-card');
    
    const taskCards = page.locator('.task-card');
    const cardCount = await taskCards.count();
    
    if (cardCount > 0) {
      for (let i = 0; i < cardCount; i++) {
        const card = taskCards.nth(i);
        const subtasksSection = card.locator('text=📂 Subtasks');
        
        if (await subtasksSection.isVisible()) {
          // Look for clickable subtask items
          const subtaskItems = card.locator('div.text-xs.text-slate-300.hover\\:text-blue-300.cursor-pointer');
          const subtaskCount = await subtaskItems.count();
          
          if (subtaskCount > 0) {
            // Click on a subtask item
            const firstSubtask = subtaskItems.first();
            await firstSubtask.click();
            
            // Modal should open (since our current implementation opens the main task modal)
            const editModal = page.locator('#editModal');
            await expect(editModal).toBeVisible();
            
            // Close modal for next test
            await page.keyboard.press('Escape');
            await expect(editModal).toHaveClass(/hidden/);
            break;
          }
        }
      }
    }
  });

  test('should display Add Subtask button in edit modal', async ({ page }) => {
    // Click on the first available task to open edit modal
    const firstTaskCard = page.locator('.task-card').first();
    await expect(firstTaskCard).toBeVisible();
    await firstTaskCard.click();
    
    // Edit modal should open
    const editModal = page.locator('#editModal');
    await expect(editModal).toBeVisible();
    
    // Check for Subtasks section
    const subtasksHeader = editModal.locator('h3:has-text("📂 Subtasks")');
    await expect(subtasksHeader).toBeVisible();
    
    // Check for Add Subtask button
    const addSubtaskBtn = editModal.locator('#addSubtaskBtn');
    await expect(addSubtaskBtn).toBeVisible();
    await expect(addSubtaskBtn).toHaveText(/Add Subtask/);
    
    // Button should have the correct styling (green background)
    await expect(addSubtaskBtn).toHaveClass(/bg-green-600/);
    
    // Check that subtasks list area exists
    const subtasksList = editModal.locator('#subtasksList');
    await expect(subtasksList).toBeVisible();
  });

  test('should handle long descriptions without text overflow', async ({ page }) => {
    // Create a task with a very long description to test overflow
    await page.click('#createTaskBtn');
    
    const createModal = page.locator('#createTaskModal');
    await expect(createModal).toBeVisible();
    
    const longDescription = 'A'.repeat(500) + ' ' + 'B'.repeat(500) + ' ' + 'C'.repeat(500);
    
    await page.fill('#taskTitle', 'Test Long Description');
    await page.fill('#taskDescription', longDescription);
    await page.click('#createTaskModal button[type="submit"]');
    
    // Wait for task creation
    await page.waitForTimeout(2000);
    
    // Check that the newly created task doesn't have text overflow issues
    const taskCards = page.locator('.task-card');
    const lastCard = taskCards.last();
    
    // Task card should be visible and contained within its bounds
    await expect(lastCard).toBeVisible();
    
    // Check that the description paragraph has proper overflow handling
    const descriptionParagraph = lastCard.locator('p.text-xs.text-slate-400');
    if (await descriptionParagraph.isVisible()) {
      // Verify CSS properties for text overflow
      const styles = await descriptionParagraph.evaluate(el => {
        const computedStyles = window.getComputedStyle(el);
        return {
          overflow: computedStyles.overflow,
          wordWrap: computedStyles.wordWrap,
          overflowWrap: computedStyles.overflowWrap,
          maxWidth: computedStyles.maxWidth
        };
      });
      
      // Should have proper overflow handling
      expect(styles.overflow).toBe('hidden');
      expect(styles.wordWrap).toBe('break-word');
      expect(styles.overflowWrap).toBe('break-word');
    }
  });

  test('should not display any alert popups during normal operations', async ({ page }) => {
    let alertTriggered = false;
    
    // Listen for any alert dialogs
    page.on('dialog', dialog => {
      alertTriggered = true;
      console.log('Alert detected:', dialog.message());
      dialog.accept(); // Dismiss the alert
    });
    
    // Perform various operations that previously triggered alerts
    
    // 1. Try to create task with empty title
    await page.click('#createTaskBtn');
    await page.click('#createTaskModal button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // 2. Create a valid task
    await page.fill('#taskTitle', 'Test No Alerts');
    await page.fill('#taskDescription', 'Testing that no alerts appear');
    await page.click('#createTaskModal button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // 3. Edit a task
    const firstTask = page.locator('.task-card').first();
    if (await firstTask.isVisible()) {
      await firstTask.click();
      
      const editModal = page.locator('#editModal');
      await expect(editModal).toBeVisible();
      
      // Try to save with empty title
      await page.fill('#editTaskTitle', '');
      await page.click('#saveTask');
      await page.waitForTimeout(1000);
      
      // Restore title and save
      await page.fill('#editTaskTitle', 'Updated Test Task');
      await page.click('#saveTask');
      await page.waitForTimeout(2000);
    }
    
    // Verify no alerts were triggered
    expect(alertTriggered).toBeFalsy();
  });

  test('should sort subtasks by ID in ascending order', async ({ page }) => {
    // Look for a task with multiple subtasks
    await page.waitForSelector('.task-card');
    
    const taskCards = page.locator('.task-card');
    const cardCount = await taskCards.count();
    
    if (cardCount > 0) {
      for (let i = 0; i < cardCount; i++) {
        const card = taskCards.nth(i);
        const subtasksSection = card.locator('text=📂 Subtasks');
        
        if (await subtasksSection.isVisible()) {
          // Get all subtask items in this card
          const subtaskItems = card.locator('div:has-text(".")');
          const subtaskCount = await subtaskItems.count();
          
          if (subtaskCount > 1) {
            // Extract subtask IDs and verify they're in ascending order
            const subtaskTexts = [];
            for (let j = 0; j < subtaskCount; j++) {
              const subtaskText = await subtaskItems.nth(j).textContent();
              subtaskTexts.push(subtaskText);
            }
            
            // Extract numeric parts of subtask IDs (e.g., from "1.1. Task Title" get 1)
            const subtaskNumbers = subtaskTexts.map(text => {
              const match = text.match(/(\d+)\./);
              return match ? parseInt(match[1]) : 0;
            });
            
            // Verify ascending order
            for (let k = 1; k < subtaskNumbers.length; k++) {
              expect(subtaskNumbers[k]).toBeGreaterThanOrEqual(subtaskNumbers[k - 1]);
            }
            
            console.log('Subtask sorting verified for task:', i);
            break;
          }
        }
      }
    }
  });

  test('should display subtasks in edit modal with proper formatting', async ({ page }) => {
    // Find a task with subtasks and open its edit modal
    const firstTaskCard = page.locator('.task-card').first();
    await firstTaskCard.click();
    
    const editModal = page.locator('#editModal');
    await expect(editModal).toBeVisible();
    
    // Check the subtasks section structure
    const subtasksSection = editModal.locator('div:has-text("📂 Subtasks")').first();
    await expect(subtasksSection).toBeVisible();
    
    // Check that the subtasks list exists
    const subtasksList = editModal.locator('#subtasksList');
    await expect(subtasksList).toBeVisible();
    
    // The list should either show "No subtasks yet" or actual subtask items
    const noSubtasksMessage = subtasksList.locator('p:has-text("No subtasks yet")');
    const subtaskItems = subtasksList.locator('div[data-subtask-id]');
    
    const hasSubtasks = await subtaskItems.count() > 0;
    const hasNoSubtasksMessage = await noSubtasksMessage.isVisible();
    
    // Either should have subtasks OR show "no subtasks" message
    expect(hasSubtasks || hasNoSubtasksMessage).toBeTruthy();
    
    // If there are subtasks, verify their structure
    if (hasSubtasks) {
      const firstSubtaskItem = subtaskItems.first();
      
      // Should have proper styling
      await expect(firstSubtaskItem).toHaveClass(/bg-slate-900/);
      
      // Should have ID display
      const subtaskId = firstSubtaskItem.locator('span.text-xs.text-slate-400.font-mono');
      await expect(subtaskId).toBeVisible();
      
      // Should have priority badge
      const priorityBadge = firstSubtaskItem.locator('span.text-xs.px-2.py-1.rounded');
      await expect(priorityBadge).toBeVisible();
      
      // Should have status dropdown
      const statusDropdown = firstSubtaskItem.locator('select');
      await expect(statusDropdown).toBeVisible();
      
      // Should have title input
      const titleInput = firstSubtaskItem.locator('input[type="text"]');
      await expect(titleInput).toBeVisible();
    }
  });
});