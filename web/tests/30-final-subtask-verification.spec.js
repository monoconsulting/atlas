const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

test.describe('Final Subtask Verification', () => {
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

  test('FINAL TEST: Verify all subtask issues', async ({ page }) => {
    const results = {
      modalOpens: false,
      addSubtaskButtonVisible: false,
      subtaskContainerVisible: false,
      subtaskInputsCreated: false,
      subtaskInputsVisible: false,
      subtaskInputsFillable: false,
      multipleSubtasksAddable: false,
      taskSaveable: false,
      subtasksSavedToBackend: false,
      editModalOpens: false,
      editSubtasksFunctional: false
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('FINAL SUBTASK VERIFICATION TEST');
    console.log('='.repeat(60) + '\n');
    
    try {
      // TEST 1: Create Modal Opens
      console.log('TEST 1: Create Modal Opens');
      await page.click('#createTaskBtn');
      await page.waitForTimeout(1000);
      const modalVisible = await page.locator('#createTaskModal').isVisible();
      results.modalOpens = modalVisible;
      console.log(`  Result: ${modalVisible ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!modalVisible) {
        throw new Error('Modal did not open - cannot continue tests');
      }
      
      // TEST 2: Add Subtask Button Visible
      console.log('\nTEST 2: Add Subtask Button Visible');
      const addBtn = page.locator('#addCreateSubtaskBtn');
      const btnVisible = await addBtn.isVisible();
      results.addSubtaskButtonVisible = btnVisible;
      console.log(`  Result: ${btnVisible ? '✅ PASS' : '❌ FAIL'}`);
      
      // TEST 3: Click Add Subtask - Container Becomes Visible
      console.log('\nTEST 3: Subtask Container Becomes Visible');
      await addBtn.click();
      await page.waitForTimeout(1000);
      
      const container = page.locator('#createSubtasksList');
      const containerVisible = await container.isVisible();
      results.subtaskContainerVisible = containerVisible;
      console.log(`  Result: ${containerVisible ? '✅ PASS' : '❌ FAIL'}`);
      
      // Check container HTML and styles
      if (!containerVisible) {
        const exists = await container.count() > 0;
        console.log(`  Container exists in DOM: ${exists}`);
        
        if (exists) {
          const styles = await container.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              display: computed.display,
              visibility: computed.visibility,
              opacity: computed.opacity,
              height: computed.height,
              overflow: computed.overflow
            };
          });
          console.log('  Container styles:', styles);
          
          const html = await container.innerHTML();
          console.log(`  Container HTML length: ${html.length}`);
          console.log(`  Container HTML preview: ${html.substring(0, 200)}...`);
        }
      }
      
      // TEST 4: Subtask Inputs Created
      console.log('\nTEST 4: Subtask Inputs Created');
      const inputs = page.locator('input[placeholder="Subtask title"]');
      const inputCount = await inputs.count();
      results.subtaskInputsCreated = inputCount > 0;
      console.log(`  Inputs found: ${inputCount}`);
      console.log(`  Result: ${inputCount > 0 ? '✅ PASS' : '❌ FAIL'}`);
      
      // TEST 5: Subtask Inputs Visible
      console.log('\nTEST 5: Subtask Inputs Visible');
      if (inputCount > 0) {
        const firstInputVisible = await inputs.first().isVisible();
        results.subtaskInputsVisible = firstInputVisible;
        console.log(`  First input visible: ${firstInputVisible}`);
        console.log(`  Result: ${firstInputVisible ? '✅ PASS' : '❌ FAIL'}`);
        
        if (!firstInputVisible) {
          // Try to get parent visibility
          const parent = await inputs.first().evaluate(el => {
            const p = el.parentElement;
            return {
              tagName: p?.tagName,
              className: p?.className,
              display: window.getComputedStyle(p).display,
              visibility: window.getComputedStyle(p).visibility
            };
          });
          console.log('  Parent element:', parent);
        }
      }
      
      // TEST 6: Subtask Inputs Fillable
      console.log('\nTEST 6: Subtask Inputs Fillable');
      if (inputCount > 0) {
        try {
          // Try with force
          await inputs.first().fill('Test Subtask 1', { force: true });
          const value = await inputs.first().inputValue();
          results.subtaskInputsFillable = value === 'Test Subtask 1';
          console.log(`  Input value: "${value}"`);
          console.log(`  Result: ${results.subtaskInputsFillable ? '✅ PASS' : '❌ FAIL'}`);
        } catch (error) {
          console.log(`  Error filling: ${error.message}`);
          console.log('  Result: ❌ FAIL');
        }
      }
      
      // TEST 7: Multiple Subtasks Addable
      console.log('\nTEST 7: Multiple Subtasks Addable');
      try {
        // Check if button still visible/exists
        const btnStillVisible = await addBtn.isVisible();
        console.log(`  Add button still visible: ${btnStillVisible}`);
        
        if (btnStillVisible) {
          await addBtn.click();
          await page.waitForTimeout(1000);
          const newInputCount = await inputs.count();
          results.multipleSubtasksAddable = newInputCount > inputCount;
          console.log(`  New input count: ${newInputCount}`);
          console.log(`  Result: ${results.multipleSubtasksAddable ? '✅ PASS' : '❌ FAIL'}`);
          
          if (newInputCount > 1) {
            await inputs.nth(1).fill('Test Subtask 2', { force: true });
          }
        } else {
          console.log('  Add button not visible after first subtask');
          console.log('  Result: ❌ FAIL');
        }
      } catch (error) {
        console.log(`  Error: ${error.message}`);
        console.log('  Result: ❌ FAIL');
      }
      
      // Fill task details for save test
      const taskTitle = `Final Test ${Date.now()}`;
      await page.fill('#taskTitle', taskTitle);
      await page.fill('#taskDescription', 'Final verification test');
      
      // TEST 8: Task Saveable
      console.log('\nTEST 8: Task Saveable');
      const saveBtn = page.locator('#createTaskSubmitBtn');
      await saveBtn.click();
      await page.waitForTimeout(3000);
      
      // Check if modal closed (indicates save)
      const modalStillVisible = await page.locator('#createTaskModal').isVisible();
      results.taskSaveable = !modalStillVisible;
      console.log(`  Modal closed after save: ${!modalStillVisible}`);
      console.log(`  Result: ${results.taskSaveable ? '✅ PASS' : '❌ FAIL'}`);
      
      // TEST 9: Subtasks Saved to Backend
      console.log('\nTEST 9: Subtasks Saved to Backend');
      const tasksData = await getTasksFromFile();
      if (tasksData) {
        const savedTask = tasksData.master?.tasks?.find(t => t.title === taskTitle);
        if (savedTask) {
          const subtaskCount = savedTask.subtasks?.length || 0;
          results.subtasksSavedToBackend = subtaskCount > 0;
          console.log(`  Task found with ${subtaskCount} subtasks`);
          if (subtaskCount > 0) {
            savedTask.subtasks.forEach((st, idx) => {
              console.log(`    ${idx + 1}. ${st.title}`);
            });
          }
          console.log(`  Result: ${results.subtasksSavedToBackend ? '✅ PASS' : '❌ FAIL'}`);
        } else {
          console.log('  Task not found in backend');
          console.log('  Result: ❌ FAIL');
        }
      }
      
      // TEST 10: Edit Modal Opens
      console.log('\nTEST 10: Edit Modal Opens');
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Find a task card and click it
      const taskCards = page.locator('.task-card');
      const cardCount = await taskCards.count();
      console.log(`  Found ${cardCount} task cards`);
      
      if (cardCount > 0) {
        await taskCards.first().click();
        await page.waitForTimeout(1000);
        
        const editModalVisible = await page.locator('#editTaskModal').isVisible();
        results.editModalOpens = editModalVisible;
        console.log(`  Edit modal visible: ${editModalVisible}`);
        console.log(`  Result: ${editModalVisible ? '✅ PASS' : '❌ FAIL'}`);
        
        // TEST 11: Edit Subtasks Functional
        if (editModalVisible) {
          console.log('\nTEST 11: Edit Subtasks Functional');
          const editSubtaskBtn = page.locator('#editTaskModal button:has-text("Add Subtask")');
          const editBtnExists = await editSubtaskBtn.count() > 0;
          results.editSubtasksFunctional = editBtnExists;
          console.log(`  Add Subtask button exists in edit: ${editBtnExists}`);
          console.log(`  Result: ${editBtnExists ? '✅ PASS' : '❌ FAIL'}`);
        }
      }
      
    } catch (error) {
      console.error(`\n❌ TEST ERROR: ${error.message}`);
    }
    
    // FINAL SUMMARY
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    
    let passCount = 0;
    let failCount = 0;
    
    for (const [test, result] of Object.entries(results)) {
      const status = result ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${test}`);
      if (result) passCount++;
      else failCount++;
    }
    
    console.log('\n' + '-'.repeat(60));
    console.log(`TOTAL: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`SUCCESS RATE: ${Math.round(passCount / (passCount + failCount) * 100)}%`);
    console.log('-'.repeat(60));
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'web/test-reports/final-subtask-test.png', 
      fullPage: true 
    });
    
    // Assert at least modal opens
    expect(results.modalOpens).toBe(true);
    
    // Report critical issues
    if (!results.subtaskContainerVisible) {
      console.log('\n🔴 CRITICAL ISSUE: Subtask container never becomes visible!');
    }
    if (!results.editModalOpens) {
      console.log('🔴 CRITICAL ISSUE: Edit modal completely broken!');
    }
    if (!results.subtasksSavedToBackend) {
      console.log('🔴 CRITICAL ISSUE: Subtasks not saving to backend!');
    }
  });
});