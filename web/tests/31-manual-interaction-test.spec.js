const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

test.describe('Manual Interaction Test', () => {
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

  test('Force Subtask Creation via JavaScript', async ({ page }) => {
    console.log('\n=== FORCE JAVASCRIPT INTERACTION ===');
    
    // Open modal
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal:not(.hidden)');
    console.log('✓ Modal opened');
    
    // Fill title directly via JavaScript
    await page.evaluate(() => {
      document.getElementById('taskTitle').value = 'JS Force Test ' + Date.now();
    });
    console.log('✓ Title set via JS');
    
    // Add subtask via JavaScript call
    await page.evaluate(() => {
      // Call the function directly
      addSubtaskToCreateForm();
    });
    await page.waitForTimeout(1000);
    console.log('✓ addSubtaskToCreateForm() called');
    
    // Check window.createSubtasks array
    const subtasks = await page.evaluate(() => {
      return window.createSubtasks || [];
    });
    console.log(`Subtasks in memory: ${subtasks.length}`);
    
    // Try to set subtask title via JavaScript
    const fillResult = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[placeholder="Subtask title"]');
      console.log('Found subtask inputs:', inputs.length);
      
      if (inputs.length > 0) {
        inputs[0].value = 'JS Force Subtask';
        // Trigger input event
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        return {
          success: true,
          count: inputs.length,
          value: inputs[0].value,
          visible: inputs[0].offsetParent !== null
        };
      }
      return { success: false, count: 0 };
    });
    
    console.log('Fill result:', fillResult);
    
    // Add second subtask
    await page.evaluate(() => {
      addSubtaskToCreateForm();
    });
    await page.waitForTimeout(500);
    
    // Check subtask count
    const finalSubtasks = await page.evaluate(() => {
      return {
        memoryCount: window.createSubtasks.length,
        inputCount: document.querySelectorAll('input[placeholder="Subtask title"]').length
      };
    });
    
    console.log('Final state:', finalSubtasks);
    
    // Fill second subtask
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[placeholder="Subtask title"]');
      if (inputs.length > 1) {
        inputs[1].value = 'JS Force Subtask 2';
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    
    // Create task via form submission
    const beforeSave = await getTasksFromFile();
    const taskCountBefore = beforeSave?.master?.tasks?.length || 0;
    console.log(`Tasks before save: ${taskCountBefore}`);
    
    // Submit form via JavaScript
    await page.evaluate(() => {
      const form = document.getElementById('addTaskForm');
      const event = new Event('submit');
      form.dispatchEvent(event);
    });
    
    await page.waitForTimeout(5000); // Wait longer for save
    
    // Check backend
    const afterSave = await getTasksFromFile();
    const taskCountAfter = afterSave?.master?.tasks?.length || 0;
    console.log(`Tasks after save: ${taskCountAfter}`);
    
    if (taskCountAfter > taskCountBefore) {
      const newTask = afterSave.master.tasks[afterSave.master.tasks.length - 1];
      console.log('New task created:');
      console.log(`  ID: ${newTask.id}`);
      console.log(`  Title: ${newTask.title}`);
      console.log(`  Subtasks: ${newTask.subtasks?.length || 0}`);
      
      if (newTask.subtasks?.length > 0) {
        newTask.subtasks.forEach((st, idx) => {
          console.log(`    ${idx + 1}. ${st.title}`);
        });
        console.log('🎉 SUCCESS: Subtasks were saved!');
      } else {
        console.log('❌ No subtasks saved');
      }
    } else {
      console.log('❌ No new task created');
    }
    
    await page.screenshot({ 
      path: 'web/test-reports/force-js-test.png', 
      fullPage: true 
    });
  });

  test('Test Edit Modal Opening', async ({ page }) => {
    console.log('\n=== TEST EDIT MODAL ===');
    
    // Wait for tasks to load
    await page.waitForTimeout(2000);
    
    // Try to find any task card
    const taskCards = await page.locator('.task-card').count();
    console.log(`Found ${taskCards} task cards`);
    
    if (taskCards > 0) {
      // Get task ID from first card
      const taskInfo = await page.evaluate(() => {
        const card = document.querySelector('.task-card');
        const onclick = card?.getAttribute('onclick');
        const idMatch = onclick?.match(/openEditModal\((\d+)\)/);
        return {
          onclick: onclick,
          id: idMatch ? idMatch[1] : null
        };
      });
      
      console.log('Task card onclick:', taskInfo.onclick);
      console.log('Extracted ID:', taskInfo.id);
      
      // Try calling openEditModal directly
      if (taskInfo.id) {
        await page.evaluate((taskId) => {
          console.log('Calling openEditModal with ID:', taskId);
          openEditModal(parseInt(taskId));
        }, taskInfo.id);
        
        await page.waitForTimeout(1000);
        
        // Check if modal is now visible
        const modalVisible = await page.locator('#editTaskModal').isVisible();
        console.log(`Edit modal visible after JS call: ${modalVisible}`);
        
        if (modalVisible) {
          console.log('🎉 Edit modal opened successfully!');
          
          // Check for subtask functionality
          const subtaskBtn = await page.locator('#editTaskModal button:has-text("Add Subtask")').count();
          console.log(`Add Subtask button in edit modal: ${subtaskBtn}`);
          
        } else {
          console.log('❌ Edit modal still not visible');
        }
      }
    }
    
    await page.screenshot({ 
      path: 'web/test-reports/edit-modal-test.png', 
      fullPage: true 
    });
  });
});