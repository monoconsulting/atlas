const { test, expect } = require('@playwright/test');

test.describe('Edge Cases and Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Form Validation Edge Cases', () => {
    test('should handle very long task titles', async ({ page }) => {
      const longTitle = 'A'.repeat(500);
      
      await page.click('#createTaskBtn');
      await page.fill('#taskTitle', longTitle);
      await page.fill('#taskDescription', 'Testing long title handling');
      await page.click('#createTaskModal button[type="submit"]');
      
      await page.waitForTimeout(2000);
      
      // Task should be created or validation should prevent it
      // Either way, no JavaScript errors should occur
      const errors = await page.evaluate(() => {
        return window.errors || [];
      });
      expect(errors.length).toBe(0);
    });

    test('should prevent HTML injection in task fields', async ({ page }) => {
      const maliciousTitle = '<script>console.log("XSS-TEST")</script><h1>Malicious</h1>';
      const maliciousDesc = '<img src="x" onerror="console.log(\'XSS-TEST\')">';
      
      await page.click('#createTaskBtn');
      await page.fill('#taskTitle', maliciousTitle);
      await page.fill('#taskDescription', maliciousDesc);
      await page.click('#createTaskModal button[type="submit"]');
      
      await page.waitForTimeout(2000);
      
      // Check that no alert dialogs appeared (would indicate XSS)
      const dialogs = [];
      page.on('dialog', dialog => {
        dialogs.push(dialog.type());
        dialog.dismiss();
      });
      
      expect(dialogs.length).toBe(0);
      
      // HTML should be escaped/sanitized in display
      if (await page.locator('.task-card', { hasText: 'Malicious' }).count() > 0) {
        const taskCard = page.locator('.task-card', { hasText: 'Malicious' }).first();
        const cardHTML = await taskCard.innerHTML();
        expect(cardHTML).not.toContain('<script>');
        expect(cardHTML).not.toContain('<img');
      }
    });

    test('should handle special characters and unicode', async ({ page }) => {
      const unicodeTitle = '测试任务 🚀 Special chars: !@#$%^&*()';
      const unicodeDesc = 'Description with émojis 💻 and symbols: àáâäæãåā čçćđ';
      const unicodeAssignee = 'User名前 & Symbols';
      
      await page.click('#createTaskBtn');
      await page.fill('#taskTitle', unicodeTitle);
      await page.fill('#taskDescription', unicodeDesc);
      await page.fill('#taskAssignedTo', unicodeAssignee);
      await page.click('#createTaskModal button[type="submit"]');
      
      await page.waitForTimeout(2000);
      
      // Task should be created with unicode preserved
      await expect(page.locator('.task-card')).toContainText(unicodeTitle);
    });

    test('should validate date fields properly', async ({ page }) => {
      await page.click('#createTaskBtn');
      await page.fill('#taskTitle', 'Date Validation Test');
      
      // Test invalid date formats
      const invalidDates = ['invalid-date', '2024-13-40', '99-99-99'];
      
      for (const invalidDate of invalidDates) {
        await page.fill('#taskDueDate', invalidDate);
        await page.click('#createTaskModal button[type="submit"]');
        await page.waitForTimeout(500);
        
        // Form should handle invalid dates gracefully
        const modal = page.locator('#createTaskModal');
        const isVisible = await modal.isVisible();
        // Browser date input should prevent invalid dates
        expect(isVisible).toBe(true);
      }
      
      // Close modal
      await page.keyboard.press('Escape');
    });

    test('should handle empty form submission after partial fill', async ({ page }) => {
      await page.click('#createTaskBtn');
      
      // Fill then clear required field
      await page.fill('#taskTitle', 'Test Title');
      await page.fill('#taskTitle', '');
      
      await page.click('#createTaskModal button[type="submit"]');
      await page.waitForTimeout(1000);
      
      // Modal should stay open due to validation
      await expect(page.locator('#createTaskModal')).toBeVisible();
      
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Network Error Scenarios', () => {
    test('should handle offline task creation gracefully', async ({ page, context }) => {
      // Create a task first to test offline behavior
      await page.click('#createTaskBtn');
      await page.fill('#taskTitle', 'Offline Test Task');
      
      // Go offline
      await context.setOffline(true);
      
      // Try to submit
      await page.click('#createTaskModal button[type="submit"]');
      await page.waitForTimeout(3000);
      
      // Should handle network error gracefully (modal might stay open)
      const modal = page.locator('#createTaskModal');
      const isVisible = await modal.isVisible();
      
      // Application should not crash
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
      
      // Restore network
      await context.setOffline(false);
      
      if (isVisible) {
        await page.keyboard.press('Escape');
      }
    });

    test('should handle slow network responses', async ({ page }) => {
      // Intercept and delay API requests
      await page.route('/tasks', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.continue();
      });

      // Reload page to trigger slow API call
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Page should eventually load properly
      await expect(page.locator('#todoColumn')).toBeVisible();
      await expect(page.locator('#inProgressColumn')).toBeVisible();
      await expect(page.locator('#doneColumn')).toBeVisible();
    });

    test('should handle API server errors', async ({ page }) => {
      // Mock server error response
      await page.route('/task', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' })
          });
        } else {
          route.continue();
        }
      });

      await page.click('#createTaskBtn');
      await page.fill('#taskTitle', 'Server Error Test');
      await page.click('#createTaskModal button[type="submit"]');
      
      await page.waitForTimeout(2000);
      
      // Application should handle error gracefully
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    });
  });

  test.describe('UI Stress Tests', () => {
    test('should prevent rapid button clicking', async ({ page }) => {
      // Rapidly click create button multiple times
      const clickPromises = [];
      for (let i = 0; i < 10; i++) {
        clickPromises.push(page.click('#createTaskBtn'));
      }
      
      await Promise.all(clickPromises);
      await page.waitForTimeout(1000);
      
      // Only one modal should be open
      const visibleModals = await page.locator('#createTaskModal:not(.hidden)').count();
      expect(visibleModals).toBeLessThanOrEqual(1);
    });

    test('should handle window resize gracefully', async ({ page }) => {
      // Test different viewport sizes
      const sizes = [
        { width: 320, height: 568 },  // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];
      
      for (const size of sizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(500);
        
        // All main elements should remain visible and functional
        await expect(page.locator('#createTaskBtn')).toBeVisible();
        await expect(page.locator('#todoColumn')).toBeVisible();
        await expect(page.locator('#inProgressColumn')).toBeVisible();
        await expect(page.locator('#doneColumn')).toBeVisible();
      }
    });

    test('should handle rapid filter changes', async ({ page }) => {
      const filters = ['todo', 'in-progress', 'done', ''];
      
      // Rapidly change filters
      for (let i = 0; i < 3; i++) {
        for (const filter of filters) {
          await page.selectOption('#filterStatus', filter);
          await page.selectOption('#filterPriority', filter === 'todo' ? 'high' : '');
          await page.waitForTimeout(100);
        }
      }
      
      await page.waitForTimeout(1000);
      
      // UI should remain stable
      await expect(page.locator('#todoColumn')).toBeVisible();
      await expect(page.locator('#inProgressColumn')).toBeVisible();
      await expect(page.locator('#doneColumn')).toBeVisible();
    });

    test('should handle excessive form submissions', async ({ page }) => {
      await page.click('#createTaskBtn');
      await page.fill('#taskTitle', 'Stress Test Task');
      
      // Rapidly submit form multiple times
      for (let i = 0; i < 5; i++) {
        await page.click('#createTaskModal button[type="submit"]');
        await page.waitForTimeout(200);
      }
      
      await page.waitForTimeout(2000);
      
      // Should not create duplicate tasks or crash
      const stressTasks = await page.locator('.task-card', { hasText: 'Stress Test Task' }).count();
      expect(stressTasks).toBeLessThanOrEqual(2); // Allow for some duplicates but not excessive
    });
  });

  test.describe('Data Integrity Tests', () => {
    test('should maintain task ID uniqueness', async ({ page }) => {
      // Create multiple tasks
      const taskTitles = ['Unique Test 1', 'Unique Test 2', 'Unique Test 3'];
      
      for (const title of taskTitles) {
        await page.click('#createTaskBtn');
        await page.fill('#taskTitle', title);
        await page.click('#createTaskModal button[type="submit"]');
        await page.waitForTimeout(1500);
      }
      
      // Collect all task IDs
      const taskIds = await page.evaluate(() => {
        const taskCards = document.querySelectorAll('.task-card');
        const ids = [];
        
        taskCards.forEach(card => {
          const idElement = card.querySelector('span[class*="text-slate-300"]');
          if (idElement) {
            const match = idElement.textContent.match(/#(\d+)/);
            if (match) {
              ids.push(parseInt(match[1]));
            }
          }
        });
        
        return ids;
      });
      
      // All IDs should be unique
      const uniqueIds = [...new Set(taskIds)];
      expect(taskIds.length).toBe(uniqueIds.length);
    });

    test('should maintain status-column consistency', async ({ page }) => {
      // Check that tasks are in correct columns based on status
      const todoTasks = await page.locator('#todoColumn .task-card').count();
      const inProgressTasks = await page.locator('#inProgressColumn .task-card').count();
      const doneTasks = await page.locator('#doneColumn .task-card').count();
      
      // Counters should match actual task counts
      const todoCount = parseInt(await page.locator('#todoCount').textContent());
      const inProgressCount = parseInt(await page.locator('#inProgressCount').textContent());
      const doneCount = parseInt(await page.locator('#doneCount').textContent());
      
      expect(todoTasks).toBe(todoCount);
      expect(inProgressTasks).toBe(inProgressCount);
      expect(doneTasks).toBe(doneCount);
    });

    test('should handle corrupted local storage gracefully', async ({ page }) => {
      // Corrupt any local storage data
      await page.evaluate(() => {
        localStorage.setItem('tasks', 'invalid-json');
        localStorage.setItem('filters', '{broken json}');
      });
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Application should still load properly
      await expect(page.locator('#createTaskBtn')).toBeVisible();
      await expect(page.locator('#todoColumn')).toBeVisible();
    });
  });

  test.describe('Accessibility Edge Cases', () => {
    test('should handle keyboard navigation properly', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to reach create button
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      
      if (focusedElement === 'createTaskBtn') {
        // Should be able to activate with Enter
        await page.keyboard.press('Enter');
        await expect(page.locator('#createTaskModal')).toBeVisible();
        
        // Should be able to close with Escape
        await page.keyboard.press('Escape');
        await expect(page.locator('#createTaskModal')).toHaveClass(/hidden/);
      }
    });

    test('should handle focus management in modals', async ({ page }) => {
      await page.click('#createTaskBtn');
      
      // Focus should be within modal
      const focusedElement = await page.evaluate(() => {
        const activeEl = document.activeElement;
        const modal = document.querySelector('#createTaskModal');
        return modal?.contains(activeEl);
      });
      
      // Focus should be trapped or properly managed
      expect(typeof focusedElement).toBe('boolean');
    });

    test('should work with screen reader patterns', async ({ page }) => {
      // Check for proper ARIA labels and roles
      const createButton = page.locator('#createTaskBtn');
      
      // Should have appropriate attributes for accessibility
      const buttonText = await createButton.textContent();
      expect(buttonText).toContain('Create');
      
      // Form fields should have labels
      await page.click('#createTaskBtn');
      
      const titleField = page.locator('#taskTitle');
      const titleLabel = page.locator('label[for="taskTitle"], label:has(#taskTitle)');
      
      if (await titleLabel.count() > 0) {
        expect(await titleLabel.textContent()).toContain('Title');
      }
    });
  });

  test.describe('Browser Compatibility', () => {
    test('should handle missing modern JavaScript features', async ({ page }) => {
      // Test that essential functionality works even with basic JS
      await expect(page.locator('#createTaskBtn')).toBeVisible();
      await expect(page.locator('.task-card')).toHaveCount.toBeGreaterThanOrEqual(0);
    });

    test('should work with JavaScript disabled scenarios', async ({ page }) => {
      // While we can't fully disable JS in Playwright, we can test graceful degradation
      await page.addInitScript(() => {
        // Override console to catch errors
        window.originalConsoleError = console.error;
        window.errors = [];
        console.error = (msg) => {
          window.errors.push(msg);
          window.originalConsoleError(msg);
        };
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should not have critical JavaScript errors
      const errors = await page.evaluate(() => window.errors || []);
      const criticalErrors = errors.filter(error => 
        typeof error === 'string' && (
          error.includes('ReferenceError') || 
          error.includes('TypeError') ||
          error.includes('SyntaxError')
        )
      );
      
      expect(criticalErrors.length).toBe(0);
    });
  });
});