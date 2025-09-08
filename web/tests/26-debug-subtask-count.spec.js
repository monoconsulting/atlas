const { test, expect } = require('@playwright/test');

test.describe('Debug Subtask Count', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Debug why only 1 subtask is created instead of 2', async ({ page }) => {
    console.log('=== DEBUGGING SUBTASK COUNT ISSUE ===');
    
    // 1. Open create task modal
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Debug Count Task');
    
    // 2. Add first subtask
    console.log('Adding first subtask...');
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    
    // Check createSubtasks array after first addition
    const afterFirst = await page.evaluate(() => ({
      createSubtasks: window.createSubtasks,
      createSubtaskCounter: window.createSubtaskCounter
    }));
    console.log('After first subtask added:', afterFirst);
    
    // Fill first subtask
    const firstInput = page.locator('input[placeholder="Subtask title"]').first();
    await firstInput.fill('First Subtask Title');
    await page.waitForTimeout(200);
    
    // Check array after filling first
    const afterFirstFill = await page.evaluate(() => ({
      createSubtasks: window.createSubtasks
    }));
    console.log('After first subtask filled:', afterFirstFill);
    
    // 3. Add second subtask
    console.log('Adding second subtask...');
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    
    // Check createSubtasks array after second addition
    const afterSecond = await page.evaluate(() => ({
      createSubtasks: window.createSubtasks,
      createSubtaskCounter: window.createSubtaskCounter
    }));
    console.log('After second subtask added:', afterSecond);
    
    // Fill second subtask
    const secondInput = page.locator('input[placeholder="Subtask title"]').nth(1);
    await secondInput.fill('Second Subtask Title');
    await page.waitForTimeout(200);
    
    // Check final array state before submission
    const beforeSubmit = await page.evaluate(() => ({
      createSubtasks: window.createSubtasks,
      totalSubtasks: window.createSubtasks.length,
      subtasksWithTitles: window.createSubtasks.filter(st => st.title && st.title.trim()).length
    }));
    console.log('Before submit:', beforeSubmit);
    
    // 4. Check the DOM for subtask elements
    const subtaskElements = await page.locator('[data-create-subtask-id]').count();
    console.log('Subtask elements in DOM:', subtaskElements);
    
    // Get all subtask input values
    const inputValues = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[placeholder="Subtask title"]');
      return Array.from(inputs).map((input, index) => ({
        index: index,
        value: input.value,
        subtaskId: input.closest('[data-create-subtask-id]')?.getAttribute('data-create-subtask-id')
      }));
    });
    console.log('All input values:', inputValues);
    
    // 5. Check the rendered HTML
    const containerContent = await page.locator('#createSubtasksList').innerHTML();
    console.log('Container HTML length:', containerContent.length);
    
    // Count subtask divs
    const subtaskDivs = await page.locator('#createSubtasksList [data-create-subtask-id]').count();
    console.log('Subtask divs count:', subtaskDivs);
    
    // Don't submit, just take screenshot for analysis
    await page.screenshot({ path: 'web/test-reports/debug-subtask-count.png' });
  });
});