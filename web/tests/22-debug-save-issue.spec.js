const { test, expect } = require('@playwright/test');

test.describe('Debug Save Issue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Debug why task with subtask is not saving', async ({ page }) => {
    console.log('=== DEBUGGING SAVE ISSUE ===');
    
    // Listen for console messages and errors
    const consoleMessages = [];
    const jsErrors = [];
    
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    // Listen for network requests
    const networkActivity = [];
    page.on('request', request => {
      networkActivity.push({
        type: 'REQUEST',
        url: request.url(),
        method: request.method()
      });
    });
    
    page.on('response', response => {
      networkActivity.push({
        type: 'RESPONSE',
        url: response.url(),
        status: response.status()
      });
    });
    
    // 1. Open modal and fill form
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Debug Test Task');
    
    // 2. Add subtask
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    
    // 3. Check createSubtasks array in browser
    const beforeSubmit = await page.evaluate(() => {
      return {
        createSubtasks: window.createSubtasks || [],
        createSubtaskCounter: window.createSubtaskCounter || 0
      };
    });
    console.log('Before submit - createSubtasks array:', beforeSubmit);
    
    // 4. Fill subtask
    const subtaskInput = page.locator('input[placeholder="Subtask title"]').first();
    await subtaskInput.fill('Debug Subtask');
    await page.waitForTimeout(200);
    
    // 5. Check createSubtasks array after filling
    const afterFilling = await page.evaluate(() => {
      return {
        createSubtasks: window.createSubtasks || [],
        createSubtaskCounter: window.createSubtaskCounter || 0
      };
    });
    console.log('After filling - createSubtasks array:', afterFilling);
    
    // 6. Try to submit the form
    console.log('Attempting to submit form...');
    await page.click('#createTaskSubmitBtn');
    
    // 7. Wait a bit and check what happened
    await page.waitForTimeout(5000);
    
    // 8. Check if modal is still open
    const modalVisible = await page.locator('#createTaskModal').isVisible();
    console.log('Modal still visible after submit:', modalVisible);
    
    // 9. Log all console messages and errors
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => console.log(msg));
    
    console.log('\n=== JAVASCRIPT ERRORS ===');
    jsErrors.forEach(error => console.log('JS ERROR:', error));
    
    console.log('\n=== NETWORK ACTIVITY (last 10) ===');
    networkActivity.slice(-10).forEach(activity => {
      console.log(`${activity.type}: ${activity.method || ''} ${activity.url} ${activity.status || ''}`);
    });
    
    // 10. Check current createSubtasks state
    const finalState = await page.evaluate(() => {
      return {
        createSubtasks: window.createSubtasks || [],
        createSubtaskCounter: window.createSubtaskCounter || 0,
        formData: {
          title: document.getElementById('taskTitle')?.value,
          description: document.getElementById('taskDescription')?.value
        }
      };
    });
    console.log('Final state:', finalState);
    
    // 11. Take screenshot
    await page.screenshot({ path: 'web/test-reports/debug-save-issue.png' });
  });
});