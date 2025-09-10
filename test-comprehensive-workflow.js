const { test, expect } = require('@playwright/test');

test.describe('TaskMasterWeb - Comprehensive Workflow Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:8099');
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to be fully loaded
    await expect(page.locator('h1')).toContainText('Task Master AI');
    await page.waitForTimeout(2000); // Give time for any animations
  });

  test('Complete workflow: Create task with subtasks, edit, add more subtasks, delete', async ({ page }) => {
    console.log('🎬 Starting comprehensive workflow test...');
    
    // Step 1: Create a new task
    console.log('📝 Step 1: Creating new task...');
    await page.screenshot({ path: 'test-results/step1-before-create.png', fullPage: true });
    
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal:not(.hidden)');
    
    // Fill task details
    const taskTitle = 'Test Task for Comprehensive Workflow';
    const taskDescription = 'This is a test task to validate the complete workflow including subtasks and delete functionality';
    
    await page.fill('#taskTitle', taskTitle);
    await page.fill('#taskDescription', taskDescription);
    await page.selectOption('#taskPriority', 'high');
    await page.fill('#taskDueDate', '2024-12-31');
    await page.fill('#taskAssignedTo', 'Test User');
    
    await page.screenshot({ path: 'test-results/step1-task-form-filled.png', fullPage: true });
    
    // Step 2: Add subtasks in create modal
    console.log('📋 Step 2: Adding subtasks in create modal...');
    
    // Add first subtask
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(1000);
    
    const subtask1Title = 'First Subtask';
    const subtask1Description = 'This is the first subtask added during creation';
    
    // Find the first subtask form
    const firstSubtaskDiv = page.locator('[data-create-subtask-id="1"]').first();
    await firstSubtaskDiv.locator('input[onchange*="title"]').fill(subtask1Title);
    await firstSubtaskDiv.locator('textarea[onchange*="description"]').fill(subtask1Description);
    await firstSubtaskDiv.locator('select[onchange*="priority"]').selectOption('medium');
    
    await page.screenshot({ path: 'test-results/step2-first-subtask.png', fullPage: true });
    
    // Add second subtask
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(1000);
    
    const subtask2Title = 'Second Subtask';
    const subtask2Description = 'This is the second subtask added during creation';
    
    const secondSubtaskDiv = page.locator('[data-create-subtask-id="2"]').first();
    await secondSubtaskDiv.locator('input[onchange*="title"]').fill(subtask2Title);
    await secondSubtaskDiv.locator('textarea[onchange*="description"]').fill(subtask2Description);
    await secondSubtaskDiv.locator('select[onchange*="priority"]').selectOption('low');
    
    await page.screenshot({ path: 'test-results/step2-both-subtasks.png', fullPage: true });
    
    // Step 3: Submit the task
    console.log('✅ Step 3: Submitting the task...');
    await page.click('button[type="submit"]');
    
    // Wait for modal to close and task to appear
    await page.waitForSelector('#createTaskModal.hidden', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for task to be created and page to refresh
    
    await page.screenshot({ path: 'test-results/step3-task-created.png', fullPage: true });
    
    // Verify the task appears in the kanban board
    const taskCard = page.locator('.task-card').filter({ hasText: taskTitle }).first();
    await expect(taskCard).toBeVisible();
    
    // Verify subtasks are shown in the card
    await expect(taskCard.locator(':text("Subtasks (2)")')).toBeVisible();
    await expect(taskCard.locator(':text("First Subtask")')).toBeVisible();
    await expect(taskCard.locator(':text("Second Subtask")')).toBeVisible();
    
    // Step 4: Edit the task to add more subtasks
    console.log('✏️ Step 4: Editing task to add more subtasks...');
    await taskCard.click();
    
    // Wait for edit modal to open
    await page.waitForSelector('#editModal:not(.hidden)');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/step4-edit-modal-open.png', fullPage: true });
    
    // Verify existing subtasks are displayed
    const subtasksList = page.locator('#subtasksList');
    await expect(subtasksList.locator(':text("First Subtask")')).toBeVisible();
    await expect(subtasksList.locator(':text("Second Subtask")')).toBeVisible();
    
    // Step 5: Add a new subtask in edit mode
    console.log('➕ Step 5: Adding new subtask in edit mode...');
    await page.click('#addSubtaskBtn');
    await page.waitForTimeout(2000);
    
    // Fill the new subtask form
    const newSubtaskForm = page.locator('.bg-slate-900.border.border-slate-800.rounded.p-4.space-y-3').last();
    await newSubtaskForm.locator('input[data-field="title"]').fill('Third Subtask Added in Edit');
    await newSubtaskForm.locator('textarea[data-field="description"]').fill('This subtask was added while editing the task');
    await newSubtaskForm.locator('select[data-field="priority"]').selectOption('high');
    
    await page.screenshot({ path: 'test-results/step5-new-subtask-form.png', fullPage: true });
    
    // Save the new subtask
    await newSubtaskForm.locator('.save-subtask-btn').click();
    await page.waitForTimeout(3000); // Wait for subtask to be created
    
    await page.screenshot({ path: 'test-results/step5-subtask-saved.png', fullPage: true });
    
    // Step 6: Edit an existing subtask
    console.log('✏️ Step 6: Editing existing subtask...');
    const firstSubtaskInput = subtasksList.locator('.subtask-title-input').first();
    await firstSubtaskInput.fill('First Subtask - EDITED');
    await firstSubtaskInput.dispatchEvent('change');
    await page.waitForTimeout(2000);
    
    // Change subtask status
    const firstSubtaskStatus = subtasksList.locator('.subtask-status-select').first();
    await firstSubtaskStatus.selectOption('in-progress');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/step6-subtask-edited.png', fullPage: true });
    
    // Step 7: Save the main task
    console.log('💾 Step 7: Saving the main task...');
    await page.click('#saveTask');
    
    // Wait for modal to close
    await page.waitForSelector('#editModal.hidden', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/step7-task-saved.png', fullPage: true });
    
    // Step 8: Verify all changes are reflected
    console.log('🔍 Step 8: Verifying all changes...');
    const updatedTaskCard = page.locator('.task-card').filter({ hasText: taskTitle }).first();
    await expect(updatedTaskCard).toBeVisible();
    
    // Should now show 3 subtasks
    await expect(updatedTaskCard.locator(':text("Subtasks (3)")')).toBeVisible();
    await expect(updatedTaskCard.locator(':text("First Subtask - EDITED")')).toBeVisible();
    await expect(updatedTaskCard.locator(':text("Third Subtask Added in Edit")')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/step8-verification.png', fullPage: true });
    
    // Step 9: Test Quick Filters
    console.log('🔧 Step 9: Testing Quick Filters...');
    
    // Test priority filter
    await page.selectOption('#filterPriority', 'high');
    await page.waitForTimeout(1000);
    await expect(updatedTaskCard).toBeVisible(); // Should still be visible as it's high priority
    
    await page.selectOption('#filterPriority', 'low');
    await page.waitForTimeout(1000);
    await expect(updatedTaskCard).not.toBeVisible(); // Should be hidden as it's not low priority
    
    // Reset filter
    await page.selectOption('#filterPriority', '');
    await page.waitForTimeout(1000);
    await expect(updatedTaskCard).toBeVisible();
    
    // Test sorting
    await page.selectOption('#quickSort', 'id-desc');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/step9-filters-tested.png', fullPage: true });
    
    // Step 10: Test delete functionality
    console.log('🗑️ Step 10: Testing delete functionality...');
    
    // Hover over the task card to reveal delete button
    await updatedTaskCard.hover();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/step10-hover-for-delete.png', fullPage: true });
    
    // Click the delete button
    const deleteButton = updatedTaskCard.locator('button[onclick*="deleteTask"]');
    await expect(deleteButton).toBeVisible();
    
    // Handle the confirmation dialog
    page.on('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept();
    });
    
    await deleteButton.click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/step10-task-deleted.png', fullPage: true });
    
    // Verify task is no longer visible in the kanban board
    await expect(updatedTaskCard).not.toBeVisible();
    
    console.log('✅ Test completed successfully! All steps passed.');
    
    // Final verification screenshot
    await page.screenshot({ path: 'test-results/final-state.png', fullPage: true });
  });

  test('Test edge cases and error handling', async ({ page }) => {
    console.log('🧪 Testing edge cases...');
    
    // Test creating task with empty title (should fail validation)
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal:not(.hidden)');
    
    // Try to submit without title
    await page.click('button[type="submit"]');
    
    // Should not submit (modal should remain open)
    await page.waitForTimeout(2000);
    const modal = page.locator('#createTaskModal');
    const isHidden = await modal.evaluate(el => el.classList.contains('hidden'));
    expect(isHidden).toBeFalsy();
    
    await page.screenshot({ path: 'test-results/edge-case-empty-title.png', fullPage: true });
    
    // Close modal
    await page.click('#closeCreateModal');
    await page.waitForSelector('#createTaskModal.hidden');
    
    console.log('✅ Edge cases test completed!');
  });
});