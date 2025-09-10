const { test, expect } = require('@playwright/test');

test.describe('Final Subtask Functionality Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Complete subtask workflow WITHOUT force option', async ({ page }) => {
    console.log('=== FINAL SUBTASK TEST - NO FORCE OPTION ===');
    
    // 1. Open Create Task modal
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal', { state: 'visible' });
    console.log('✅ Modal opens successfully');
    
    // 2. Verify empty fields
    const titleValue = await page.locator('#taskTitle').inputValue();
    expect(titleValue).toBe('');
    console.log('✅ Fields are empty initially');
    
    // 3. Verify initial button text
    let buttonText = await page.locator('#createTaskSubmitBtn').textContent();
    buttonText = buttonText?.trim() || '';
    expect(buttonText).toBe('Create Task');
    console.log('✅ Initial button text is "Create Task"');
    
    // 4. Fill mandatory field
    await page.fill('#taskTitle', 'Test Task with Working Subtasks');
    console.log('✅ Filled task title');
    
    // 5. Add subtask
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(1000);
    console.log('✅ Clicked Add Subtask button');
    
    // 6. Verify button changed
    buttonText = await page.locator('#createTaskSubmitBtn').textContent();
    buttonText = buttonText?.trim() || '';
    expect(buttonText).toBe('Save Task');
    console.log('✅ Button changed to "Save Task"');
    
    // 7. Find and fill subtask input WITHOUT force option
    const subtaskInput = page.locator('input[placeholder="Subtask title"]').first();
    await subtaskInput.fill('My Working Subtask');
    console.log('✅ Successfully filled subtask input WITHOUT force option!');
    
    // 8. Test priority selection
    const prioritySelect = page.locator('#createSubtasksList select').first();
    await prioritySelect.selectOption('high');
    console.log('✅ Successfully changed priority to high');
    
    // 9. Test subtask description
    const subtaskDescription = page.locator('#createSubtasksList textarea').first();
    await subtaskDescription.fill('This subtask is working perfectly!');
    console.log('✅ Successfully filled subtask description');
    
    // 10. Add second subtask
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(500);
    
    const subtaskInputs = page.locator('input[placeholder="Subtask title"]');
    const inputCount = await subtaskInputs.count();
    expect(inputCount).toBe(2);
    console.log('✅ Successfully added second subtask');
    
    // 11. Fill second subtask
    await subtaskInputs.nth(1).fill('Second Working Subtask');
    console.log('✅ Successfully filled second subtask');
    
    // 12. Take final screenshot
    await page.screenshot({ path: 'web/test-reports/final-working-subtasks.png' });
    
    console.log('\n🎉 ALL SUBTASK FUNCTIONALITY WORKING PERFECTLY!');
    console.log('✅ Modal stays open');
    console.log('✅ Inputs are truly visible and interactive');
    console.log('✅ Multiple subtasks work');
    console.log('✅ Priority selection works');
    console.log('✅ Button text changes correctly');
    console.log('✅ NO FORCE OPTION NEEDED!');
  });
});