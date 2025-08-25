const { test, expect } = require('@playwright/test');

test.describe('Complete Save Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Create task with subtasks and verify complete save workflow', async ({ page }) => {
    console.log('=== TESTING COMPLETE SAVE WORKFLOW ===');
    
    // Track network responses
    const responses = [];
    page.on('response', async response => {
      if (response.url().includes('/task')) {
        try {
          const responseBody = await response.json();
          responses.push({
            url: response.url(),
            method: response.request().method(),
            status: response.status(),
            body: responseBody
          });
        } catch (error) {
          console.log('Failed to parse response JSON:', error.message);
        }
      }
    });
    
    // 1. Create task with subtasks
    console.log('1. Opening create task modal...');
    await page.click('#createTaskBtn');
    
    // 2. Fill main task details
    console.log('2. Filling task details...');
    await page.fill('#taskTitle', 'Workflow Test Task');
    await page.fill('#taskDescription', 'This task tests the complete workflow');
    await page.selectOption('#taskPriority', 'high');
    
    // 3. Add first subtask
    console.log('3. Adding first subtask...');
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    
    const firstSubtaskInput = page.locator('input[placeholder="Subtask title"]').first();
    await firstSubtaskInput.fill('First Subtask');
    
    // Set priority for first subtask
    const firstPrioritySelect = page.locator('[data-create-subtask-id="1"] select');
    await firstPrioritySelect.selectOption('medium');
    
    // 4. Add second subtask
    console.log('4. Adding second subtask...');
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    
    const secondSubtaskInput = page.locator('input[placeholder="Subtask title"]').nth(1);
    await secondSubtaskInput.fill('Second Subtask');
    
    // Set priority for second subtask
    const secondPrioritySelect = page.locator('[data-create-subtask-id="2"] select');
    await secondPrioritySelect.selectOption('low');
    
    // 5. Verify button text changed to "Save Task"
    const saveButton = page.locator('#createTaskSubmitBtn');
    const buttonText = await saveButton.textContent();
    console.log('5. Button text:', buttonText);
    expect(buttonText).toBe('Save Task');
    
    // 6. Submit the form
    console.log('6. Submitting form...');
    await page.evaluate(() => {
      document.getElementById('addTaskForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    
    // 7. Wait for creation to complete
    await page.waitForTimeout(5000);
    
    // 8. Check if modal closed
    const modalVisible = await page.locator('#createTaskModal').isVisible();
    console.log('7. Modal closed:', !modalVisible);
    expect(modalVisible).toBe(false);
    
    // 9. Log all API responses
    console.log('\\n=== API RESPONSES ===');
    responses.forEach((response, index) => {
      console.log(`Response ${index + 1}:`, {
        method: response.method,
        url: response.url,
        status: response.status,
        success: response.body.ok || false,
        taskId: response.body.data?.id || 'N/A',
        subtaskId: response.body.data?.sub_id || 'N/A'
      });
    });
    
    // 10. Verify task appears in the UI
    console.log('\\n8. Checking if task appears in UI...');
    await page.waitForTimeout(2000);
    
    // Look for the task card with our title
    const taskCard = page.locator('.task-card').filter({ hasText: 'Workflow Test Task' });
    await expect(taskCard).toBeVisible();
    
    const taskCardText = await taskCard.textContent();
    console.log('Task card content:', taskCardText);
    
    // Check for subtasks section
    expect(taskCardText).toContain('Subtasks (2)');
    expect(taskCardText).toContain('First Subtask');
    expect(taskCardText).toContain('Second Subtask');
    
    // 11. Click on task to open edit modal and verify data
    console.log('\\n9. Opening task in edit mode...');
    await taskCard.click();
    await page.waitForTimeout(1000);
    
    // Check edit modal data
    const editTitle = await page.locator('#editTitle').inputValue();
    const editDescription = await page.locator('#editDescription').inputValue();
    const editPriority = await page.locator('#editPriority').inputValue();
    
    console.log('Edit modal data:', {
      title: editTitle,
      description: editDescription,
      priority: editPriority
    });
    
    expect(editTitle).toBe('Workflow Test Task');
    expect(editDescription).toBe('This task tests the complete workflow');
    expect(editPriority).toBe('high');
    
    // Check subtasks in edit modal
    const subtaskElements = page.locator('[data-subtask-id]');
    const subtaskCount = await subtaskElements.count();
    console.log('Subtasks in edit modal:', subtaskCount);
    expect(subtaskCount).toBe(2);
    
    // 12. Close edit modal
    await page.click('#closeModal');
    
    console.log('\\n=== WORKFLOW TEST COMPLETE ===');
    console.log('✅ Task created successfully with 2 subtasks');
    console.log('✅ Task appears in UI with correct data');
    console.log('✅ Edit modal shows correct task and subtask data');
    
    // Take final screenshot
    await page.screenshot({ path: 'web/test-reports/complete-workflow-success.png' });
  });
});