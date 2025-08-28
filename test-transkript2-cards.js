const { chromium } = require('playwright');

async function countTaskCards() {
    let browser = null;
    let page = null;
    
    try {
        console.log('🚀 Starting Playwright headless script...');
        
        // Launch browser in headless mode
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        console.log('📂 Navigating to localhost:8199/transkript2...');
        
        // Navigate to the transkript2 project
        await page.goto('http://localhost:8199/transkript2', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('⏳ Waiting for page to fully load...');
        
        // Wait for the main content to load
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Wait a bit more for any dynamic content
        await page.waitForTimeout(3000);
        
        // Get page title for verification
        const title = await page.title();
        console.log(`📄 Page title: "${title}"`);
        
        // Count task cards using multiple selectors
        const cardSelectors = [
            '.task-card',           // Standard task card class
            '[data-task-id]',       // Cards with task ID attribute
            '.bg-white.rounded-lg', // Common card styling
            '.p-4.border',          // Card styling patterns
            '.shadow'               // Shadow styling on cards
        ];
        
        const cardCounts = {};
        let totalCards = 0;
        
        for (const selector of cardSelectors) {
            try {
                const count = await page.locator(selector).count();
                cardCounts[selector] = count;
                console.log(`🔍 Found ${count} elements with selector: "${selector}"`);
                
                if (count > totalCards) {
                    totalCards = count;
                }
            } catch (error) {
                cardCounts[selector] = 0;
                console.log(`❌ Error with selector "${selector}": ${error.message}`);
            }
        }
        
        // Try to find the most specific task cards
        let specificTaskCards = 0;
        try {
            // Look for cards containing task information
            const taskElements = await page.locator('[data-task-id], .task-item, .task-card, [class*="task"]').all();
            specificTaskCards = taskElements.length;
            console.log(`🎯 Found ${specificTaskCards} specific task elements`);
        } catch (error) {
            console.log(`❌ Error finding specific task elements: ${error.message}`);
        }
        
        // Check if there's a Kanban board or task list
        let kanbanColumns = 0;
        try {
            const columns = await page.locator('[class*="column"], [class*="status"], .kanban-column').count();
            kanbanColumns = columns;
            console.log(`📋 Found ${columns} kanban columns`);
        } catch (error) {
            console.log(`❌ Error finding kanban columns: ${error.message}`);
        }
        
        // Get all visible text content to look for task patterns
        const textContent = await page.textContent('body');
        const taskMatches = textContent.match(/Task\s+\d+/gi) || [];
        const taskIdMatches = textContent.match(/\b\d+\.\s+/g) || [];
        
        console.log(`📝 Found ${taskMatches.length} "Task X" patterns in text`);
        console.log(`🔢 Found ${taskIdMatches.length} numbered list patterns`);
        
        // Take a screenshot for debugging
        console.log('📸 Taking screenshot for debugging...');
        await page.screenshot({ 
            path: 'E:/projects/taskmasterweb/transkript2-cards-screenshot.png',
            fullPage: true 
        });
        
        // Get current URL to verify we're on the right page
        const currentUrl = await page.url();
        console.log(`🌐 Current URL: ${currentUrl}`);
        
        // Try to find any elements that might contain task information
        const allElements = await page.locator('*').count();
        console.log(`🌍 Total elements on page: ${allElements}`);
        
        // Look for specific TaskMaster UI elements
        const infoPanel = await page.locator('#storageInfo, .storage-info, [class*="info"]').count();
        const taskList = await page.locator('#taskList, .task-list, [class*="task-list"]').count();
        const addTask = await page.locator('#addTaskBtn, .add-task, [class*="add-task"]').count();
        
        console.log(`ℹ️  Info panels: ${infoPanel}`);
        console.log(`📋 Task lists: ${taskList}`);
        console.log(`➕ Add task buttons: ${addTask}`);
        
        // Generate comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            url: currentUrl,
            pageTitle: title,
            cardCounts: cardCounts,
            totalCards: totalCards,
            specificTaskCards: specificTaskCards,
            kanbanColumns: kanbanColumns,
            taskTextPatterns: taskMatches.length,
            numberedListPatterns: taskIdMatches.length,
            uiElements: {
                infoPanels: infoPanel,
                taskLists: taskList,
                addTaskButtons: addTask
            },
            totalElementsOnPage: allElements,
            screenshotPath: 'E:/projects/taskmasterweb/transkript2-cards-screenshot.png'
        };
        
        return report;
        
    } catch (error) {
        console.error('❌ Error during execution:', error);
        return {
            error: error.message,
            timestamp: new Date().toISOString(),
            screenshotPath: null
        };
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
        console.log('🏁 Browser closed');
    }
}

// Main execution
(async () => {
    console.log('=====================================');
    console.log('🎭 TRANSKRIPT2 TASK CARDS COUNT REPORT');
    console.log('=====================================');
    
    const report = await countTaskCards();
    
    console.log('\n📊 FINAL REPORT:');
    console.log('=====================================');
    console.log(JSON.stringify(report, null, 2));
    
    if (report.error) {
        console.log('\n❌ SCRIPT COMPLETED WITH ERRORS');
        process.exit(1);
    } else {
        console.log('\n✅ SCRIPT COMPLETED SUCCESSFULLY');
        console.log(`📸 Screenshot saved: ${report.screenshotPath}`);
        console.log(`🎯 Total task cards found: ${report.totalCards}`);
        process.exit(0);
    }
})();