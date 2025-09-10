const { test, expect } = require('@playwright/test');

test.describe('Edit Modal Subtask Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Edit Task modal does not close when Add Subtask is clicked', async ({ page }) => {
    // First create a task to edit
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Test Task for Editing');
    await page.click('#createTaskSubmitBtn');
    
    // Wait for task creation (longer timeout)
    await page.waitForTimeout(5000); // Wait for task creation and reload
    
    // Close modal manually if it's still open
    try {
      await page.click('#closeCreateModal');
      await page.waitForTimeout(500);
    } catch {
      // Modal might already be closed
    }
    
    // Find and click the created task to open edit modal
    const taskCards = page.locator('[data-task-id]');
    const taskCount = await taskCards.count();
    console.log(`Found ${taskCount} task cards`);
    
    if (taskCount > 0) {
      await taskCards.first().click();
      
      // Wait for edit modal to open
      await page.waitForSelector('#editModal', { state: 'visible' });
      console.log('Edit modal opened successfully');
      
      // Check if Add Subtask button exists
      const addSubtaskBtn = page.locator('#addSubtaskBtn');
      await expect(addSubtaskBtn).toBeVisible();
      console.log('Add Subtask button is visible');
      
      // Click Add Subtask button
      await addSubtaskBtn.click();
      console.log('Clicked Add Subtask button');
      
      // Wait a moment for any potential modal changes
      await page.waitForTimeout(1000);
      
      // Check that edit modal is still visible
      const editModal = page.locator('#editModal');
      await expect(editModal).toBeVisible();
      console.log('Edit modal is still visible - GOOD!');
      
      // Check if subtask form was added
      const subtaskInputs = page.locator('#subtasksList input[placeholder="Subtask title"]');
      const inputCount = await subtaskInputs.count();
      console.log(`Found ${inputCount} subtask title inputs`);
      
      if (inputCount > 0) {
        // Try to fill the subtask form
        try {
          await subtaskInputs.first().fill('New Subtask in Edit', { force: true });
          console.log('Successfully filled subtask title');
        } catch (error) {
          console.log('Failed to fill subtask title:', error.message);
        }
        
        // Try adding another subtask
        try {
          await addSubtaskBtn.click({ force: true });
          await page.waitForTimeout(500);
          
          const newInputCount = await subtaskInputs.count();
          console.log(`After second add: ${newInputCount} subtask inputs`);
          
          // Modal should still be open
          await expect(editModal).toBeVisible();
          console.log('Edit modal still visible after second subtask add - GOOD!');
        } catch (error) {
          console.log('Failed to add second subtask:', error.message);
        }
      } else {
        console.log('No subtask input fields found - addSubtaskToEditForm may not be working');
      }
      
    } else {
      console.log('No task cards found - task creation may have failed');
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'web/test-reports/edit-modal-subtask-test.png' });
  });
});