/**
 * Debug Test: Modal Opening Issue
 * Investigating why task cards don't open modals when clicked
 */

const { test, expect } = require('@playwright/test');

test.describe('Debug Modal Opening', () => {
    test('Debug modal opening functionality', async ({ page }) => {
        console.log('🚀 Starting Modal Opening Debug Test');
        
        // Navigate to Atlas with atlas project
        console.log('🔗 Navigating to Atlas atlas project...');
        await page.goto('http://localhost:8199/atlas');
        
        // Wait for page to load
        await page.waitForSelector('#filterSorting', { timeout: 15000 });
        console.log('✅ Page loaded successfully');
        
        // Check if tasks are loaded
        const taskCards = await page.locator('.task-card').count();
        console.log(`📊 Found ${taskCards} task cards`);
        
        if (taskCards === 0) {
            console.log('⚠️  No task cards found. Checking other selectors...');
            
            // Try alternative selectors
            const divsWithTaskId = await page.locator('div:has-text("#")').count();
            console.log(`📊 Found ${divsWithTaskId} divs with # pattern`);
            
            const clickables = await page.locator('[onclick*="openEditModal"]').count();
            console.log(`📊 Found ${clickables} elements with openEditModal onclick`);
            
            // Let's check if there are any tasks at all
            const allDivs = await page.locator('div').count();
            console.log(`📊 Total divs on page: ${allDivs}`);
            
            // Take screenshot to see what's on the page
            await page.screenshot({ 
                path: 'web/test-reports/debug-no-tasks.png',
                fullPage: true
            });
            
            return; // Exit early if no tasks
        }
        
        // Check if window.openEditModal exists
        const hasOpenEditModal = await page.evaluate(() => {
            return typeof window.openEditModal === 'function';
        });
        console.log(`🔧 window.openEditModal exists: ${hasOpenEditModal}`);
        
        // Check if task cards have onclick handlers
        const firstCard = page.locator('.task-card').first();
        const onclickAttribute = await firstCard.getAttribute('onclick');
        console.log(`🔧 First card onclick: ${onclickAttribute}`);
        
        // Get the task ID from the first card
        const dataTaskId = await firstCard.getAttribute('data-task-id');
        console.log(`🔧 First card data-task-id: ${dataTaskId}`);
        
        // Take screenshot before clicking
        await page.screenshot({ 
            path: 'web/test-reports/debug-before-click.png',
            fullPage: true
        });
        
        // Try clicking the first task card
        console.log('🖱️  Attempting to click first task card...');
        try {
            await firstCard.click();
            console.log('✅ Click successful');
        } catch (error) {
            console.log(`❌ Click failed: ${error.message}`);
        }
        
        // Wait a moment for modal to potentially appear
        await page.waitForTimeout(2000);
        
        // Check if modal appeared
        const modalVisible = await page.locator('#taskModal').isVisible();
        console.log(`🔧 Modal visible after click: ${modalVisible}`);
        
        // Take screenshot after clicking
        await page.screenshot({ 
            path: 'web/test-reports/debug-after-click.png',
            fullPage: true
        });
        
        // If modal didn't open, let's try alternative approaches
        if (!modalVisible) {
            console.log('🔧 Modal not visible, trying direct function call...');
            
            // Try calling the function directly
            if (dataTaskId) {
                await page.evaluate((taskId) => {
                    if (window.openEditModal) {
                        window.openEditModal(parseInt(taskId));
                    }
                }, dataTaskId);
                
                await page.waitForTimeout(1000);
                
                const modalVisibleAfterDirect = await page.locator('#taskModal').isVisible();
                console.log(`🔧 Modal visible after direct call: ${modalVisibleAfterDirect}`);
                
                await page.screenshot({ 
                    path: 'web/test-reports/debug-after-direct-call.png',
                    fullPage: true
                });
            }
        }
        
        // Log JavaScript console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('JS Error:', msg.text());
            }
        });
        
        console.log('🎉 Debug Modal Opening Test completed');
    });
});