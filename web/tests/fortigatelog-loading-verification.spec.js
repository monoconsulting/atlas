import { test, expect } from '@playwright/test';

test('fortigatelog loading verification - critical functions only', async ({ page }) => {
  // Enable console logging to catch JavaScript errors
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

  console.log('🧪 Starting fortigatelog loading verification test');

  // Navigate to fortigatelog project
  console.log('📍 Navigating to fortigatelog project...');
  await page.goto('http://localhost:8199/fortigatelog', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });

  // Take initial screenshot
  await page.screenshot({ 
    path: 'test-results/fortigatelog-loaded-page.png',
    fullPage: true 
  });

  // Wait for JavaScript to initialize (give extra time for initialization)
  await page.waitForTimeout(3000);

  // Verify no "Loading..." text remains (this was the main symptom)
  console.log('🔍 Checking for persistent Loading... text...');
  const loadingElements = await page.locator('text=Loading...').count();
  console.log(`Found ${loadingElements} Loading... elements`);
  expect(loadingElements, 'Should not have persistent Loading... text').toBe(0);

  // Verify that project slug was detected correctly
  console.log('🔍 Verifying project slug detection...');
  const projectSlug = await page.evaluate(() => {
    return window.projectSlug || 'not-set';
  });
  expect(projectSlug).toBe('fortigatelog');
  console.log('✅ Project slug correctly detected as:', projectSlug);

  // Verify that setProjectSlug function exists (this was the missing function)
  console.log('🔍 Verifying setProjectSlug function exists...');
  const setProjectSlugExists = await page.evaluate(() => {
    return typeof window.setProjectSlug === 'function';
  });
  expect(setProjectSlugExists).toBe(true);
  console.log('✅ setProjectSlug function is defined');

  // Verify that loadTasks function was called by checking if tasks were loaded
  console.log('🔍 Verifying tasks were loaded automatically...');
  const tasksLoaded = await page.evaluate(() => {
    return window.allTasks && Array.isArray(window.allTasks) && window.allTasks.length > 0;
  });
  expect(tasksLoaded).toBe(true);
  console.log(`✅ Tasks loaded automatically: ${await page.evaluate(() => window.allTasks ? window.allTasks.length : 0)} tasks`);

  // Verify kanban columns show actual content, not loading states
  console.log('🔍 Verifying kanban columns have content...');
  const todoColumnHasContent = await page.locator('#todoColumn .task-card').count() > 0 || 
                                await page.locator('#todoColumn:has-text("No tasks")').count() > 0;
  const inProgressColumnHasContent = await page.locator('#inProgressColumn .task-card').count() > 0 || 
                                     await page.locator('#inProgressColumn:has-text("No tasks")').count() > 0;
  const doneColumnHasContent = await page.locator('#doneColumn .task-card').count() > 0 || 
                               await page.locator('#doneColumn:has-text("No tasks")').count() > 0;

  expect(todoColumnHasContent || inProgressColumnHasContent || doneColumnHasContent, 
    'At least one kanban column should have content (tasks or "No tasks" message)').toBe(true);

  // Verify task counts are displayed (indicating successful rendering)
  const todoCount = await page.locator('#todoCount').textContent();
  const inProgressCount = await page.locator('#inProgressCount').textContent();
  const doneCount = await page.locator('#doneCount').textContent();
  
  console.log(`📊 Task counts - Todo: ${todoCount}, In Progress: ${inProgressCount}, Done: ${doneCount}`);
  
  // All counts should be numbers (not "0" due to loading failure)
  expect(todoCount).toMatch(/^\d+$/);
  expect(inProgressCount).toMatch(/^\d+$/);
  expect(doneCount).toMatch(/^\d+$/);

  // Take final screenshot showing successful loading
  await page.screenshot({ 
    path: 'test-results/fortigatelog-success-final.png',
    fullPage: true 
  });

  console.log('🎉 All verifications passed - fortigatelog loading issue is resolved!');
});