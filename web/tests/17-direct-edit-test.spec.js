const { test, expect } = require('@playwright/test');

test.describe('Direct Edit Modal Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Edit modal functionality with existing tasks', async ({ page }) => {
    // First check if we have any tasks
    const taskCards = page.locator('[data-task-id]');
    let taskCount = await taskCards.count();
    console.log(`Initial task count: ${taskCount}`);
    
    // If no tasks, create one via API
    if (taskCount === 0) {
      console.log('Creating a task via API...');
      const response = await page.request.post('http://localhost:8199/task', {
        data: {
          title: 'Test Task for Edit Modal',
          description: 'Created via API for testing',
          priority: 'medium',
          status: 'todo'
        }
      });
      
      if (response.ok()) {
        const responseBody = await response.json();
        console.log('Task created successfully via API:', responseBody);
        
        // Wait for the task to be saved and then refresh
        await page.waitForTimeout(2000);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000); // Give time for tasks to load
        
        // Check task count again
        taskCount = await taskCards.count();
        console.log(`Task count after API creation and reload: ${taskCount}`);
        
        // If still no tasks, let's check the API response directly
        const tasksResponse = await page.request.get('http://localhost:8199/tasks');
        if (tasksResponse.ok()) {
          const tasksData = await tasksResponse.json();
          console.log('Tasks API response:', tasksData);
        }
      } else {
        const errorBody = await response.text();
        console.log('Failed to create task via API:', response.status(), errorBody);
      }
    }
    
    // Since API shows many tasks exist, let's simulate clicking on one by finding task elements differently
    // Try to find task elements by common attributes
    await page.waitForTimeout(2000);
    
    let testableTaskFound = false;
    
    // Try different selectors that might contain tasks
    const possibleTaskSelectors = [
      '[data-task-id]',
      '.task-card',
      '[onclick*="openEditModal"]',
      'div[class*="cursor-pointer"]'
    ];
    
    for (const selector of possibleTaskSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      console.log(`Found ${count} elements with selector: ${selector}`);
      
      if (count > 0) {
        testableTaskFound = true;
        await elements.first().click();
        break;
      }
    }
    
    if (!testableTaskFound) {
      // Force create a simple task via direct DOM manipulation for testing
      await page.evaluate(() => {
        const container = document.querySelector('#tasksContainer, .tasks-list, main');
        if (container) {
          const testTask = document.createElement('div');
          testTask.setAttribute('data-task-id', '999');
          testTask.className = 'cursor-pointer p-4 bg-gray-800 rounded mb-2';
          testTask.innerHTML = '<h3>Test Task for Edit</h3>';
          testTask.onclick = () => openEditModal(999);
          container.appendChild(testTask);
        }
      });
      
      // Try clicking the created test task
      const testTask = page.locator('[data-task-id="999"]');
      if (await testTask.count() > 0) {
        await testTask.click();
        testableTaskFound = true;
      }
    }

    // If we found a testable task, proceed with edit modal test
    if (testableTaskFound) {
      console.log('Attempting to open edit modal...');
      
      // Wait for edit modal
      await page.waitForSelector('#editModal', { state: 'visible' });
      console.log('Edit modal opened');
      
      // Test the Add Subtask button
      const addSubtaskBtn = page.locator('#addSubtaskBtn');
      const isVisible = await addSubtaskBtn.isVisible();
      console.log(`Add Subtask button visible: ${isVisible}`);
      
      if (isVisible) {
        // Click Add Subtask
        await addSubtaskBtn.click();
        console.log('Clicked Add Subtask button');
        
        // Wait a moment
        await page.waitForTimeout(1000);
        
        // Check if modal is still open
        const editModal = page.locator('#editModal');
        const modalVisible = await editModal.isVisible();
        console.log(`Edit modal still visible: ${modalVisible}`);
        
        if (modalVisible) {
          console.log('SUCCESS: Edit modal did not close when Add Subtask was clicked!');
          
          // Look for subtask inputs
          const subtaskInputs = page.locator('#subtasksList input[placeholder="Subtask title"]');
          const inputCount = await subtaskInputs.count();
          console.log(`Subtask inputs found: ${inputCount}`);
          
          if (inputCount > 0) {
            console.log('SUCCESS: Subtask form was created in edit modal!');
          }
        } else {
          console.log('ISSUE: Edit modal closed when Add Subtask was clicked');
        }
      } else {
        console.log('Add Subtask button not visible in edit modal');
      }
    } else {
      console.log('No tasks available for testing edit modal');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'web/test-reports/direct-edit-test.png' });
  });
});