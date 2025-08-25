const { test, expect } = require('@playwright/test');

test.describe('Debug Function', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Debug if updateCreateSubtask function exists and works', async ({ page }) => {
    console.log('=== DEBUGGING UPDATECREATESUBTASK FUNCTION ===');
    
    // 1. Check if function exists
    const functionExists = await page.evaluate(() => {
      return {
        updateCreateSubtask: typeof window.updateCreateSubtask,
        createSubtasks: typeof window.createSubtasks,
        hasCreateSubtasks: Array.isArray(window.createSubtasks)
      };
    });
    console.log('Function availability:', functionExists);
    
    // 2. Create a subtask and check the generated HTML
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Debug Function Test');
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    
    // 3. Get the actual HTML of the generated input
    const inputHTML = await page.locator('input[placeholder="Subtask title"]').first().innerHTML();
    console.log('Input inner HTML:', inputHTML);
    
    const inputOuterHTML = await page.locator('input[placeholder="Subtask title"]').first().evaluate(el => el.outerHTML);
    console.log('Input outer HTML:', inputOuterHTML);
    
    // 4. Try to manually call the function
    const manualCall = await page.evaluate(() => {
      try {
        // Set up initial state
        if (!window.createSubtasks) {
          return { error: 'createSubtasks array not found' };
        }
        
        console.log('Before manual call:', window.createSubtasks[0]);
        
        // Call the function manually
        window.updateCreateSubtask(1, 'title', 'Manual Call Test');
        
        console.log('After manual call:', window.createSubtasks[0]);
        
        return {
          success: true,
          before: window.createSubtasks[0],
          functionType: typeof window.updateCreateSubtask
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('Manual function call result:', manualCall);
    
    // 5. Try to trigger the input event manually
    const manualEvent = await page.evaluate(() => {
      try {
        const input = document.querySelector('input[placeholder="Subtask title"]');
        if (!input) return { error: 'Input not found' };
        
        input.value = 'Manual Event Test';
        
        // Try different event types
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        
        input.dispatchEvent(inputEvent);
        input.dispatchEvent(changeEvent);
        
        return { 
          success: true,
          inputValue: input.value,
          hasOninput: input.oninput ? true : false,
          oninputCode: input.oninput ? input.oninput.toString() : 'none'
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('Manual event trigger result:', manualEvent);
    
    // 6. Check final state
    const finalState = await page.evaluate(() => window.createSubtasks[0]);
    console.log('Final state:', finalState);
    
    await page.screenshot({ path: 'web/test-reports/debug-function.png' });
  });
});