const { test, expect } = require('@playwright/test');

test.describe('Simple Modal Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Can open modal and see subtask button', async ({ page }) => {
    console.log('Starting test...');
    
    // Click Create New Task button
    const createBtn = page.locator('#createTaskBtn');
    const btnExists = await createBtn.count() > 0;
    console.log(`Create button exists: ${btnExists}`);
    
    if (!btnExists) {
      // Try alternative selector
      const altBtn = page.locator('button:has-text("Create New Task")');
      const altExists = await altBtn.count() > 0;
      console.log(`Alternative button exists: ${altExists}`);
      
      if (altExists) {
        await altBtn.click();
      }
    } else {
      await createBtn.click();
    }
    
    // Wait for modal to appear
    await page.waitForTimeout(1000);
    
    // Check if modal is visible
    const modal = page.locator('#createTaskModal');
    const modalVisible = await modal.isVisible();
    console.log(`Modal visible: ${modalVisible}`);
    
    // If modal not visible, check if it exists in DOM
    const modalExists = await modal.count() > 0;
    console.log(`Modal exists in DOM: ${modalExists}`);
    
    // Check for subtask button
    const subtaskBtn = page.locator('#addCreateSubtaskBtn');
    const subtaskBtnExists = await subtaskBtn.count() > 0;
    const subtaskBtnVisible = subtaskBtnExists ? await subtaskBtn.isVisible() : false;
    
    console.log(`Subtask button exists: ${subtaskBtnExists}`);
    console.log(`Subtask button visible: ${subtaskBtnVisible}`);
    
    // Take screenshot for debugging
    await page.screenshot({ 
      path: 'web/test-reports/simple-modal-test.png', 
      fullPage: true 
    });
    
    // Try to get modal HTML if it exists
    if (modalExists) {
      const modalHTML = await modal.innerHTML();
      console.log(`Modal HTML length: ${modalHTML.length}`);
      
      // Check modal display style
      const displayStyle = await modal.evaluate(el => {
        return window.getComputedStyle(el).display;
      });
      console.log(`Modal display style: ${displayStyle}`);
      
      // Check modal visibility style
      const visibilityStyle = await modal.evaluate(el => {
        return window.getComputedStyle(el).visibility;
      });
      console.log(`Modal visibility style: ${visibilityStyle}`);
      
      // Check modal opacity
      const opacityStyle = await modal.evaluate(el => {
        return window.getComputedStyle(el).opacity;
      });
      console.log(`Modal opacity: ${opacityStyle}`);
    }
    
    // Check entire page HTML for modal content
    const pageContent = await page.content();
    const hasModalInPage = pageContent.includes('createTaskModal');
    console.log(`Page contains createTaskModal: ${hasModalInPage}`);
    
    // Try to find any element with "Add Subtask" text
    const anySubtaskElement = page.locator('*:has-text("Add Subtask")');
    const subtaskElementCount = await anySubtaskElement.count();
    console.log(`Elements with "Add Subtask" text: ${subtaskElementCount}`);
  });
});