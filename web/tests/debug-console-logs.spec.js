/**
 * Debug Test: Check Console Logs During Task Edit
 * To see the debug logging from our TM50 fix
 */

const { test, expect } = require('@playwright/test');

test.describe('Debug Console Logs', () => {
    test('Check debug logs during task edit', async ({ page }) => {
        console.log('🚀 Starting Console Debug Test');
        
        // Capture console logs
        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            logs.push(text);
            if (text.includes('[TM50 DEBUG]')) {
                console.log('📊 ' + text);
            }
        });
        
        // Navigate to Atlas with atlas project
        console.log('🔗 Navigating to Atlas atlas project...');
        await page.goto('http://localhost:8199/atlas');
        
        // Wait for page to load
        await page.waitForSelector('#filterSorting', { timeout: 15000 });
        console.log('✅ Page loaded successfully');
        
        // Check initial sort order
        const sortingSelect = await page.locator('#filterSorting');
        const initialSortValue = await sortingSelect.inputValue();
        console.log(`📊 Initial sort order: ${initialSortValue}`);
        
        // Open first task for editing
        const firstTaskCard = await page.locator('.task-card').first();
        await firstTaskCard.click();
        
        // Wait for modal to open
        await page.waitForSelector('#taskModal:not(.hidden)', { timeout: 10000 });
        console.log('✅ Modal opened');
        
        // Edit the task title
        const taskTitleInput = await page.locator('#taskTitle');
        await taskTitleInput.click();
        await taskTitleInput.fill('Debug test - Updated title');
        console.log('✅ Title updated');
        
        // Save the task
        const saveButton = await page.locator('button:has-text("Save Task")');
        await saveButton.click();
        
        // Wait for modal to close
        await page.waitForSelector('#taskModal', { state: 'hidden', timeout: 10000 });
        console.log('✅ Modal closed');
        
        // Give a moment for all operations to complete
        await page.waitForTimeout(3000);
        
        // Check final sort order
        const finalSortValue = await sortingSelect.inputValue();
        console.log(`📊 Final sort order: ${finalSortValue}`);
        
        // Print all captured logs
        console.log('📋 All captured console logs:');
        logs.forEach((log, index) => {
            console.log(`${index + 1}. ${log}`);
        });
        
        console.log('🎉 Console Debug Test completed');
    });
});