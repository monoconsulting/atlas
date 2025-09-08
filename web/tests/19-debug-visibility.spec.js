const { test, expect } = require('@playwright/test');

test.describe('Debug Subtask Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Debug exact visibility issue', async ({ page }) => {
    // Listen for console errors
    const consoleMessages = [];
    const jsErrors = [];
    
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    // Open modal
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Test Task');
    
    console.log('=== BEFORE ADDING SUBTASK ===');
    
    // Take screenshot before adding subtask
    await page.screenshot({ path: 'web/test-reports/before-subtask.png' });
    
    // Get initial container state
    const containerBefore = await page.evaluate(() => {
      const container = document.getElementById('createSubtasksList');
      return {
        innerHTML: container.innerHTML,
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight,
        offsetWidth: container.offsetWidth,
        offsetHeight: container.offsetHeight,
        scrollHeight: container.scrollHeight,
        boundingRect: container.getBoundingClientRect()
      };
    });
    
    console.log('Container before:', containerBefore);
    
    // Click Add Subtask
    await page.click('#addCreateSubtaskBtn');
    await page.waitForTimeout(1000);
    
    console.log('=== AFTER ADDING SUBTASK ===');
    
    // Take screenshot after adding subtask
    await page.screenshot({ path: 'web/test-reports/after-subtask.png' });
    
    // Get container state after subtask addition
    const containerAfter = await page.evaluate(() => {
      const container = document.getElementById('createSubtasksList');
      const inputs = container.querySelectorAll('input[placeholder="Subtask title"]');
      
      const inputsInfo = Array.from(inputs).map(input => {
        const rect = input.getBoundingClientRect();
        const computed = window.getComputedStyle(input);
        return {
          value: input.value,
          placeholder: input.placeholder,
          rect: rect,
          computed: {
            display: computed.display,
            visibility: computed.visibility,
            opacity: computed.opacity,
            width: computed.width,
            height: computed.height,
            position: computed.position,
            zIndex: computed.zIndex
          },
          offsetParent: input.offsetParent ? input.offsetParent.tagName : null,
          clientRect: {
            width: input.clientWidth,
            height: input.clientHeight,
            offsetWidth: input.offsetWidth,
            offsetHeight: input.offsetHeight
          }
        };
      });
      
      return {
        innerHTML: container.innerHTML.substring(0, 500) + '...',
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight,
        offsetWidth: container.offsetWidth,
        offsetHeight: container.offsetHeight,
        scrollHeight: container.scrollHeight,
        boundingRect: container.getBoundingClientRect(),
        inputsCount: inputs.length,
        inputsInfo: inputsInfo
      };
    });
    
    console.log('Container after:', containerAfter);
    
    // Check if modal itself has proper dimensions
    const modalInfo = await page.evaluate(() => {
      const modal = document.getElementById('createTaskModal');
      const modalContent = modal.querySelector('.bg-slate-950');
      
      return {
        modal: {
          rect: modal.getBoundingClientRect(),
          computed: {
            display: window.getComputedStyle(modal).display,
            position: window.getComputedStyle(modal).position
          }
        },
        content: modalContent ? {
          rect: modalContent.getBoundingClientRect(),
          computed: {
            maxHeight: window.getComputedStyle(modalContent).maxHeight,
            overflow: window.getComputedStyle(modalContent).overflow
          }
        } : null
      };
    });
    
    console.log('Modal info:', modalInfo);
    
    // Check if we can scroll to the input
    if (containerAfter.inputsCount > 0) {
      console.log('=== TESTING SCROLL INTO VIEW ===');
      
      const input = page.locator('input[placeholder="Subtask title"]').first();
      
      // Get viewport info
      const viewport = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      }));
      console.log('Viewport:', viewport);
      
      // Try scrolling the input into view manually
      await page.evaluate(() => {
        const input = document.querySelector('input[placeholder="Subtask title"]');
        if (input) {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Check position after scroll
      const inputAfterScroll = await page.evaluate(() => {
        const input = document.querySelector('input[placeholder="Subtask title"]');
        if (input) {
          return {
            rect: input.getBoundingClientRect(),
            isConnected: input.isConnected,
            parentElement: input.parentElement ? input.parentElement.tagName : null
          };
        }
        return null;
      });
      
      console.log('Input after scroll:', inputAfterScroll);
      
      // Final screenshot
      await page.screenshot({ path: 'web/test-reports/after-scroll.png' });
      
      // Try filling WITHOUT force to see exact error
      try {
        await input.fill('Test Subtask');
        console.log('✅ SUCCESS: Input is actually visible and fillable!');
      } catch (error) {
        console.log('❌ FAILED: Input still not fillable:', error.message);
      }
    }
    
    // Log all console messages and JS errors
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => console.log(msg));
    
    console.log('\n=== JAVASCRIPT ERRORS ===');
    jsErrors.forEach(error => console.log('JS ERROR:', error));
  });
});