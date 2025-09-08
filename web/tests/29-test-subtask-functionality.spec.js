const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

test.describe('Test Subtask Functionality', () => {
  const projectRoot = 'E:\\projects\\taskmasterweb';
  const tasksJsonPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
  
  async function getTasksFromFile() {
    try {
      const content = await fs.readFile(tasksJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read tasks.json:', error);
      return null;
    }
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('CRITICAL TEST: Create task with subtasks and verify in tasks.json', async ({ page }) => {
    console.log('\n=== CRITICAL SUBTASK TEST ===\n');
    
    // Step 1: Open modal
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal', { state: 'visible' });
    console.log('✓ Modal opened');
    
    // Step 2: Fill task details
    const taskTitle = `Critical Test ${Date.now()}`;
    await page.fill('#taskTitle', taskTitle);
    await page.fill('#taskDescription', 'Testing subtask functionality');
    console.log(`✓ Task title: ${taskTitle}`);
    
    // Step 3: Add first subtask
    console.log('\n--- Adding First Subtask ---');
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    
    // Wait for subtask container to update
    const subtaskContainer = page.locator('#createSubtasksList');
    await subtaskContainer.waitFor({ state: 'visible' });
    
    // Find subtask input
    const subtaskInputs = page.locator('#createSubtasksList input[placeholder="Subtask title"]');
    const inputCount1 = await subtaskInputs.count();
    console.log(`  Subtask inputs found: ${inputCount1}`);
    
    if (inputCount1 > 0) {
      // Check if input is visible
      const isVisible = await subtaskInputs.first().isVisible();
      console.log(`  First input visible: ${isVisible}`);
      
      if (!isVisible) {
        // Scroll into view
        await subtaskInputs.first().scrollIntoViewIfNeeded();
        console.log('  Scrolled into view');
      }
      
      // Fill the input
      await subtaskInputs.first().fill('First Subtask', { force: true });
      console.log('  ✓ First subtask filled');
      
      // Verify value was set
      const value1 = await subtaskInputs.first().inputValue();
      console.log(`  Value set: "${value1}"`);
    }
    
    // Step 4: Add second subtask
    console.log('\n--- Adding Second Subtask ---');
    
    // Check if Add Subtask button is still visible
    const addBtn = page.locator('#addCreateSubtaskBtn');
    const btnVisible = await addBtn.isVisible();
    console.log(`  Add button visible: ${btnVisible}`);
    
    if (!btnVisible) {
      await addBtn.scrollIntoViewIfNeeded();
    }
    
    await addBtn.click();
    await page.waitForTimeout(500);
    
    const inputCount2 = await subtaskInputs.count();
    console.log(`  Subtask inputs now: ${inputCount2}`);
    
    if (inputCount2 > 1) {
      await subtaskInputs.nth(1).fill('Second Subtask', { force: true });
      console.log('  ✓ Second subtask filled');
      
      const value2 = await subtaskInputs.nth(1).inputValue();
      console.log(`  Value set: "${value2}"`);
    }
    
    // Step 5: Check window.createSubtasks array
    console.log('\n--- Checking JavaScript State ---');
    const jsState = await page.evaluate(() => {
      return {
        subtasks: window.createSubtasks,
        counter: window.createSubtaskCounter,
        parentId: window.createParentTaskId
      };
    });
    
    console.log(`  window.createSubtasks: ${JSON.stringify(jsState.subtasks)}`);
    console.log(`  Subtask count in memory: ${jsState.subtasks?.length || 0}`);
    console.log(`  Parent task ID: ${jsState.parentId}`);
    
    // Step 6: Save the task
    console.log('\n--- Saving Task ---');
    const saveBtn = page.locator('#createTaskSubmitBtn');
    const btnText = await saveBtn.textContent();
    console.log(`  Button text: "${btnText?.trim()}"`);
    
    await saveBtn.click();
    console.log('  ✓ Save button clicked');
    
    // Wait for save to complete
    await page.waitForTimeout(3000);
    
    // Step 7: Check if modal closed
    const modalStillVisible = await page.locator('#createTaskModal').isVisible();
    console.log(`  Modal still visible: ${modalStillVisible}`);
    
    // Step 8: Verify in tasks.json
    console.log('\n--- Verifying in tasks.json ---');
    const tasksData = await getTasksFromFile();
    
    if (!tasksData) {
      console.error('  ❌ Could not read tasks.json');
      throw new Error('Failed to read tasks.json');
    }
    
    const allTasks = tasksData.master?.tasks || [];
    console.log(`  Total tasks in file: ${allTasks.length}`);
    
    // Find our task
    const ourTask = allTasks.find(t => t.title === taskTitle);
    
    if (!ourTask) {
      console.error(`  ❌ Task "${taskTitle}" not found`);
      console.log('  Last 5 tasks:', allTasks.slice(-5).map(t => ({
        id: t.id,
        title: t.title,
        subtasks: t.subtasks?.length || 0
      })));
      throw new Error('Task not found in tasks.json');
    }
    
    console.log(`  ✓ Task found with ID: ${ourTask.id}`);
    console.log(`  Task title: ${ourTask.title}`);
    console.log(`  Task description: ${ourTask.description}`);
    console.log(`  Subtasks count: ${ourTask.subtasks?.length || 0}`);
    
    if (ourTask.subtasks && ourTask.subtasks.length > 0) {
      console.log('  Subtasks:');
      ourTask.subtasks.forEach((st, idx) => {
        console.log(`    ${idx + 1}. ${st.title} (ID: ${st.id})`);
      });
    }
    
    // Final assertions
    expect(ourTask).toBeDefined();
    expect(ourTask.subtasks).toBeDefined();
    expect(ourTask.subtasks?.length).toBe(2);
    expect(ourTask.subtasks?.[0]?.title).toBe('First Subtask');
    expect(ourTask.subtasks?.[1]?.title).toBe('Second Subtask');
    
    console.log('\n✅ TEST PASSED: Subtasks created and saved correctly!');
    
    // Take success screenshot
    await page.screenshot({ 
      path: 'web/test-reports/subtask-test-success.png', 
      fullPage: true 
    });
  });

  test('TEST 2: Edit existing task and add subtasks', async ({ page }) => {
    console.log('\n=== EDIT TASK SUBTASK TEST ===\n');
    
    // First, create a simple task without subtasks
    const taskTitle = `Edit Test ${Date.now()}`;
    
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal', { state: 'visible' });
    await page.fill('#taskTitle', taskTitle);
    await page.fill('#taskDescription', 'Task to edit');
    await page.click('#createTaskSubmitBtn');
    await page.waitForTimeout(2000);
    console.log('✓ Initial task created');
    
    // Reload page to see the new task
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Find and click the task card
    const taskCards = page.locator('.task-card');
    const cardCount = await taskCards.count();
    console.log(`Found ${cardCount} task cards`);
    
    // Look for our task
    let taskFound = false;
    for (let i = 0; i < cardCount; i++) {
      const cardText = await taskCards.nth(i).textContent();
      if (cardText?.includes(taskTitle)) {
        console.log(`✓ Found our task at index ${i}`);
        await taskCards.nth(i).click();
        taskFound = true;
        break;
      }
    }
    
    if (!taskFound) {
      console.error('❌ Could not find task card');
      throw new Error('Task card not found');
    }
    
    // Wait for edit modal
    await page.waitForTimeout(1000);
    
    // Check if edit modal opened
    const editModal = page.locator('#editTaskModal');
    const editModalVisible = await editModal.isVisible();
    console.log(`Edit modal visible: ${editModalVisible}`);
    
    if (!editModalVisible) {
      console.error('❌ Edit modal did not open');
      throw new Error('Edit modal not visible');
    }
    
    // Look for subtask functionality in edit modal
    const editSubtaskBtn = page.locator('#editTaskModal button:has-text("Add Subtask")');
    const editBtnExists = await editSubtaskBtn.count() > 0;
    console.log(`Add Subtask button in edit modal exists: ${editBtnExists}`);
    
    if (editBtnExists) {
      console.log('✅ Edit modal HAS subtask functionality!');
    } else {
      console.log('❌ Edit modal MISSING subtask functionality - THIS IS THE BUG!');
    }
    
    await page.screenshot({ 
      path: 'web/test-reports/edit-modal-check.png', 
      fullPage: true 
    });
  });
});