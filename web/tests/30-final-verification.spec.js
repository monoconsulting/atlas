const { test, expect } = require('@playwright/test');

test.describe('Final Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Complete end-to-end verification: create, save, and reopen task with subtasks', async ({ page }) => {
    console.log('=== FINAL END-TO-END VERIFICATION ===');
    
    // Generate unique task name to avoid conflicts
    const timestamp = Date.now();
    const taskName = `Final Verification ${timestamp}`;
    
    // 1. Create task with 2 subtasks
    console.log('1. Creating task with subtasks...');
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', taskName);
    await page.fill('#taskDescription', 'Final end-to-end test');
    await page.selectOption('#taskPriority', 'medium');
    
    // Add first subtask
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(300);
    await page.locator('[data-create-subtask-id="1"] input[placeholder="Subtask title"]').fill('First Final Subtask');
    await page.locator('[data-create-subtask-id="1"] select').selectOption('high');
    
    // Add second subtask  
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(300);
    await page.locator('[data-create-subtask-id="2"] input[placeholder="Subtask title"]').fill('Second Final Subtask');
    await page.locator('[data-create-subtask-id="2"] select').selectOption('low');
    
    // 2. Submit form
    await page.evaluate(() => {
      document.getElementById('addTaskForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    
    await page.waitForTimeout(3000);
    
    // 3. Find the task card by unique name
    const taskCard = page.locator('.task-card').filter({ hasText: taskName }).first();
    await expect(taskCard).toBeVisible();
    
    // 4. Verify task card shows subtasks
    const cardText = await taskCard.textContent();
    console.log('Task card shows subtasks:', cardText.includes('Subtasks (2)'));
    console.log('First subtask visible:', cardText.includes('First Final Subtask'));
    console.log('Second subtask visible:', cardText.includes('Second Final Subtask'));
    
    expect(cardText).toContain('Subtasks (2)');
    expect(cardText).toContain('First Final Subtask'); 
    expect(cardText).toContain('Second Final Subtask');
    
    // 5. Click to open edit modal
    console.log('\\n2. Opening task in edit mode...');
    await taskCard.click();
    await page.waitForTimeout(1000);
    
    // 6. Verify edit modal shows correct data
    const editTitle = await page.locator('#editTitle').inputValue();
    const editDescription = await page.locator('#editDescription').inputValue();
    const editPriority = await page.locator('#editPriority').inputValue();
    
    console.log('Edit modal data verification:');
    console.log('  Title:', editTitle === taskName ? '✅' : '❌', `"${editTitle}"`);
    console.log('  Description:', editDescription === 'Final end-to-end test' ? '✅' : '❌', `"${editDescription}"`);
    console.log('  Priority:', editPriority === 'medium' ? '✅' : '❌', `"${editPriority}"`);
    
    expect(editTitle).toBe(taskName);
    expect(editDescription).toBe('Final end-to-end test');
    expect(editPriority).toBe('medium');
    
    // 7. Check subtasks in edit modal
    const subtaskRows = page.locator('[data-subtask-id]');
    const subtaskCount = await subtaskRows.count();
    console.log('\\n  Subtasks in edit modal:', subtaskCount);
    
    expect(subtaskCount).toBe(2);
    
    // Get subtask details
    for (let i = 0; i < subtaskCount; i++) {
      const subtask = subtaskRows.nth(i);
      const title = await subtask.locator('input').first().inputValue();
      const prioritySelect = subtask.locator('select').first();
      const priority = await prioritySelect.inputValue();
      
      console.log(`  Subtask ${i + 1}: "${title}" (${priority})`);
      
      if (title === 'First Final Subtask') {
        expect(priority).toBe('high');
      } else if (title === 'Second Final Subtask') {
        expect(priority).toBe('low');
      }
    }
    
    // 8. Close edit modal
    await page.click('#closeModal');
    
    console.log('\\n=== FINAL VERIFICATION COMPLETE ===');
    console.log('✅ Task created successfully with 2 subtasks');
    console.log('✅ Task appears in UI with "Subtasks (2)" indicator');
    console.log('✅ Both subtasks are visible in task card');
    console.log('✅ Edit modal shows correct main task data');
    console.log('✅ Edit modal shows both subtasks with correct priorities');
    console.log('✅ All functionality working as expected!');
    
    await page.screenshot({ path: 'web/test-reports/final-verification-success.png' });
  });
});