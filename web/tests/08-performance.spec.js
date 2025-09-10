const { test, expect } = require('@playwright/test');

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load initial page quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for main elements to be visible
    await expect(page.locator('#createTaskBtn')).toBeVisible();
    await expect(page.locator('#todoColumn')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Page should load in reasonable time (under 5 seconds)
    expect(loadTime).toBeLessThan(5000);
    console.log(`Initial page load time: ${loadTime}ms`);
  });

  test('should handle large numbers of tasks efficiently', async ({ page }) => {
    // Create multiple tasks to test performance with larger datasets
    const taskCount = 20;
    const startTime = Date.now();
    
    for (let i = 0; i < taskCount; i++) {
      await page.evaluate(async (index) => {
        await fetch('/task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Performance Test Task ${index}`,
            description: `Testing performance with task number ${index}`,
            priority: index % 3 === 0 ? 'high' : index % 2 === 0 ? 'medium' : 'low',
            status: index % 3 === 0 ? 'todo' : index % 3 === 1 ? 'in-progress' : 'done'
          })
        });
      }, i);
    }
    
    // Reload to see all tasks
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const renderTime = Date.now() - startTime;
    
    // Should render many tasks in reasonable time
    expect(renderTime).toBeLessThan(10000);
    
    // All columns should be visible and responsive
    await expect(page.locator('#todoColumn')).toBeVisible();
    await expect(page.locator('#inProgressColumn')).toBeVisible();
    await expect(page.locator('#doneColumn')).toBeVisible();
    
    console.log(`Rendered ${taskCount} tasks in ${renderTime}ms`);
  });

  test('should filter tasks quickly', async ({ page }) => {
    // Test filter performance
    const filters = [
      { type: 'status', value: 'todo' },
      { type: 'priority', value: 'high' },
      { type: 'status', value: 'in-progress' },
      { type: 'priority', value: 'medium' }
    ];
    
    for (const filter of filters) {
      const startTime = Date.now();
      
      if (filter.type === 'status') {
        await page.selectOption('#filterStatus', filter.value);
      } else {
        await page.selectOption('#filterPriority', filter.value);
      }
      
      // Wait for filter to take effect
      await page.waitForTimeout(100);
      
      const filterTime = Date.now() - startTime;
      
      // Filter should apply quickly (under 500ms)
      expect(filterTime).toBeLessThan(500);
      
      console.log(`${filter.type}=${filter.value} filter applied in ${filterTime}ms`);
    }
    
    // Reset filters
    await page.selectOption('#filterStatus', '');
    await page.selectOption('#filterPriority', '');
  });

  test('should handle modal operations efficiently', async ({ page }) => {
    // Test modal open/close performance
    const iterations = 5;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      // Open modal
      await page.click('#createTaskBtn');
      await expect(page.locator('#createTaskModal')).toBeVisible();
      
      // Close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('#createTaskModal')).toHaveClass(/hidden/);
      
      const operationTime = Date.now() - startTime;
      times.push(operationTime);
    }
    
    const averageTime = times.reduce((a, b) => a + b) / times.length;
    
    // Modal operations should be fast (under 300ms average)
    expect(averageTime).toBeLessThan(300);
    
    console.log(`Average modal open/close time: ${averageTime.toFixed(1)}ms`);
  });

  test('should handle rapid task creation efficiently', async ({ page }) => {
    // Test creating multiple tasks in sequence
    const taskCount = 5;
    const startTime = Date.now();
    
    for (let i = 0; i < taskCount; i++) {
      await page.click('#createTaskBtn');
      await page.fill('#taskTitle', `Rapid Task ${i}`);
      await page.click('#createTaskModal button[type="submit"]');
      await page.waitForTimeout(500); // Brief wait between creations
    }
    
    const totalTime = Date.now() - startTime;
    const averageTimePerTask = totalTime / taskCount;
    
    // Should create tasks efficiently
    expect(averageTimePerTask).toBeLessThan(2000); // Under 2 seconds per task
    
    console.log(`Created ${taskCount} tasks in ${totalTime}ms (avg: ${averageTimePerTask.toFixed(1)}ms per task)`);
  });

  test('should handle task editing performance', async ({ page }) => {
    // Ensure we have a task to edit
    const taskCards = page.locator('.task-card');
    const count = await taskCards.count();
    
    if (count > 0) {
      const editTimes = [];
      const iterations = Math.min(3, count);
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        // Open edit modal
        await taskCards.nth(i).click();
        await expect(page.locator('#editModal')).toBeVisible();
        
        // Make a change
        await page.fill('#editTaskTitle', `Edited Task ${i} - ${Date.now()}`);
        
        // Save
        await page.click('#saveTask');
        await page.waitForTimeout(1000);
        
        const editTime = Date.now() - startTime;
        editTimes.push(editTime);
      }
      
      const averageEditTime = editTimes.reduce((a, b) => a + b) / editTimes.length;
      
      // Task editing should be reasonably fast
      expect(averageEditTime).toBeLessThan(3000); // Under 3 seconds
      
      console.log(`Average task edit time: ${averageEditTime.toFixed(1)}ms`);
    }
  });

  test('should handle complex filter combinations efficiently', async ({ page }) => {
    const startTime = Date.now();
    
    // Apply multiple filters in combination
    await page.selectOption('#filterStatus', 'todo');
    await page.selectOption('#filterPriority', 'high');
    await page.fill('#filterTag', 'test');
    
    // Apply advanced filters if available
    const statusCheckbox = page.locator('input[name="statusFilter"][value="todo"]');
    if (await statusCheckbox.isVisible()) {
      await statusCheckbox.check();
    }
    
    await page.waitForTimeout(200);
    
    const filterTime = Date.now() - startTime;
    
    // Complex filters should still apply quickly
    expect(filterTime).toBeLessThan(1000);
    
    // UI should remain responsive
    await expect(page.locator('#todoColumn')).toBeVisible();
    
    console.log(`Complex filter combination applied in ${filterTime}ms`);
    
    // Clear filters
    await page.click('#clearAllFilters');
  });

  test('should maintain performance during continuous use', async ({ page }) => {
    // Simulate continuous usage over time
    const operations = [
      () => page.click('#createTaskBtn'),
      () => page.keyboard.press('Escape'),
      () => page.selectOption('#filterStatus', 'todo'),
      () => page.selectOption('#filterStatus', ''),
      () => page.selectOption('#filterPriority', 'high'),
      () => page.selectOption('#filterPriority', '')
    ];
    
    const startTime = Date.now();
    const operationTimes = [];
    
    // Perform 20 random operations
    for (let i = 0; i < 20; i++) {
      const opStartTime = Date.now();
      
      const randomOperation = operations[Math.floor(Math.random() * operations.length)];
      await randomOperation();
      await page.waitForTimeout(100);
      
      const opTime = Date.now() - opStartTime;
      operationTimes.push(opTime);
    }
    
    const totalTime = Date.now() - startTime;
    const averageOpTime = operationTimes.reduce((a, b) => a + b) / operationTimes.length;
    
    // Operations should remain fast even after continuous use
    expect(averageOpTime).toBeLessThan(500);
    
    console.log(`Continuous usage: ${totalTime}ms total, ${averageOpTime.toFixed(1)}ms average per operation`);
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    // Test for memory leaks by performing repetitive operations
    const initialMetrics = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });
    
    // Perform many operations that could cause memory leaks
    for (let i = 0; i < 10; i++) {
      // Open/close modals
      await page.click('#createTaskBtn');
      await page.keyboard.press('Escape');
      
      // Apply/remove filters
      await page.selectOption('#filterStatus', 'todo');
      await page.selectOption('#filterStatus', '');
      
      // Trigger DOM updates
      await page.hover('#todoColumn');
      await page.hover('#inProgressColumn');
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });
    
    const finalMetrics = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });
    
    if (initialMetrics && finalMetrics) {
      const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
      const increasePercentage = (memoryIncrease / initialMetrics.usedJSHeapSize) * 100;
      
      // Memory usage shouldn't increase dramatically (allow up to 50% increase)
      expect(increasePercentage).toBeLessThan(50);
      
      console.log(`Memory usage increased by ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${increasePercentage.toFixed(1)}%)`);
    }
  });

  test('should handle network latency gracefully', async ({ page }) => {
    // Simulate various network conditions
    const latencies = [100, 500, 1000]; // ms
    
    for (const latency of latencies) {
      await page.route('**/tasks', async (route) => {
        await new Promise(resolve => setTimeout(resolve, latency));
        route.continue();
      });
      
      const startTime = Date.now();
      
      // Reload to trigger API call
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should handle latency gracefully (within reasonable bounds)
      expect(loadTime).toBeGreaterThan(latency);
      expect(loadTime).toBeLessThan(latency + 3000); // Allow 3s overhead
      
      // UI should still work properly
      await expect(page.locator('#createTaskBtn')).toBeVisible();
      
      console.log(`With ${latency}ms latency: loaded in ${loadTime}ms`);
      
      // Remove route for next iteration
      await page.unroute('**/tasks');
    }
  });

  test('should optimize rendering with many DOM elements', async ({ page }) => {
    // Measure rendering performance with many elements visible
    await page.evaluate(() => {
      // Add performance mark
      performance.mark('render-start');
    });
    
    // Apply filter to show all tasks
    await page.selectOption('#filterStatus', '');
    await page.selectOption('#filterPriority', '');
    await page.waitForTimeout(500);
    
    const renderingTime = await page.evaluate(() => {
      performance.mark('render-end');
      performance.measure('render-time', 'render-start', 'render-end');
      
      const measure = performance.getEntriesByName('render-time')[0];
      return measure ? measure.duration : 0;
    });
    
    // Rendering should be efficient even with many elements
    expect(renderingTime).toBeLessThan(1000); // Under 1 second
    
    console.log(`DOM rendering time: ${renderingTime.toFixed(2)}ms`);
    
    // Check that scrolling is smooth
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
    await page.mouse.wheel(0, -500);
    
    // Page should remain responsive after rendering
    await expect(page.locator('#createTaskBtn')).toBeVisible();
  });
});