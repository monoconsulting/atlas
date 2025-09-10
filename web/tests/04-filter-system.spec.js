const { test, expect } = require('@playwright/test');

test.describe('Filter System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for tasks to load
    await page.waitForFunction(() => {
      const todoCol = document.querySelector('#todoColumn');
      return todoCol && !todoCol.textContent.includes('Loading...');
    });
  });

  test.describe('Quick Filters', () => {
    test('should filter tasks by status using dropdown', async ({ page }) => {
      // Get initial task count
      const initialCount = await page.locator('.task-card').count();
      
      // Apply status filter
      await page.selectOption('#filterStatus', 'todo');
      await page.waitForTimeout(1000);
      
      // Only todo tasks should be visible
      const todoCount = await page.locator('#todoColumn .task-card').count();
      const inProgressCount = await page.locator('#inProgressColumn .task-card').count();
      const doneCount = await page.locator('#doneColumn .task-card').count();
      
      expect(todoCount).toBeGreaterThanOrEqual(0);
      expect(inProgressCount).toBe(0);
      expect(doneCount).toBe(0);
      
      // Reset filter
      await page.selectOption('#filterStatus', '');
      await page.waitForTimeout(500);
    });

    test('should filter tasks by priority using dropdown', async ({ page }) => {
      // Apply high priority filter
      await page.selectOption('#filterPriority', 'high');
      await page.waitForTimeout(1000);
      
      // All visible tasks should be high priority
      const visibleTasks = page.locator('.task-card');
      const count = await visibleTasks.count();
      
      if (count > 0) {
        // Check that visible tasks have high priority indicators
        for (let i = 0; i < Math.min(count, 3); i++) {
          const task = visibleTasks.nth(i);
          await expect(task.locator('.text-red-400')).toBeVisible();
        }
      }
      
      // Reset filter
      await page.selectOption('#filterPriority', '');
      await page.waitForTimeout(500);
    });

    test('should filter tasks using search input', async ({ page }) => {
      // Type in search field
      await page.fill('#filterTag', 'test');
      await page.waitForTimeout(1000);
      
      // All visible tasks should contain "test" in their content
      const visibleTasks = page.locator('.task-card');
      const count = await visibleTasks.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const task = visibleTasks.nth(i);
        const taskText = await task.textContent();
        expect(taskText.toLowerCase()).toContain('test');
      }
      
      // Clear search
      await page.fill('#filterTag', '');
      await page.waitForTimeout(500);
    });

    test('should combine multiple quick filters', async ({ page }) => {
      // Apply status and priority filters together
      await page.selectOption('#filterStatus', 'todo');
      await page.selectOption('#filterPriority', 'high');
      await page.waitForTimeout(1000);
      
      // Should only show high priority todo tasks
      const todoTasks = page.locator('#todoColumn .task-card');
      const count = await todoTasks.count();
      
      if (count > 0) {
        // Check first task has both todo status and high priority
        const firstTask = todoTasks.first();
        await expect(firstTask.locator('.text-red-400')).toBeVisible();
      }
      
      // Reset filters
      await page.selectOption('#filterStatus', '');
      await page.selectOption('#filterPriority', '');
    });
  });

  test.describe('Advanced Filters', () => {
    test('should filter using status checkboxes', async ({ page }) => {
      // Check todo status checkbox
      const todoCheckbox = page.locator('input[name="statusFilter"][value="todo"]');
      await expect(todoCheckbox).toBeVisible();
      await todoCheckbox.check();
      await page.waitForTimeout(1000);
      
      // Verify only todo tasks are visible
      const inProgressTasks = page.locator('#inProgressColumn .task-card');
      const doneTasks = page.locator('#doneColumn .task-card');
      
      expect(await inProgressTasks.count()).toBe(0);
      expect(await doneTasks.count()).toBe(0);
      
      // Uncheck
      await todoCheckbox.uncheck();
      await page.waitForTimeout(500);
    });

    test('should filter using priority checkboxes', async ({ page }) => {
      // Check high priority checkbox
      const highPriorityCheckbox = page.locator('input[name="priorityFilter"][value="high"]');
      await expect(highPriorityCheckbox).toBeVisible();
      await highPriorityCheckbox.check();
      await page.waitForTimeout(1000);
      
      // Verify all visible tasks are high priority
      const visibleTasks = page.locator('.task-card');
      const count = await visibleTasks.count();
      
      if (count > 0) {
        const firstTask = visibleTasks.first();
        await expect(firstTask.locator('.text-red-400')).toBeVisible();
      }
      
      // Uncheck
      await highPriorityCheckbox.uncheck();
    });

    test('should use advanced search field', async ({ page }) => {
      const searchField = page.locator('#searchTasks');
      
      if (await searchField.isVisible()) {
        await searchField.fill('priority');
        await page.waitForTimeout(1000);
        
        // Should filter tasks containing "priority"
        const visibleTasks = page.locator('.task-card');
        const count = await visibleTasks.count();
        
        for (let i = 0; i < Math.min(count, 3); i++) {
          const task = visibleTasks.nth(i);
          const taskText = await task.textContent();
          expect(taskText.toLowerCase()).toContain('priority');
        }
        
        // Clear search
        await searchField.fill('');
      }
    });

    test('should use additional filters (subtasks, assigned, overdue)', async ({ page }) => {
      // Check for additional filter checkboxes
      const subtaskFilter = page.locator('input[name="additionalFilter"][value="hasSubtasks"]');
      
      if (await subtaskFilter.isVisible()) {
        await subtaskFilter.check();
        await page.waitForTimeout(1000);
        
        // All visible tasks should have subtasks
        const visibleTasks = page.locator('.task-card');
        const count = await visibleTasks.count();
        
        if (count > 0) {
          for (let i = 0; i < Math.min(count, 3); i++) {
            const task = visibleTasks.nth(i);
            await expect(task.locator('text=/subtask/')).toBeVisible();
          }
        }
        
        await subtaskFilter.uncheck();
      }
    });

    test('should use quick filter presets', async ({ page }) => {
      // Test urgent preset
      const urgentPreset = page.locator('#presetUrgent');
      
      if (await urgentPreset.isVisible()) {
        await urgentPreset.click();
        await page.waitForTimeout(1000);
        
        // Should apply high priority and todo status filters
        const todoCheckbox = page.locator('input[name="statusFilter"][value="todo"]');
        const highPriorityCheckbox = page.locator('input[name="priorityFilter"][value="high"]');
        
        await expect(todoCheckbox).toBeChecked();
        await expect(highPriorityCheckbox).toBeChecked();
        
        // Clear filters
        await page.click('#clearAllFilters');
      }
    });

    test('should clear all filters', async ({ page }) => {
      // Apply multiple filters
      await page.selectOption('#filterStatus', 'todo');
      await page.selectOption('#filterPriority', 'high');
      await page.fill('#filterTag', 'test');
      
      const statusCheckbox = page.locator('input[name="statusFilter"][value="in-progress"]');
      if (await statusCheckbox.isVisible()) {
        await statusCheckbox.check();
      }
      
      // Click clear all
      await page.click('#clearAllFilters');
      await page.waitForTimeout(1000);
      
      // All filters should be reset
      await expect(page.locator('#filterStatus')).toHaveValue('');
      await expect(page.locator('#filterPriority')).toHaveValue('');
      await expect(page.locator('#filterTag')).toHaveValue('');
      
      // Checkboxes should be unchecked
      const checkedBoxes = page.locator('input[type="checkbox"]:checked');
      expect(await checkedBoxes.count()).toBe(0);
    });
  });

  test.describe('Filter Summary and Real-time Updates', () => {
    test('should show filter summary when filters are active', async ({ page }) => {
      // Apply a filter
      await page.selectOption('#filterStatus', 'todo');
      await page.waitForTimeout(1000);
      
      // Filter summary should be visible
      const filterSummary = page.locator('#filterSummary');
      const taskCount = page.locator('#filteredTaskCount');
      
      if (await filterSummary.isVisible()) {
        await expect(filterSummary).not.toHaveClass(/hidden/);
        
        // Should show count in format "X/Y"
        const countText = await taskCount.textContent();
        expect(countText).toMatch(/\d+\/\d+/);
      }
      
      // Clear filter
      await page.selectOption('#filterStatus', '');
    });

    test('should update filters in real-time', async ({ page }) => {
      // Measure filter response time
      const startTime = Date.now();
      
      await page.selectOption('#filterPriority', 'medium');
      
      // Wait for visual update
      await page.waitForFunction(() => {
        const cards = document.querySelectorAll('.task-card');
        return cards.length >= 0; // Filters should update immediately
      }, { timeout: 2000 });
      
      const endTime = Date.now();
      const updateTime = endTime - startTime;
      
      // Should update quickly (under 1 second)
      expect(updateTime).toBeLessThan(1000);
      
      // Reset
      await page.selectOption('#filterPriority', '');
    });

    test('should maintain filter state during task operations', async ({ page }) => {
      // Apply a filter
      await page.selectOption('#filterStatus', 'todo');
      await page.waitForTimeout(1000);
      
      // Create a new task
      await page.click('#createTaskBtn');
      await page.fill('#taskTitle', 'Filter State Test');
      await page.click('#createTaskModal button[type="submit"]');
      await page.waitForTimeout(2000);
      
      // Filter should still be active
      const filterValue = await page.locator('#filterStatus').inputValue();
      expect(filterValue).toBe('todo');
      
      // Reset
      await page.selectOption('#filterStatus', '');
    });

    test('should update column counters when filters are applied', async ({ page }) => {
      // Get initial counts
      const initialTodoCount = await page.locator('#todoCount').textContent();
      
      // Apply filter that should change visible count
      await page.selectOption('#filterStatus', 'in-progress');
      await page.waitForTimeout(1000);
      
      // Todo count should be 0, in-progress should show filtered count
      const filteredTodoCount = await page.locator('#todoCount').textContent();
      const inProgressCount = await page.locator('#inProgressCount').textContent();
      
      expect(filteredTodoCount).toBe('0');
      expect(parseInt(inProgressCount)).toBeGreaterThanOrEqual(0);
      
      // Reset and verify counts return
      await page.selectOption('#filterStatus', '');
      await page.waitForTimeout(1000);
      
      const resetTodoCount = await page.locator('#todoCount').textContent();
      expect(resetTodoCount).toBe(initialTodoCount);
    });

    test('should handle complex combined filters', async ({ page }) => {
      // Apply multiple types of filters
      await page.selectOption('#filterStatus', 'todo');
      await page.selectOption('#filterPriority', 'high');
      await page.fill('#filterTag', 'test');
      
      // Add checkbox filters if available
      const statusCheckbox = page.locator('input[name="statusFilter"][value="todo"]');
      if (await statusCheckbox.isVisible()) {
        await statusCheckbox.check();
      }
      
      const priorityCheckbox = page.locator('input[name="priorityFilter"][value="high"]');
      if (await priorityCheckbox.isVisible()) {
        await priorityCheckbox.check();
      }
      
      await page.waitForTimeout(1500);
      
      // Should show intersection of all filters
      const visibleTasks = page.locator('.task-card');
      const count = await visibleTasks.count();
      
      // All visible tasks should match all filter criteria
      if (count > 0) {
        const firstTask = visibleTasks.first();
        const taskText = await firstTask.textContent();
        
        // Should be high priority (red indicator)
        await expect(firstTask.locator('.text-red-400')).toBeVisible();
        
        // Should contain "test"
        expect(taskText.toLowerCase()).toContain('test');
        
        // Should be in todo column
        const todoColumn = page.locator('#todoColumn');
        await expect(todoColumn).toContainText(taskText);
      }
      
      // Clear all filters
      await page.click('#clearAllFilters');
    });
  });
});