const { test, expect } = require('@playwright/test');

test.describe('UI Initialization & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display header with project name', async ({ page }) => {
    // Check header exists
    await expect(page.locator('header')).toBeVisible();
    
    // Check project name loads (may be "Loading..." initially, then updates)
    const projectName = page.locator('#projectName');
    await expect(projectName).toBeVisible();
    
    // Wait for project name to load from API
    await page.waitForFunction(() => {
      const element = document.querySelector('#projectName');
      return element && element.textContent !== 'Loading...';
    });
    
    await expect(projectName).toHaveText('TaskMasterWeb');
  });

  test('should display create task button', async ({ page }) => {
    const createBtn = page.locator('#createTaskBtn');
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toHaveText(/Create New Task/);
    await expect(createBtn).toBeEnabled();
  });

  test('should display kanban board with three columns', async ({ page }) => {
    // Check all three columns exist
    await expect(page.locator('#todoColumn')).toBeVisible();
    await expect(page.locator('#inProgressColumn')).toBeVisible();
    await expect(page.locator('#doneColumn')).toBeVisible();
    
    // Check column headers
    await expect(page.locator('h2', { hasText: '📋 Todo' })).toBeVisible();
    await expect(page.locator('h2', { hasText: '🚀 In Progress' })).toBeVisible();
    await expect(page.locator('h2', { hasText: '✅ Done' })).toBeVisible();
  });

  test('should display task counters for each column', async ({ page }) => {
    // Check counters exist
    await expect(page.locator('#todoCount')).toBeVisible();
    await expect(page.locator('#inProgressCount')).toBeVisible();
    await expect(page.locator('#doneCount')).toBeVisible();
    
    // Counters should display numbers
    await expect(page.locator('#todoCount')).toHaveText(/\d+/);
    await expect(page.locator('#inProgressCount')).toHaveText(/\d+/);
    await expect(page.locator('#doneCount')).toHaveText(/\d+/);
  });

  test('should display quick and advanced filter sections', async ({ page }) => {
    // Quick filters
    await expect(page.locator('text=🔧 Quick Filters')).toBeVisible();
    await expect(page.locator('#filterStatus')).toBeVisible();
    await expect(page.locator('#filterPriority')).toBeVisible();
    await expect(page.locator('#filterTag')).toBeVisible();
    
    // Advanced filters
    await expect(page.locator('text=🎯 Advanced Filters')).toBeVisible();
    await expect(page.locator('#clearAllFilters')).toBeVisible();
    await expect(page.locator('#selectAllFilters')).toBeVisible();
  });

  test('should load storage information', async ({ page }) => {
    // Wait for storage info to load
    const storageInfo = page.locator('#storageInfo');
    await expect(storageInfo).toBeVisible();
    
    // Wait for API call to complete
    await page.waitForFunction(() => {
      const element = document.querySelector('#storageInfo');
      return element && element.textContent.includes('{');
    });
    
    // Should contain valid JSON with expected fields
    const storageText = await storageInfo.textContent();
    expect(storageText).toContain('base_dir');
    expect(storageText).toContain('tasks_file');
    expect(storageText).toContain('project_name');
  });

  test('should load and display tasks initially', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForFunction(() => {
      const todoCol = document.querySelector('#todoColumn');
      const inProgCol = document.querySelector('#inProgressColumn');
      const doneCol = document.querySelector('#doneColumn');
      
      return todoCol && inProgCol && doneCol && 
             !todoCol.textContent.includes('Loading...');
    });
    
    // At least one column should have content (tasks or "No tasks" message)
    const todoColumn = page.locator('#todoColumn');
    const inProgressColumn = page.locator('#inProgressColumn');
    const doneColumn = page.locator('#doneColumn');
    
    await expect(todoColumn).not.toHaveText('Loading...');
    await expect(inProgressColumn).not.toHaveText('Loading...');
    await expect(doneColumn).not.toHaveText('Loading...');
  });

  test('should be responsive on mobile devices', async ({ page, isMobile }) => {
    if (isMobile) {
      // On mobile, columns should still be visible but may stack
      await expect(page.locator('#todoColumn')).toBeVisible();
      await expect(page.locator('#inProgressColumn')).toBeVisible();
      await expect(page.locator('#doneColumn')).toBeVisible();
      
      // Create button should be full width on mobile
      const createBtn = page.locator('#createTaskBtn');
      const boundingBox = await createBtn.boundingBox();
      const viewportSize = page.viewportSize();
      
      // Button should be close to full width on mobile
      expect(boundingBox.width).toBeGreaterThan(viewportSize.width * 0.8);
    }
  });
});