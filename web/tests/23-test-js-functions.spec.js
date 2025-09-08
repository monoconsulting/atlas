const { test, expect } = require('@playwright/test');

test.describe('Test JavaScript Functions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Test if addSubtaskToCreateForm function works', async ({ page }) => {
    console.log('=== TESTING JAVASCRIPT FUNCTIONS ===');
    
    // Listen for console messages and errors
    const consoleMessages = [];
    const jsErrors = [];
    
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    // 1. Open modal
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'JS Test Task');
    
    // 2. Check initial state
    const initialState = await page.evaluate(() => {
      return {
        createSubtasks: window.createSubtasks,
        createSubtaskCounter: window.createSubtaskCounter,
        functionsExist: {
          addSubtaskToCreateForm: typeof window.addSubtaskToCreateForm,
          updateCreateSubtask: typeof window.updateCreateSubtask,
          renderCreateSubtasks: typeof window.renderCreateSubtasks
        }
      };
    });
    console.log('Initial state:', initialState);
    
    // 3. Manually call addSubtaskToCreateForm from JavaScript
    console.log('Manually calling addSubtaskToCreateForm...');
    const afterManualCall = await page.evaluate(() => {
      try {
        window.addSubtaskToCreateForm();
        return {
          success: true,
          createSubtasks: window.createSubtasks,
          createSubtaskCounter: window.createSubtaskCounter
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          createSubtasks: window.createSubtasks,
          createSubtaskCounter: window.createSubtaskCounter
        };
      }
    });
    console.log('After manual call:', afterManualCall);
    
    // 4. Check if the HTML was updated
    await page.waitForTimeout(500);
    const containerContent = await page.locator('#createSubtasksList').textContent();
    console.log('Container content after manual call:', containerContent);
    
    // 5. Now test clicking the button
    console.log('Testing button click...');
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    
    const afterButtonClick = await page.evaluate(() => {
      return {
        createSubtasks: window.createSubtasks,
        createSubtaskCounter: window.createSubtaskCounter
      };
    });
    console.log('After button click:', afterButtonClick);
    
    const containerContentAfterClick = await page.locator('#createSubtasksList').textContent();
    console.log('Container content after button click:', containerContentAfterClick);
    
    // 6. Try to manually update a subtask
    if (afterButtonClick.createSubtasks.length > 0) {
      console.log('Testing updateCreateSubtask...');
      const afterUpdate = await page.evaluate(() => {
        try {
          window.updateCreateSubtask(1, 'title', 'Manual Test Title');
          return {
            success: true,
            createSubtasks: window.createSubtasks
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            createSubtasks: window.createSubtasks
          };
        }
      });
      console.log('After manual update:', afterUpdate);
    }
    
    // 7. Log all console messages and errors
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => console.log(msg));
    
    console.log('\n=== JAVASCRIPT ERRORS ===');
    jsErrors.forEach(error => console.log('JS ERROR:', error));
    
    // Take screenshot
    await page.screenshot({ path: 'web/test-reports/js-functions-test.png' });
  });
});