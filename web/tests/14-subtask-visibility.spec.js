const { test, expect } = require('@playwright/test');

test.describe('Subtask Visibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Basic Modal Test', async ({ page }) => {
    console.log('Testing if create button exists...');
    const createBtn = await page.locator('#createTaskBtn');
    await expect(createBtn).toBeVisible();
    console.log('Create button is visible');
    
    // Click the button
    await createBtn.click();
    console.log('Clicked create button');
    
    // Wait for modal to appear
    await page.waitForTimeout(1000);
    
    // Check if modal is visible
    const modal = await page.locator('#createTaskModal');
    await expect(modal).toBeVisible();
    console.log('Modal is visible');
  });

  test('Add Task modal subtask functionality', async ({ page }) => {
    // Open Add Task modal
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal', { state: 'visible' });
    
    // Check modal dimensions before proceeding
    const modalInfo = await page.evaluate(() => {
      const modal = document.getElementById('createTaskModal');
      const modalContent = modal.querySelector('.bg-slate-950');
      return {
        modalClasses: modal.className,
        modalRect: modal.getBoundingClientRect(),
        contentRect: modalContent ? modalContent.getBoundingClientRect() : null,
        modalDisplay: window.getComputedStyle(modal).display
      };
    });
    console.log('Modal info:', modalInfo);
    
    // Fill required fields
    await page.fill('#taskTitle', 'Test Task with Subtasks');
    
    console.log('Before clicking Add Subtask button...');
    
    // Check if Add Subtask button exists
    const addSubtaskBtn = await page.locator('#addCreateSubtaskBtn');
    await expect(addSubtaskBtn).toBeVisible();
    console.log('Add Subtask button is visible');
    
    // Check initial state of container
    const subtaskContainer = await page.locator('#createSubtasksList');
    const initialText = await subtaskContainer.textContent();
    console.log('Initial container text:', initialText);
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
    
    // Click Add Subtask button
    await addSubtaskBtn.click();
    console.log('Clicked Add Subtask button');
    
    // Wait a moment for the subtask to be added
    await page.waitForTimeout(1000);
    
    // Check for JavaScript errors
    const hasErrors = await page.evaluate(() => {
      return window.onerror ? 'JavaScript errors detected' : 'No JS errors';
    });
    console.log('JavaScript error status:', hasErrors);
    
    // Check if subtask form was rendered
    const updatedText = await subtaskContainer.textContent();
    console.log('Updated container text:', updatedText);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-subtask-visibility.png' });
    
    // Look for subtask input fields using multiple selectors
    const subtaskInputs = await page.locator('#createSubtasksList input');
    const inputCount = await subtaskInputs.count();
    console.log('Number of input fields found:', inputCount);
    
    // Check if container is actually hidden due to CSS
    const containerStyles = await page.evaluate(() => {
      const elem = document.getElementById('createSubtasksList');
      const computedStyle = window.getComputedStyle(elem);
      return {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        height: computedStyle.height,
        overflow: computedStyle.overflow
      };
    });
    console.log('Container computed styles:', containerStyles);
    
    // Check for inputs with placeholder "Subtask title"
    const titleInputs = await page.locator('input[placeholder="Subtask title"]');
    const titleInputCount = await titleInputs.count();
    console.log('Title inputs found:', titleInputCount);
    
    if (titleInputCount > 0) {
      const firstTitleInput = titleInputs.first();
      const inputStyles = await page.evaluate((elem) => {
        const computedStyle = window.getComputedStyle(elem);
        return {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity
        };
      }, await firstTitleInput.elementHandle());
      console.log('Input computed styles:', inputStyles);
      
      // Check element position and viewport
      const elementInfo = await page.evaluate((elem) => {
        const rect = elem.getBoundingClientRect();
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        const modal = document.getElementById('createTaskModal');
        const modalRect = modal ? modal.getBoundingClientRect() : null;
        return {
          elementRect: rect,
          viewport,
          modalRect,
          isInViewport: rect.top >= 0 && rect.left >= 0 && 
                       rect.bottom <= viewport.height && rect.right <= viewport.width
        };
      }, await firstTitleInput.elementHandle());
      console.log('Element positioning info:', elementInfo);
      
      // Try to fill it directly first
      try {
        await firstTitleInput.fill('First Subtask');
        console.log('Successfully filled subtask title');
      } catch (error) {
        console.log('Cannot fill subtask title:', error.message);
      }
    }
  });

  test('Edit Task modal subtask functionality', async ({ page }) => {
    // First create a task to edit
    await page.click('#createTaskBtn');
    await page.waitForSelector('#createTaskModal', { state: 'visible' });
    await page.fill('#taskTitle', 'Task to Edit');
    await page.click('form[id="addTaskForm"] button[type="submit"]');
    await page.waitForSelector('#createTaskModal', { state: 'hidden' });
    
    // Wait for task to be created and loaded
    await page.waitForTimeout(1000);
    
    // Click on the created task to edit it
    const taskCard = page.locator('[data-task-id]').first();
    await taskCard.click();
    
    // Wait for edit modal
    await page.waitForSelector('#editModal', { state: 'visible' });
    
    // Click Add Subtask in edit modal
    await page.click('#addSubtaskBtn');
    
    // Modal should NOT close - check if still visible
    await page.waitForTimeout(500);
    await expect(page.locator('#editModal')).toBeVisible();
    
    console.log('Edit modal test completed');
  });
});