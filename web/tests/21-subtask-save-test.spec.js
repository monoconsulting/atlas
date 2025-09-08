const { test, expect } = require('@playwright/test');

test.describe('Subtask Save Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Create task with subtask and verify save to tasks.json', async ({ page }) => {
    console.log('=== TESTING SUBTASK SAVE FUNCTIONALITY ===');
    
    // 1. Open Create Task modal
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal', { state: 'visible' });
    console.log('✅ Opened Create Task modal');
    
    // 2. Fill task title
    await page.fill('#taskTitle', 'Task with Subtask Save Test');
    console.log('✅ Filled task title');
    
    // 3. Add subtask
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(1000);
    console.log('✅ Added subtask');
    
    // 4. Fill subtask details
    const subtaskInput = page.locator('input[placeholder="Subtask title"]').first();
    await subtaskInput.fill('My Test Subtask');
    console.log('✅ Filled subtask title');
    
    // 5. Change subtask priority
    const prioritySelect = page.locator('#createSubtasksList select').first();
    await prioritySelect.selectOption('high');
    console.log('✅ Set subtask priority to high');
    
    // 6. Fill subtask description
    const subtaskDescription = page.locator('#createSubtasksList textarea').first();
    await subtaskDescription.fill('This is a test subtask description');
    console.log('✅ Filled subtask description');
    
    // 7. Verify button shows "Save Task"
    let buttonText = await page.locator('#createTaskSubmitBtn').textContent();
    buttonText = buttonText?.trim() || '';
    expect(buttonText).toBe('Save Task');
    console.log('✅ Button shows "Save Task"');
    
    // 8. Listen for network requests to see what's being sent
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/task')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });
    
    // 9. Submit the form
    await page.click('#createTaskSubmitBtn');
    console.log('✅ Clicked Save Task button');
    
    // 10. Wait for modal to close (indicating success)
    await page.waitForSelector('#createTaskModal', { state: 'hidden', timeout: 10000 });
    console.log('✅ Modal closed - task should be created');
    
    // 11. Wait a bit for all requests to complete
    await page.waitForTimeout(3000);
    
    // 12. Check what requests were made
    console.log('Network requests made:');
    requests.forEach((req, index) => {
      console.log(`Request ${index + 1}:`, {
        url: req.url,
        method: req.method,
        body: req.postData ? JSON.parse(req.postData) : 'No body'
      });
    });
    
    // 13. Verify task was created by checking API
    const tasksResponse = await page.request.get('http://localhost:8199/tasks');
    const tasksData = await tasksResponse.json();
    
    console.log('Current tasks in system:', tasksData.data?.length || 0);
    
    // Find our created task
    const createdTask = tasksData.data?.find(task => 
      task.title === 'Task with Subtask Save Test'
    );
    
    if (createdTask) {
      console.log('✅ Task found in API:', {
        id: createdTask.id,
        title: createdTask.title,
        subtasks: createdTask.subtasks?.length || 0
      });
      
      // 14. Check if subtasks were saved
      if (createdTask.subtasks && createdTask.subtasks.length > 0) {
        console.log('✅ SUCCESS: Subtasks were saved!');
        console.log('Subtask details:', createdTask.subtasks[0]);
        
        // Verify subtask properties
        const subtask = createdTask.subtasks[0];
        expect(subtask.title).toBe('My Test Subtask');
        expect(subtask.priority).toBe('high');
        expect(subtask.description).toBe('This is a test subtask description');
        console.log('✅ All subtask properties saved correctly');
      } else {
        console.log('❌ ISSUE: Task found but NO subtasks saved');
        console.log('Task structure:', createdTask);
      }
      
      // 15. Test reopening the task to see if subtasks show
      console.log('\n=== TESTING TASK REOPENING ===');
      
      // Find and click on the task card
      const taskCards = page.locator('[data-task-id]');
      let taskCardFound = false;
      
      const cardCount = await taskCards.count();
      for (let i = 0; i < cardCount; i++) {
        const cardText = await taskCards.nth(i).textContent();
        if (cardText.includes('Task with Subtask Save Test')) {
          await taskCards.nth(i).click();
          taskCardFound = true;
          console.log('✅ Clicked on created task card');
          break;
        }
      }
      
      if (taskCardFound) {
        // Wait for edit modal to open
        await page.waitForSelector('#editModal', { state: 'visible' });
        console.log('✅ Edit modal opened');
        
        // Check if subtasks are shown in the edit modal
        const editModalContent = await page.locator('#editModal').textContent();
        if (editModalContent.includes('My Test Subtask')) {
          console.log('✅ SUCCESS: Subtask visible in edit modal!');
        } else {
          console.log('❌ ISSUE: Subtask NOT visible in edit modal');
          console.log('Modal content preview:', editModalContent.substring(0, 500));
        }
      } else {
        console.log('❌ Could not find task card in UI');
      }
      
    } else {
      console.log('❌ MAJOR ISSUE: Task not found in API response');
      console.log('Available tasks:', tasksData.data?.map(t => t.title) || []);
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'web/test-reports/subtask-save-test.png' });
    console.log('✅ Screenshot saved');
  });
});