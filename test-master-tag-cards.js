const { chromium } = require('playwright');

async function countMasterTagCards() {
    let browser = null;
    let page = null;
    
    try {
        console.log('🚀 Starting Master Tag Task Cards Analysis...');
        
        browser = await chromium.launch({ 
            headless: false,
            slowMo: 1000 // Slow down for debugging
        });
        
        page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.text().includes('Error') || msg.text().includes('Failed')) {
                console.log('🔴 Page Error:', msg.text());
            }
        });
        
        console.log('📂 Navigating to localhost:8199/transkript2...');
        await page.goto('http://localhost:8199/transkript2', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log('⏳ Waiting for initial load...');
        await page.waitForTimeout(3000);
        
        // Try to switch to master tag programmatically via JavaScript
        console.log('🔄 Attempting to switch to master tag...');
        
        const switchResult = await page.evaluate(async () => {
            try {
                // Method 1: Direct API call to load master tag tasks
                const response = await fetch('/transkript2/tasks?tag=master');
                const data = await response.json();
                
                if (data.ok && data.data && data.data.tasks) {
                    // Store the tasks data
                    window.masterTasks = data.data.tasks;
                    
                    // Try to trigger the UI to refresh with master tag
                    if (typeof loadTasksForTag === 'function') {
                        await loadTasksForTag('master');
                    } else if (typeof loadTasks === 'function') {
                        // Modify the current tag and reload
                        if (window.currentTag) window.currentTag = 'master';
                        await loadTasks('master');
                    }
                    
                    return {
                        success: true,
                        taskCount: data.data.tasks.length,
                        method: 'API call successful'
                    };
                }
                
                return { success: false, error: 'API call failed' };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        console.log('🔄 Switch result:', switchResult);
        
        // Wait for potential UI updates
        await page.waitForTimeout(5000);
        
        // Method 2: Try to click on master tag if available
        try {
            console.log('🖱️  Looking for clickable master tag...');
            
            // Look for various master tag selectors
            const masterSelectors = [
                'input[value="master"]',
                'option[value="master"]', 
                'button:has-text("master")',
                '.tag-option:has-text("master")',
                '[data-tag="master"]',
                'label:has-text("master")'
            ];
            
            for (const selector of masterSelectors) {
                try {
                    const element = page.locator(selector).first();
                    if (await element.isVisible()) {
                        console.log(`✅ Found clickable master element: ${selector}`);
                        await element.click();
                        await page.waitForTimeout(3000);
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }
        } catch (error) {
            console.log('❌ Could not click master tag:', error.message);
        }
        
        // Method 3: Manually trigger the loadTasks function
        console.log('🔧 Attempting to manually load master tasks...');
        
        const manualLoadResult = await page.evaluate(() => {
            try {
                // Check if we have the master tasks from earlier
                if (window.masterTasks && window.masterTasks.length > 0) {
                    console.log('Using cached master tasks:', window.masterTasks.length);
                    
                    // Try to manually render the tasks
                    if (typeof renderKanbanBoard === 'function') {
                        renderKanbanBoard(window.masterTasks);
                        return { success: true, method: 'Manual render', taskCount: window.masterTasks.length };
                    }
                }
                
                return { success: false, error: 'No cached tasks or render function' };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        console.log('🔧 Manual load result:', manualLoadResult);
        
        // Wait for rendering
        await page.waitForTimeout(3000);
        
        // Now count the task cards with multiple strategies
        console.log('🔢 Counting task cards...');
        
        const cardAnalysis = await page.evaluate(() => {
            // Strategy 1: Look for common task card patterns
            const cardSelectors = [
                '.task-card',
                '[data-task-id]',
                '.kanban-card',
                '.task-item',
                '.bg-white.rounded-lg.border.p-4',
                '.border.rounded.p-4',
                '[class*="task"][class*="card"]'
            ];
            
            const counts = {};
            let maxCount = 0;
            
            cardSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                counts[selector] = elements.length;
                maxCount = Math.max(maxCount, elements.length);
            });
            
            // Strategy 2: Look for elements containing task-like content
            const allElements = document.querySelectorAll('div, article, section');
            let taskContentElements = 0;
            
            allElements.forEach(el => {
                const text = el.textContent || '';
                const hasTaskMarkers = (
                    text.includes('Task') ||
                    /\d+\.\s+/.test(text) ||
                    text.includes('priority') ||
                    text.includes('status') ||
                    text.includes('description')
                );
                
                if (hasTaskMarkers && text.length > 50 && text.length < 2000) {
                    taskContentElements++;
                }
            });
            
            // Strategy 3: Look in specific kanban columns
            const kanbanColumns = document.querySelectorAll('.kanban-column, [class*="column"], [class*="status"]');
            let cardsInColumns = 0;
            
            kanbanColumns.forEach(column => {
                const cardsInThisColumn = column.querySelectorAll('div.border, div.card, [class*="task"]').length;
                cardsInColumns += cardsInThisColumn;
            });
            
            return {
                selectorCounts: counts,
                maxSelectorCount: maxCount,
                taskContentElements: taskContentElements,
                cardsInColumns: cardsInColumns,
                totalDivs: document.querySelectorAll('div').length,
                bodyText: document.body.textContent.substring(0, 1000)
            };
        });
        
        console.log('📊 Card analysis results:', cardAnalysis);
        
        // Take final screenshots
        await page.screenshot({ 
            path: 'E:/projects/taskmasterweb/master-tag-final.png',
            fullPage: true 
        });
        
        // Get final API verification
        const finalApiCheck = await page.evaluate(async () => {
            try {
                const response = await fetch('/transkript2/tasks?tag=master');
                const data = await response.json();
                return {
                    success: true,
                    taskCount: data.data?.tasks?.length || 0,
                    sampleTask: data.data?.tasks?.[0]?.title || 'None'
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        console.log('🔍 Final API check:', finalApiCheck);
        
        // Generate final report
        const report = {
            timestamp: new Date().toISOString(),
            url: await page.url(),
            pageTitle: await page.title(),
            switchToMasterResult: switchResult,
            manualLoadResult: manualLoadResult,
            cardAnalysis: cardAnalysis,
            finalApiCheck: finalApiCheck,
            screenshots: ['E:/projects/taskmasterweb/master-tag-final.png'],
            conclusion: {
                apiTaskCount: finalApiCheck.taskCount,
                maxVisibleCards: cardAnalysis.maxSelectorCount,
                taskContentElements: cardAnalysis.taskContentElements,
                recommendation: finalApiCheck.taskCount > 0 && cardAnalysis.maxSelectorCount === 0 ? 
                    'Tasks exist in API but not rendering in UI - possible tag switching issue' :
                    'Normal operation'
            }
        };
        
        return report;
        
    } catch (error) {
        console.error('❌ Error during execution:', error);
        return {
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        // Keep browser open for 10 seconds to observe
        console.log('👀 Keeping browser open for observation...');
        await page.waitForTimeout(10000);
        
        if (page) await page.close();
        if (browser) await browser.close();
        console.log('🏁 Browser closed');
    }
}

// Main execution
(async () => {
    console.log('================================================');
    console.log('🎯 MASTER TAG TASK CARDS COUNT ANALYSIS');
    console.log('================================================');
    
    const report = await countMasterTagCards();
    
    console.log('\n📋 FINAL COMPREHENSIVE REPORT:');
    console.log('================================================');
    console.log(JSON.stringify(report, null, 2));
    
    if (report.error) {
        console.log('\n❌ ANALYSIS COMPLETED WITH ERRORS');
        process.exit(1);
    } else {
        console.log('\n✅ ANALYSIS COMPLETED SUCCESSFULLY');
        console.log('\n📊 SUMMARY:');
        console.log(`🔢 API Reports: ${report.conclusion?.apiTaskCount || 0} tasks in master tag`);
        console.log(`👀 UI Shows: ${report.conclusion?.maxVisibleCards || 0} task cards visible`);
        console.log(`📝 Content Elements: ${report.conclusion?.taskContentElements || 0} task-like elements`);
        console.log(`💡 Conclusion: ${report.conclusion?.recommendation || 'Unknown'}`);
        process.exit(0);
    }
})();