const { test, expect } = require('@playwright/test');

test.describe('Debug Subtasks', () => {
  test('should debug subtask clicking issue', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for tasks to load
    await page.waitForFunction(() => {
      const todoColumn = document.querySelector('#todoColumn');
      return todoColumn && !todoColumn.textContent.includes('Loading...');
    });
    
    // Find task #59
    const task59 = page.locator('.task-card:has-text("#59")');
    
    if (await task59.isVisible()) {
      console.log('Found task #59');
      
      // Check if subtasks are visible
      const subtasksSection = task59.locator('text=📂 Subtasks');
      if (await subtasksSection.isVisible()) {
        console.log('Subtasks section is visible');
        
        // Get all subtask clickable items
        const subtaskItems = task59.locator('div.cursor-pointer:has-text(".")');
        const count = await subtaskItems.count();
        console.log(`Found ${count} subtask items`);
        
        if (count > 0) {
          // Add a console listener to capture JavaScript logs
          page.on('console', msg => console.log('Browser:', msg.text()));
          
          // Click the first subtask
          console.log('Clicking first subtask...');
          await subtaskItems.first().click();
          
          // Wait a moment
          await page.waitForTimeout(1000);
          
          // Check modal state
          const editModal = page.locator('#editModal');
          const isVisible = await editModal.isVisible();
          const className = await editModal.getAttribute('class');
          
          console.log('Edit modal visible:', isVisible);
          console.log('Edit modal class:', className);
        }
      } else {
        console.log('Subtasks section not visible');
      }
    } else {
      console.log('Task #59 not found');
    }
  });
});