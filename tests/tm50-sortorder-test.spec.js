/**
 * Playwright Test for Task #50: Sort Order Persistence During Subtask Editing
 * Tests that sort order remains DESC after editing and saving a subtask
 */

const { test, expect } = require('@playwright/test');

test.describe('TM50: Sort Order Persistence', () => {
    test('Sort order should remain DESC after editing subtask', async ({ page }) => {
        // Set viewport to 1900x1200 as requested
        await page.setViewportSize({ width: 1900, height: 1200 });
        
        console.log('🚀 Starting TM50 Sort Order Test');
        console.log('📏 Viewport set to 1900x1200');
        
        // Navigate to Atlas with atlas project (has actual tasks)
        console.log('🔗 Navigating to Atlas atlas project...');
        await page.goto('http://localhost:8199/atlas');
        
        // Wait for the page to load and tasks to be fetched
        console.log('⏳ Waiting for tasks to load...');
        
        // Wait for the sorting dropdown to be ready (indicates page is loaded)
        await page.waitForSelector('#filterSorting', { timeout: 15000 });
        
        // Wait for any task content to appear (looking for any task with #)
        await page.waitForSelector('text=#1', { timeout: 10000 });
        
        // Step 1: Check initial sort order - should be DESC
        console.log('🔍 Step 1: Checking initial sort order...');
        const sortingSelect = await page.locator('#filterSorting');
        const initialSortValue = await sortingSelect.inputValue();
        console.log(`📊 Initial sort order: ${initialSortValue}`);
        
        // Verify it's DESC initially
        await expect(sortingSelect).toHaveValue('id-desc');
        console.log('✅ Confirmed initial sort order is DESC');
        
        // Take initial screenshot
        await page.screenshot({ 
            path: 'web/test-reports/tm50-initial-desc.png',
            fullPage: true
        });
        
        // Step 2: Open first task for editing
        console.log('🔍 Step 2: Opening first task for editing...');
        // Look for the first task card
        const firstTaskCard = await page.locator('.task-card').first();
        await firstTaskCard.click();
        
        // Wait for modal to open
        console.log('⏳ Waiting for edit modal to open...');
        await page.waitForSelector('#taskModal:not(.hidden)', { timeout: 10000 });
        
        // Take screenshot of opened modal
        await page.screenshot({ 
            path: 'web/test-reports/tm50-modal-opened.png',
            fullPage: true
        });
        
        // Step 3: Add a subtask first, then edit it to reproduce the issue
        console.log('🔍 Step 3: Adding a subtask first...');
        
        // Click Add Subtask button
        const addSubtaskBtn = await page.locator('button:has-text("Add Subtask")');
        await addSubtaskBtn.click();
        
        // Wait for subtask form to appear
        await page.waitForTimeout(1000);
        
        console.log('📝 Added subtask, now editing it...');
        
        // Look for subtask input fields
        const subtaskRows = await page.locator('.subtask-row');
        const subtaskCount = await subtaskRows.count();
        
        if (subtaskCount > 0) {
            console.log(`📝 Found ${subtaskCount} subtasks, editing the first one...`);
            
            // Click on first subtask's title field to edit it
            const firstSubtaskTitle = await page.locator('.subtask-title-input').first();
            await firstSubtaskTitle.click();
            await firstSubtaskTitle.fill('Updated subtask title - TM50 Test');
            
            console.log('📝 Modified subtask title');
            
            // Take screenshot after editing
            await page.screenshot({ 
                path: 'web/test-reports/tm50-subtask-edited.png',
                fullPage: true
            });
            
        } else {
            console.log('📝 No subtasks found after adding, editing main task instead...');
            
            // Edit main task title
            const taskTitleInput = await page.locator('#taskTitle');
            await taskTitleInput.click();
            await taskTitleInput.fill('Updated task title - TM50 Test');
            
            console.log('📝 Modified main task title');
        }
        
        // Step 4: Save the task
        console.log('🔍 Step 4: Saving the task...');
        const saveButton = await page.locator('button:has-text("Save Task")');
        await saveButton.click();
        
        // Wait for modal to close and tasks to reload
        console.log('⏳ Waiting for modal to close and tasks to reload...');
        await page.waitForSelector('#taskModal', { state: 'hidden', timeout: 10000 });
        
        // Give a moment for tasks to reload and UI to update
        await page.waitForTimeout(2000);
        
        // Step 5: Check sort order after saving - should still be DESC
        console.log('🔍 Step 5: Checking sort order after saving...');
        const finalSortValue = await sortingSelect.inputValue();
        console.log(`📊 Final sort order: ${finalSortValue}`);
        
        // Take final screenshot
        await page.screenshot({ 
            path: 'web/test-reports/tm50-final-result.png',
            fullPage: true
        });
        
        // Verify sort order is still DESC
        await expect(sortingSelect).toHaveValue('id-desc');
        console.log('✅ Sort order verification complete');
        
        // Additional verification: Check if the actual task order in DOM matches DESC
        console.log('🔍 Additional verification: Checking actual task order in DOM...');
        const taskCards = await page.locator('.task-card');
        const taskCount = await taskCards.count();
        
        if (taskCount >= 2) {
            // Get the first two task IDs by reading the task card content
            const firstTaskText = await taskCards.nth(0).textContent();
            const secondTaskText = await taskCards.nth(1).textContent();
            
            // Extract task IDs from the text (looking for patterns like #111, #112, etc.)
            const firstIdMatch = firstTaskText?.match(/#(\d+)/);
            const secondIdMatch = secondTaskText?.match(/#(\d+)/);
            
            if (firstIdMatch && secondIdMatch) {
                const firstId = parseInt(firstIdMatch[1]);
                const secondId = parseInt(secondIdMatch[1]);
                
                console.log(`📊 First task ID: #${firstId}, Second task ID: #${secondId}`);
                
                expect(firstId).toBeGreaterThan(secondId);
                console.log('✅ Task order in DOM confirmed as DESC');
            } else {
                console.log('⚠️ Could not extract task IDs from DOM text for verification');
            }
        }
        
        console.log('🎉 TM50 Sort Order Test completed successfully!');
    });
});