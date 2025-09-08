const { test, expect } = require('@playwright/test');

test.describe('Simple Input Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Simple test - verify oninput events work', async ({ page }) => {
    console.log('=== SIMPLE INPUT TEST ===');
    
    // 1. Open modal, add task title, add one subtask
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Simple Input Test');
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    
    // 2. Check initial array state
    const initial = await page.evaluate(() => window.createSubtasks);
    console.log('Initial createSubtasks:', initial);
    
    // 3. Type in the subtask title input using type() instead of fill()
    const subtaskInput = page.locator('input[placeholder="Subtask title"]').first();
    
    // Clear and type character by character
    await subtaskInput.click();
    await subtaskInput.fill(''); // Clear first
    await page.waitForTimeout(100);
    
    // Type 'Test' character by character
    await subtaskInput.type('T');
    await page.waitForTimeout(200);
    let state = await page.evaluate(() => window.createSubtasks[0]);
    console.log('After "T":', state.title);
    
    await subtaskInput.type('e');
    await page.waitForTimeout(200);
    state = await page.evaluate(() => window.createSubtasks[0]);
    console.log('After "Te":', state.title);
    
    await subtaskInput.type('s');
    await page.waitForTimeout(200);
    state = await page.evaluate(() => window.createSubtasks[0]);
    console.log('After "Tes":', state.title);
    
    await subtaskInput.type('t');
    await page.waitForTimeout(200);
    const finalState = await page.evaluate(() => window.createSubtasks[0]);
    console.log('After "Test":', finalState.title);
    
    // 4. Check if the title was updated correctly
    if (finalState.title === 'Test') {
      console.log('✅ SUCCESS: oninput events are working correctly!');
    } else {
      console.log('❌ FAILED: oninput events are not updating the array');
      console.log('Expected: "Test", Got:', finalState.title);
    }
    
    // 5. Take screenshot
    await page.screenshot({ path: 'web/test-reports/simple-input-test.png' });
  });
});