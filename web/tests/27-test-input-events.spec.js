const { test, expect } = require('@playwright/test');

test.describe('Test Input Events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Test exactly what happens when typing in second subtask field', async ({ page }) => {
    console.log('=== TESTING INPUT EVENTS ===');
    
    // Listen for console messages to see if updateCreateSubtask is called
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    // 1. Open modal and add two subtasks
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Input Event Test');
    
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(300);
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(300);
    
    // 2. Get the exact input elements
    const firstInput = page.locator('[data-create-subtask-id="1"] input[placeholder="Subtask title"]');
    const secondInput = page.locator('[data-create-subtask-id="2"] input[placeholder="Subtask title"]');
    
    console.log('About to fill first input...');
    
    // 3. Fill first input and check the array
    await firstInput.fill('First Title');
    await page.waitForTimeout(200);
    
    const afterFirst = await page.evaluate(() => window.createSubtasks);
    console.log('After first input filled:', JSON.stringify(afterFirst, null, 2));
    
    console.log('About to fill second input...');
    
    // 4. Fill second input character by character to see when it updates
    await secondInput.click();
    await secondInput.fill('');
    await page.waitForTimeout(100);
    
    // Type each character and check the array
    const testText = 'Second';
    for (let i = 0; i < testText.length; i++) {
      await secondInput.type(testText[i]);
      await page.waitForTimeout(100);
      
      const currentState = await page.evaluate(() => ({
        char: '${testText.substring(0, i+1)}',
        createSubtasks: window.createSubtasks
      }));
      
      console.log(`After typing '${testText.substring(0, i+1)}':`, 
        currentState.createSubtasks.map(st => ({ id: st.id, title: st.title })));
    }
    
    // 5. Final check
    const finalState = await page.evaluate(() => window.createSubtasks);
    console.log('Final state:', JSON.stringify(finalState, null, 2));
    
    // 6. Check console messages
    console.log('\\nConsole messages:');
    consoleMessages.forEach(msg => console.log('  -', msg));
    
    // 7. Manually trigger the update function
    console.log('\\nManually calling updateCreateSubtask...');
    await page.evaluate(() => {
      window.updateCreateSubtask(2, 'title', 'Manual Update');
    });
    
    const afterManualUpdate = await page.evaluate(() => window.createSubtasks);
    console.log('After manual update:', JSON.stringify(afterManualUpdate, null, 2));
    
    await page.screenshot({ path: 'web/test-reports/test-input-events.png' });
  });
});