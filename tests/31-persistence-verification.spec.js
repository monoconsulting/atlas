const { test, expect } = require('@playwright/test');

test.describe('Complete Persistence Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('COMPLETE TEST: Create subtask, save, verify tasks.json, reopen and verify persistence', async ({ page }) => {
    console.log('=== COMPLETE PERSISTENCE VERIFICATION ===');
    
    // Generate unique identifiers
    const timestamp = Date.now();
    const taskTitle = `Persistence Test ${timestamp}`;
    const subtask1Title = `Subtask 1 - ${timestamp}`;
    const subtask2Title = `Subtask 2 - ${timestamp}`;
    
    console.log('Test identifiers:', {
      task: taskTitle,
      subtask1: subtask1Title, 
      subtask2: subtask2Title
    });
    
    // Step 1: Create task with 2 subtasks
    console.log('\\n1. Creating task with 2 subtasks...');
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', taskTitle);
    await page.fill('#taskDescription', 'Testing complete persistence workflow');
    await page.selectOption('#taskPriority', 'high');
    
    // Add first subtask
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(300);
    await page.locator('[data-create-subtask-id="1"] input[placeholder="Subtask title"]').fill(subtask1Title);
    await page.locator('[data-create-subtask-id="1"] select').selectOption('medium');
    
    // Add second subtask
    await page.click('#addCreateSubtaskBtn');  
    await page.waitForTimeout(300);
    await page.locator('[data-create-subtask-id="2"] input[placeholder="Subtask title"]').fill(subtask2Title);
    await page.locator('[data-create-subtask-id="2"] select').selectOption('low');
    
    // Verify createSubtasks array before submission
    const beforeSubmit = await page.evaluate(() => ({
      count: window.createSubtasks?.length || 0,
      subtasks: window.createSubtasks?.map(st => ({ id: st.id, title: st.title, priority: st.priority })) || []
    }));
    console.log('Before submit - createSubtasks:', beforeSubmit);
    expect(beforeSubmit.count).toBe(2);
    expect(beforeSubmit.subtasks[0].title).toBe(subtask1Title);
    expect(beforeSubmit.subtasks[1].title).toBe(subtask2Title);
    
    // Step 2: Submit the task
    console.log('\\n2. Submitting task...');
    await page.evaluate(() => {
      document.getElementById('addTaskForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    
    // Wait for submission to complete
    await page.waitForTimeout(4000);
    
    // Step 3: Verify modal closed
    const modalVisible = await page.locator('#createTaskModal').isVisible();
    console.log('3. Modal closed after submit:', !modalVisible);
    expect(modalVisible).toBe(false);
    
    // Step 4: Find and verify task card
    console.log('\\n4. Verifying task appears in UI...');
    const taskCard = page.locator('.task-card').filter({ hasText: taskTitle });
    await expect(taskCard).toBeVisible();
    
    const cardText = await taskCard.textContent();
    console.log('Task card verification:');
    console.log('  Has "Subtasks (2)":', cardText.includes('Subtasks (2)'));
    console.log('  Shows subtask 1:', cardText.includes(subtask1Title));
    console.log('  Shows subtask 2:', cardText.includes(subtask2Title));
    
    expect(cardText).toContain('Subtasks (2)');
    expect(cardText).toContain(subtask1Title);
    expect(cardText).toContain(subtask2Title);
    
    // Step 5: Get the task ID for tasks.json verification
    const taskIdMatch = cardText.match(/#(\d+)/);
    const taskId = taskIdMatch ? taskIdMatch[1] : null;
    console.log('\\n5. Task ID from card:', taskId);
    expect(taskId).not.toBeNull();
    
    // Step 6: Check tasks.json via API
    console.log('\\n6. Verifying data persistence via API...');
    const apiResponse = await page.request.get(`http://localhost:8199/task/${taskId}`);
    expect(apiResponse.status()).toBe(200);
    
    const taskData = await apiResponse.json();
    console.log('API task data verification:');
    console.log('  Task title:', taskData.data?.title === taskTitle ? '✅' : '❌');
    console.log('  Task description:', taskData.data?.description === 'Testing complete persistence workflow' ? '✅' : '❌');
    console.log('  Task priority:', taskData.data?.priority === 'high' ? '✅' : '❌');
    console.log('  Subtasks count:', taskData.data?.subtasks?.length === 2 ? '✅' : '❌');
    
    expect(taskData.data.title).toBe(taskTitle);
    expect(taskData.data.description).toBe('Testing complete persistence workflow');
    expect(taskData.data.priority).toBe('high');
    expect(taskData.data.subtasks).toHaveLength(2);
    
    // Verify subtask details
    const subtasks = taskData.data.subtasks;
    const subtask1 = subtasks.find(st => st.title === subtask1Title);
    const subtask2 = subtasks.find(st => st.title === subtask2Title);
    
    console.log('  Subtask 1 found:', subtask1 ? '✅' : '❌');
    console.log('  Subtask 1 priority:', subtask1?.priority === 'medium' ? '✅' : '❌');
    console.log('  Subtask 2 found:', subtask2 ? '✅' : '❌');  
    console.log('  Subtask 2 priority:', subtask2?.priority === 'low' ? '✅' : '❌');
    
    expect(subtask1).toBeTruthy();
    expect(subtask1.priority).toBe('medium');
    expect(subtask2).toBeTruthy();
    expect(subtask2.priority).toBe('low');
    
    // Step 7: Click task to open edit modal and verify all data persists
    console.log('\\n7. Opening edit modal to verify persistence...');
    await taskCard.click();
    await page.waitForTimeout(1000);
    
    // Verify main task data in edit form
    const editTitle = await page.locator('#editTaskTitle').inputValue();
    const editDescription = await page.locator('#editTaskDescription').inputValue();
    const editPriority = await page.locator('#editTaskPriority').inputValue();
    
    console.log('Edit form verification:');
    console.log('  Title preserved:', editTitle === taskTitle ? '✅' : '❌');
    console.log('  Description preserved:', editDescription === 'Testing complete persistence workflow' ? '✅' : '❌');
    console.log('  Priority preserved:', editPriority === 'high' ? '✅' : '❌');
    
    expect(editTitle).toBe(taskTitle);
    expect(editDescription).toBe('Testing complete persistence workflow');
    expect(editPriority).toBe('high');
    
    // Verify subtasks in edit modal
    const editSubtasks = page.locator('div[data-subtask-id]');
    const editSubtaskCount = await editSubtasks.count();
    console.log('  Subtasks in edit modal:', editSubtaskCount === 2 ? '✅' : '❌');
    expect(editSubtaskCount).toBe(2);
    
    // Check each subtask's data
    for (let i = 0; i < editSubtaskCount; i++) {
      const subtaskRow = editSubtasks.nth(i);
      const titleInput = await subtaskRow.locator('input.subtask-title-input').inputValue();
      const statusSelect = await subtaskRow.locator('select.subtask-status-select').inputValue();
      const priorityBadgeText = await subtaskRow.locator('span').filter({hasText: /^(high|medium|low)$/}).textContent();
      
      console.log(`  Edit subtask ${i + 1}: "${titleInput}" (status: ${statusSelect}, priority: ${priorityBadgeText})`);
      
      if (titleInput === subtask1Title) {
        expect(statusSelect).toBe('todo');
        expect(priorityBadgeText).toBe('medium');
      } else if (titleInput === subtask2Title) {
        expect(statusSelect).toBe('todo');
        expect(priorityBadgeText).toBe('low');
      } else {
        throw new Error(`Unexpected subtask title: ${titleInput}`);
      }
    }
    
    // Step 8: Close edit modal
    await page.click('#closeModal');
    await page.waitForTimeout(500);
    
    console.log('\\n=== PERSISTENCE VERIFICATION COMPLETE ===');
    console.log('✅ Task created with 2 subtasks');
    console.log('✅ Task saved successfully (modal closed)');
    console.log('✅ Task appears in UI with correct subtask count');
    console.log('✅ API confirms data is persisted in backend/tasks.json');
    console.log('✅ Edit modal shows all original data correctly');
    console.log('✅ Both subtasks preserved with correct titles and priorities');
    console.log('🎉 COMPLETE END-TO-END PERSISTENCE VERIFIED!');
    
    await page.screenshot({ path: 'web/test-reports/persistence-verification-complete.png' });
  });
});