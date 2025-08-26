const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

test.describe('Comprehensive Subtask Verification', () => {
  const projectRoot = 'E:\\projects\\taskmasterweb';
  const tasksJsonPath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
  
  // Helper function to read tasks.json
  async function getTasksFromFile() {
    try {
      const content = await fs.readFile(tasksJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read tasks.json:', error);
      return null;
    }
  }
  
  // Helper to find task by ID
  function findTaskById(tasksData, taskId) {
    if (!tasksData || !tasksData.master || !tasksData.master.tasks) return null;
    return tasksData.master.tasks.find(t => t.id === taskId);
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
    console.log('=== TEST START ===');
  });

  test('Scenario 1: Create Task with Multiple Subtasks', async ({ page }) => {
    console.log('\n=== SCENARIO 1: CREATE TASK WITH SUBTASKS ===');
    
    // Step 1: Open create modal
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal', { state: 'visible' });
    console.log('✓ Create modal opened');
    
    // Step 2: Fill task details
    const taskTitle = `Test Task ${Date.now()}`;
    await page.fill('#taskTitle', taskTitle);
    await page.fill('#taskDescription', 'Test task with subtasks');
    console.log('✓ Task details filled');
    
    // Step 3: Check button text before adding subtasks
    const submitBtn = page.locator('#createTaskSubmitBtn');
    let buttonText = await submitBtn.textContent();
    expect(buttonText?.trim()).toBe('Create Task');
    console.log('✓ Initial button text correct: "Create Task"');
    
    // Step 4: Add first subtask
    console.log('\nAdding first subtask...');
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    
    // Check if subtask input appeared
    const subtaskInputs = page.locator('input[placeholder="Subtask title"]');
    let inputCount = await subtaskInputs.count();
    console.log(`  - Found ${inputCount} subtask input(s)`);
    expect(inputCount).toBe(1);
    
    // Fill first subtask
    await subtaskInputs.first().fill('First Subtask');
    console.log('  ✓ First subtask filled');
    
    // Check button text changed
    buttonText = await submitBtn.textContent();
    expect(buttonText?.trim()).toBe('Save Task');
    console.log('  ✓ Button text changed to "Save Task"');
    
    // Step 5: Add second subtask
    console.log('\nAdding second subtask...');
    
    // Check if Add Subtask button is still visible
    const addSubtaskBtn = page.locator('#addCreateSubtaskBtn');
    const isVisible = await addSubtaskBtn.isVisible();
    console.log(`  - Add Subtask button visible: ${isVisible}`);
    
    if (!isVisible) {
      // Try scrolling to make it visible
      await addSubtaskBtn.scrollIntoViewIfNeeded();
      console.log('  - Scrolled button into view');
    }
    
    await addSubtaskBtn.click();
    await page.waitForTimeout(500);
    
    // Check subtask count
    inputCount = await subtaskInputs.count();
    console.log(`  - Now found ${inputCount} subtask input(s)`);
    expect(inputCount).toBe(2);
    
    // Fill second subtask
    await subtaskInputs.nth(1).fill('Second Subtask');
    console.log('  ✓ Second subtask filled');
    
    // Step 6: Save task
    console.log('\nSaving task...');
    await submitBtn.click();
    await page.waitForTimeout(2000); // Wait for save
    
    // Step 7: Verify in tasks.json
    console.log('\nVerifying in tasks.json...');
    const tasksData = await getTasksFromFile();
    
    if (!tasksData) {
      throw new Error('Could not read tasks.json');
    }
    
    // Find the created task
    const createdTask = tasksData.master?.tasks?.find(t => t.title === taskTitle);
    
    if (!createdTask) {
      console.error('Task not found in tasks.json');
      console.log('Available tasks:', tasksData.master?.tasks?.map(t => ({ id: t.id, title: t.title })));
      throw new Error(`Task "${taskTitle}" not found in tasks.json`);
    }
    
    console.log(`✓ Task found with ID: ${createdTask.id}`);
    console.log(`  - Title: ${createdTask.title}`);
    console.log(`  - Subtasks count: ${createdTask.subtasks?.length || 0}`);
    
    // Verify subtasks
    expect(createdTask.subtasks).toBeDefined();
    expect(createdTask.subtasks?.length).toBe(2);
    expect(createdTask.subtasks?.[0]?.title).toBe('First Subtask');
    expect(createdTask.subtasks?.[1]?.title).toBe('Second Subtask');
    
    console.log('✓ All subtasks correctly saved to tasks.json');
    
    // Take screenshot
    await page.screenshot({ path: 'web/test-reports/scenario1-create-with-subtasks.png', fullPage: true });
  });

  test('Scenario 2: Edit Task - Add Subtasks', async ({ page }) => {
    console.log('\n=== SCENARIO 2: EDIT TASK - ADD SUBTASKS ===');
    
    // First create a task without subtasks
    const taskTitle = `Edit Test Task ${Date.now()}`;
    
    // Create task via API or UI
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal', { state: 'visible' });
    await page.fill('#taskTitle', taskTitle);
    await page.fill('#taskDescription', 'Task to edit later');
    await page.click('#createTaskSubmitBtn');
    await page.waitForTimeout(2000);
    console.log('✓ Initial task created');
    
    // Refresh to see the task
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Find and click the task to edit
    const taskCard = page.locator(`.task-card:has-text("${taskTitle}")`).first();
    await taskCard.click();
    await page.waitForSelector('#editTaskModal', { state: 'visible' });
    console.log('✓ Edit modal opened');
    
    // Check if subtask section exists
    const subtaskSection = page.locator('#editSubtasksList');
    const sectionExists = await subtaskSection.count() > 0;
    console.log(`  - Subtask section exists: ${sectionExists}`);
    
    // Try to add subtasks in edit mode
    const addSubtaskInEdit = page.locator('#addEditSubtaskBtn');
    const addButtonExists = await addSubtaskInEdit.count() > 0;
    console.log(`  - Add subtask button in edit mode exists: ${addButtonExists}`);
    
    if (addButtonExists) {
      // Add first subtask
      await addSubtaskInEdit.click();
      await page.waitForTimeout(500);
      
      const subtaskInputs = page.locator('#editTaskModal input[placeholder*="subtask" i]');
      const inputCount = await subtaskInputs.count();
      console.log(`  - Found ${inputCount} subtask input(s) in edit modal`);
      
      if (inputCount > 0) {
        await subtaskInputs.first().fill('Edit Mode Subtask 1');
        console.log('  ✓ Added first subtask in edit mode');
        
        // Add second subtask
        await addSubtaskInEdit.click();
        await page.waitForTimeout(500);
        await subtaskInputs.nth(1).fill('Edit Mode Subtask 2');
        console.log('  ✓ Added second subtask in edit mode');
      }
      
      // Save changes
      const saveBtn = page.locator('#editTaskModal button:has-text("Save")').first();
      await saveBtn.click();
      await page.waitForTimeout(2000);
      console.log('✓ Changes saved');
      
      // Verify in tasks.json
      const tasksData = await getTasksFromFile();
      const editedTask = tasksData?.master?.tasks?.find(t => t.title === taskTitle);
      
      console.log(`  - Task subtasks count: ${editedTask?.subtasks?.length || 0}`);
      if (editedTask?.subtasks?.length > 0) {
        console.log('  - Subtask titles:', editedTask.subtasks.map(s => s.title));
      }
    } else {
      console.log('⚠ Add subtask button not found in edit mode - this is the issue!');
    }
    
    await page.screenshot({ path: 'web/test-reports/scenario2-edit-add-subtasks.png', fullPage: true });
  });

  test('Scenario 3: Modal Persistence Check', async ({ page }) => {
    console.log('\n=== SCENARIO 3: MODAL PERSISTENCE ===');
    
    // Create task with subtasks
    const taskTitle = `Persistence Test ${Date.now()}`;
    
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal', { state: 'visible' });
    await page.fill('#taskTitle', taskTitle);
    
    // Add subtasks
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    const subtaskInputs = page.locator('input[placeholder="Subtask title"]');
    await subtaskInputs.first().fill('Persistent Subtask');
    console.log('✓ Added subtask');
    
    // Close modal via backdrop
    await page.click('.modal-backdrop');
    await page.waitForSelector('#createTaskModal', { state: 'hidden' });
    console.log('✓ Modal closed');
    
    // Reopen modal
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal', { state: 'visible' });
    console.log('✓ Modal reopened');
    
    // Check if data persisted
    const titleValue = await page.inputValue('#taskTitle');
    const subtaskCount = await subtaskInputs.count();
    
    console.log(`  - Title persisted: ${titleValue === taskTitle}`);
    console.log(`  - Subtask count: ${subtaskCount}`);
    
    if (subtaskCount > 0) {
      const subtaskValue = await subtaskInputs.first().inputValue();
      console.log(`  - Subtask value: "${subtaskValue}"`);
    }
    
    await page.screenshot({ path: 'web/test-reports/scenario3-modal-persistence.png', fullPage: true });
  });

  test('Scenario 4: Verify Backend Data Integrity', async ({ page }) => {
    console.log('\n=== SCENARIO 4: BACKEND DATA INTEGRITY ===');
    
    // Read current state
    const beforeData = await getTasksFromFile();
    const beforeCount = beforeData?.master?.tasks?.length || 0;
    console.log(`Tasks before test: ${beforeCount}`);
    
    // Create task with specific structure
    const taskTitle = `Data Integrity Test ${Date.now()}`;
    
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal', { state: 'visible' });
    await page.fill('#taskTitle', taskTitle);
    await page.selectOption('#taskPriority', 'high');
    await page.selectOption('#taskStatus', 'todo');
    
    // Add multiple subtasks
    for (let i = 1; i <= 3; i++) {
      await page.click('#addCreateSubtaskBtn');
      await page.waitForTimeout(300);
      const inputs = page.locator('input[placeholder="Subtask title"]');
      await inputs.nth(i-1).fill(`Subtask ${i}`);
      console.log(`  ✓ Added subtask ${i}`);
    }
    
    // Save
    await page.click('#createTaskSubmitBtn');
    await page.waitForTimeout(2000);
    
    // Verify backend
    const afterData = await getTasksFromFile();
    const afterCount = afterData?.master?.tasks?.length || 0;
    console.log(`Tasks after test: ${afterCount}`);
    
    const newTask = afterData?.master?.tasks?.find(t => t.title === taskTitle);
    
    if (newTask) {
      console.log('\n✓ Task created successfully');
      console.log(`  ID: ${newTask.id}`);
      console.log(`  Title: ${newTask.title}`);
      console.log(`  Priority: ${newTask.priority}`);
      console.log(`  Status: ${newTask.status}`);
      console.log(`  Subtasks: ${newTask.subtasks?.length || 0}`);
      
      if (newTask.subtasks?.length > 0) {
        newTask.subtasks.forEach((st, idx) => {
          console.log(`    - Subtask ${idx + 1}: ${st.title} (ID: ${st.id})`);
        });
      }
      
      // Validate structure
      expect(newTask.subtasks).toBeDefined();
      expect(newTask.subtasks?.length).toBe(3);
      expect(newTask.priority).toBe('high');
      expect(newTask.status).toBe('todo');
    } else {
      console.error('❌ Task not found in backend!');
    }
    
    await page.screenshot({ path: 'web/test-reports/scenario4-data-integrity.png', fullPage: true });
  });

  test.afterEach(async ({ page }) => {
    console.log('=== TEST END ===\n');
  });
});