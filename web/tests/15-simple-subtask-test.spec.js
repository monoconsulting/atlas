const { test, expect } = require('@playwright/test');

test.describe('Simple Subtask Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Simple Add Task with Subtask', async ({ page }) => {
    // Open modal
    await page.click('#createTaskBtn');
    
    // Check initial button text
    const submitBtn = page.locator('#createTaskSubmitBtn');
    let buttonText = await submitBtn.textContent();
    buttonText = buttonText?.trim() || '';
    console.log('Initial button text:', buttonText);
    expect(buttonText).toBe('Create Task');
    
    // Fill task title
    await page.fill('#taskTitle', 'Test Task');
    
    // Click Add Subtask
    await page.click('#addCreateSubtaskBtn');
    
    // Wait for subtask to appear
    await page.waitForTimeout(2000);
    
    // Check button text changed
    buttonText = await submitBtn.textContent();
    buttonText = buttonText?.trim() || '';
    console.log('Button text after adding subtask:', buttonText);
    expect(buttonText).toBe('Save Task');
    
    // Look for any input on the page that has placeholder "Subtask title"
    const inputs = await page.locator('input[placeholder="Subtask title"]');
    const count = await inputs.count();
    
    console.log(`Found ${count} subtask title inputs`);
    
    if (count > 0) {
      // Try to interact with it using force option
      try {
        await inputs.first().fill('My Subtask', { force: true });
        console.log('Successfully filled with force option');
      } catch (error) {
        console.log('Failed even with force:', error.message);
        
        // Try clicking first to focus, then type
        try {
          await inputs.first().click({ force: true });
          await page.keyboard.type('My Subtask');
          console.log('Successfully typed using keyboard');
        } catch (error2) {
          console.log('Failed with keyboard too:', error2.message);
        }
      }
    }
    
    // Add another subtask to test multiple subtasks
    await page.click('#addCreateSubtaskBtn', { force: true });
    await page.waitForTimeout(1000);
    
    // Button should still say Save Task
    buttonText = await submitBtn.textContent();
    buttonText = buttonText?.trim() || '';
    console.log('Button text after adding second subtask:', buttonText);
    expect(buttonText).toBe('Save Task');
    
    // Check we have 2 subtask inputs
    const inputCount = await inputs.count();
    console.log(`Now found ${inputCount} subtask inputs`);
    expect(inputCount).toBe(2);
    
    // Take screenshot
    await page.screenshot({ path: 'web/test-reports/simple-subtask-test.png' });
  });
});