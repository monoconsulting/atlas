const { test, expect } = require('@playwright/test');

test.describe('Check 422 Error Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8199');
    await page.waitForLoadState('networkidle');
  });

  test('Capture 422 error details', async ({ page }) => {
    console.log('=== CAPTURING 422 ERROR DETAILS ===');
    
    // Intercept network responses to get full error details
    const responses = [];
    page.on('response', async response => {
      if (response.url().includes('/task')) {
        try {
          const responseBody = await response.json();
          responses.push({
            url: response.url(),
            status: response.status(),
            body: responseBody
          });
        } catch (error) {
          console.log('Failed to parse response JSON:', error.message);
        }
      }
    });
    
    // 1. Try to submit a simple task first (without subtask) to see if basic validation works
    console.log('Testing basic task creation...');
    await page.click('#createTaskBtn');
    await page.fill('#taskTitle', 'Simple Test Task');
    await page.click('#createTaskSubmitBtn');
    await page.waitForTimeout(3000);
    
    if (responses.length > 0) {
      console.log('422 Error for basic task:', responses[0]);
    } else {
      console.log('Basic task creation worked - no 422 error');
      
      // If basic worked, now test with subtask
      console.log('\nTesting task with subtask...');
      await page.click('#createTaskBtn');
      await page.fill('#taskTitle', 'Task with Subtask');
      await page.click('#addCreateSubtaskBtn');
      await page.waitForTimeout(500);
      
      const subtaskInput = page.locator('input[placeholder="Subtask title"]').first();
      await subtaskInput.fill('Test Subtask');
      
      await page.click('#createTaskSubmitBtn');
      await page.waitForTimeout(3000);
    }
    
    // Log all responses
    console.log('\n=== ALL RESPONSES ===');
    responses.forEach((response, index) => {
      console.log(`Response ${index + 1}:`, {
        url: response.url,
        status: response.status,
        body: JSON.stringify(response.body, null, 2)
      });
    });
    
    // Also manually test the API to see what's expected
    console.log('\n=== MANUAL API TEST ===');
    const testTaskData = {
      title: 'Manual API Test',
      description: 'Testing via API',
      priority: 'medium',
      status: 'todo',
      due_date: null,
      assigned_to: null,
      dependencies: []
    };
    
    const apiResponse = await page.request.post('http://localhost:8199/task', {
      data: testTaskData
    });
    
    console.log('Manual API response status:', apiResponse.status());
    if (apiResponse.status() !== 200) {
      try {
        const errorBody = await apiResponse.json();
        console.log('Manual API error body:', errorBody);
      } catch (e) {
        const textBody = await apiResponse.text();
        console.log('Manual API error text:', textBody);
      }
    } else {
      const successBody = await apiResponse.json();
      console.log('Manual API success:', successBody);
    }
  });
});