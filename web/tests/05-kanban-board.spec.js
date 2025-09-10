const { test, expect } = require('@playwright/test');

test.describe('Kanban Board Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for tasks to load
    await page.waitForFunction(() => {
      const todoCol = document.querySelector('#todoColumn');
      const inProgCol = document.querySelector('#inProgressColumn');
      const doneCol = document.querySelector('#doneColumn');
      return todoCol && inProgCol && doneCol && !todoCol.textContent.includes('Loading...');
    });
  });

  test('should display three kanban columns with proper headers', async ({ page }) => {
    // Check column structure
    await expect(page.locator('#todoColumn')).toBeVisible();
    await expect(page.locator('#inProgressColumn')).toBeVisible();
    await expect(page.locator('#doneColumn')).toBeVisible();
    
    // Check headers
    await expect(page.locator('text=📋 Todo')).toBeVisible();
    await expect(page.locator('text=🚀 In Progress')).toBeVisible();
    await expect(page.locator('text=✅ Done')).toBeVisible();
    
    // Check counter elements
    await expect(page.locator('#todoCount')).toBeVisible();
    await expect(page.locator('#inProgressCount')).toBeVisible();
    await expect(page.locator('#doneCount')).toBeVisible();
  });

  test('should render tasks in correct columns based on status', async ({ page }) => {
    // Get tasks from each column
    const todoTasks = await page.locator('#todoColumn .task-card').count();
    const inProgressTasks = await page.locator('#inProgressColumn .task-card').count();
    const doneTasks = await page.locator('#doneColumn .task-card').count();
    
    console.log(`Tasks: Todo(${todoTasks}), InProgress(${inProgressTasks}), Done(${doneTasks})`);
    
    // Counters should match actual task counts
    const todoCountText = await page.locator('#todoCount').textContent();
    const inProgressCountText = await page.locator('#inProgressCount').textContent();
    const doneCountText = await page.locator('#doneCount').textContent();
    
    expect(parseInt(todoCountText)).toBe(todoTasks);
    expect(parseInt(inProgressCountText)).toBe(inProgressTasks);
    expect(parseInt(doneCountText)).toBe(doneTasks);
  });

  test('should display task cards with proper content', async ({ page }) => {
    const taskCards = page.locator('.task-card');
    const count = await taskCards.count();
    
    if (count > 0) {
      const firstTask = taskCards.first();
      
      // Should have task ID
      await expect(firstTask.locator('text=/^#\d+/')).toBeVisible();
      
      // Should have title
      await expect(firstTask.locator('h3')).toBeVisible();
      
      // Should have priority indicator
      await expect(firstTask.locator('.text-red-400, .text-orange-400, .text-slate-400')).toBeVisible();
      
      // Should be clickable
      await expect(firstTask).toHaveClass(/cursor-pointer/);
    }
  });

  test('should show priority visual indicators correctly', async ({ page }) => {
    const taskCards = page.locator('.task-card');
    const count = await taskCards.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const task = taskCards.nth(i);
      const priorityElement = task.locator('.text-red-400, .text-orange-400, .text-slate-400');
      
      if (await priorityElement.isVisible()) {
        const priorityText = await priorityElement.textContent();
        const priorityClass = await priorityElement.getAttribute('class');
        
        // High priority should have red indicator
        if (priorityText?.includes('high')) {
          expect(priorityClass).toContain('text-red-400');
        }
        // Medium priority should have orange indicator
        else if (priorityText?.includes('medium')) {
          expect(priorityClass).toContain('text-orange-400');
        }
        // Low priority should have slate indicator
        else if (priorityText?.includes('low')) {
          expect(priorityClass).toContain('text-slate-400');
        }
      }
    }
  });

  test('should show task metadata (assignee, due date, subtasks)', async ({ page }) => {
    const taskCards = page.locator('.task-card');
    const count = await taskCards.count();
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const task = taskCards.nth(i);
        const taskText = await task.textContent();
        
        // Check for assignee (👤 icon)
        if (taskText.includes('👤')) {
          await expect(task.locator('text=/👤/')).toBeVisible();
        }
        
        // Check for due date (📅 icon)
        if (taskText.includes('📅')) {
          await expect(task.locator('text=/📅/')).toBeVisible();
        }
        
        // Check for subtasks (📂 icon)
        if (taskText.includes('📂')) {
          await expect(task.locator('text=/📂.*subtask/')).toBeVisible();
        }
      }
    }
  });

  test('should move tasks between columns when status changes', async ({ page }) => {
    // Find a task in todo column
    const todoTasks = page.locator('#todoColumn .task-card');
    const todoCount = await todoTasks.count();
    
    if (todoCount > 0) {
      const firstTodoTask = todoTasks.first();
      const taskTitle = await firstTodoTask.locator('h3').textContent();
      
      // Click to edit
      await firstTodoTask.click();
      
      // Change status to in-progress
      await page.selectOption('#editTaskStatus', 'in-progress');
      await page.click('#saveTask');
      
      // Wait for update
      await page.waitForTimeout(2000);
      
      // Task should now be in in-progress column
      await expect(page.locator('#inProgressColumn')).toContainText(taskTitle);
      
      // Counters should update
      const newTodoCount = parseInt(await page.locator('#todoCount').textContent());
      const inProgressCount = parseInt(await page.locator('#inProgressCount').textContent());
      
      expect(newTodoCount).toBe(todoCount - 1);
      expect(inProgressCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('should handle empty columns gracefully', async ({ page }) => {
    // Check each column for empty state handling
    const columns = [
      { selector: '#todoColumn', name: 'Todo' },
      { selector: '#inProgressColumn', name: 'In Progress' },
      { selector: '#doneColumn', name: 'Done' }
    ];
    
    for (const column of columns) {
      const taskCount = await page.locator(`${column.selector} .task-card`).count();
      
      if (taskCount === 0) {
        // Empty column should show appropriate message
        const columnText = await page.locator(column.selector).textContent();
        expect(columnText).toContain('No tasks');
      }
    }
  });

  test('should maintain proper column layout on different screen sizes', async ({ page, isMobile }) => {
    // Check that all columns are visible
    await expect(page.locator('#todoColumn')).toBeVisible();
    await expect(page.locator('#inProgressColumn')).toBeVisible();
    await expect(page.locator('#doneColumn')).toBeVisible();
    
    // On mobile, columns might stack vertically but should still be functional
    if (isMobile) {
      const columns = [
        page.locator('#todoColumn'),
        page.locator('#inProgressColumn'),
        page.locator('#doneColumn')
      ];
      
      for (const column of columns) {
        const boundingBox = await column.boundingBox();
        expect(boundingBox.height).toBeGreaterThan(0);
        expect(boundingBox.width).toBeGreaterThan(0);
      }
    }
  });

  test('should support task interaction in all columns', async ({ page }) => {
    const columns = ['#todoColumn', '#inProgressColumn', '#doneColumn'];
    
    for (const columnSelector of columns) {
      const tasks = page.locator(`${columnSelector} .task-card`);
      const count = await tasks.count();
      
      if (count > 0) {
        const firstTask = tasks.first();
        
        // Task should be clickable
        await expect(firstTask).toHaveClass(/cursor-pointer/);
        
        // Click should open edit modal
        await firstTask.click();
        await expect(page.locator('#editModal')).toBeVisible();
        
        // Close modal for next iteration
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
  });

  test('should refresh kanban board data properly', async ({ page }) => {
    // Get initial state
    const initialTodoCount = await page.locator('#todoCount').textContent();
    const initialInProgressCount = await page.locator('#inProgressCount').textContent();
    const initialDoneCount = await page.locator('#doneCount').textContent();
    
    // Trigger a page refresh or reload tasks
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for tasks to reload
    await page.waitForFunction(() => {
      const todoCol = document.querySelector('#todoColumn');
      return todoCol && !todoCol.textContent.includes('Loading...');
    });
    
    // Counts should be preserved (or updated if tasks changed)
    const newTodoCount = await page.locator('#todoCount').textContent();
    const newInProgressCount = await page.locator('#inProgressCount').textContent();
    const newDoneCount = await page.locator('#doneCount').textContent();
    
    // Counts should be valid numbers
    expect(parseInt(newTodoCount)).toBeGreaterThanOrEqual(0);
    expect(parseInt(newInProgressCount)).toBeGreaterThanOrEqual(0);
    expect(parseInt(newDoneCount)).toBeGreaterThanOrEqual(0);
  });

  test('should handle rapid task status changes', async ({ page }) => {
    // Find a task to manipulate
    const firstTask = page.locator('.task-card').first();
    const count = await page.locator('.task-card').count();
    
    if (count > 0) {
      const taskTitle = await firstTask.locator('h3').textContent();
      const statuses = ['todo', 'in-progress', 'done'];
      
      // Rapidly change status multiple times
      for (const status of statuses) {
        await firstTask.click();
        await page.selectOption('#editTaskStatus', status);
        await page.click('#saveTask');
        await page.waitForTimeout(1000);
        
        // Verify task is in correct column
        const columnMap = {
          'todo': '#todoColumn',
          'in-progress': '#inProgressColumn',
          'done': '#doneColumn'
        };
        
        await expect(page.locator(columnMap[status])).toContainText(taskTitle);
      }
    }
  });

  test('should maintain visual consistency across columns', async ({ page }) => {
    const columns = ['#todoColumn', '#inProgressColumn', '#doneColumn'];
    
    for (const columnSelector of columns) {
      // Column should have consistent styling
      const column = page.locator(columnSelector);
      await expect(column).toHaveClass(/p-4/);
      await expect(column).toHaveClass(/min-h-/);
      
      // Task cards in each column should have consistent styling
      const tasks = page.locator(`${columnSelector} .task-card`);
      const count = await tasks.count();
      
      for (let i = 0; i < Math.min(count, 2); i++) {
        const task = tasks.nth(i);
        await expect(task).toHaveClass(/task-card/);
        await expect(task).toHaveClass(/p-3/);
        await expect(task).toHaveClass(/bg-slate-800/);
        await expect(task).toHaveClass(/rounded-lg/);
      }
    }
  });
});