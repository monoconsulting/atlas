const { chromium } = require('playwright');

async function detailedTaskAnalysis() {
    let browser = null;
    let page = null;
    
    try {
        console.log('🚀 Starting detailed Playwright analysis...');
        
        browser = await chromium.launch({ 
            headless: false, // Use visible browser for debugging
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => console.log('🌐 Page console:', msg.text()));
        
        console.log('📂 Navigating to localhost:8199/transkript2...');
        
        await page.goto('http://localhost:8199/transkript2', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('⏳ Waiting for page to load completely...');
        await page.waitForTimeout(5000);
        
        // Check the page HTML content for debugging
        const pageContent = await page.content();
        console.log('📄 Page contains TaskMaster:', pageContent.includes('TaskMaster'));
        console.log('📄 Page contains task:', pageContent.includes('task'));
        
        // Look for the storage info to understand current state
        const storageInfo = await page.locator('#storageInfo').textContent().catch(() => 'Not found');
        console.log('💾 Storage info:', storageInfo);
        
        // Check current tag
        let currentTag = 'unknown';
        try {
            // Look for current tag indicator in the UI
            const tagElements = await page.locator('[class*="tag"], [id*="tag"], [data-tag]').allTextContents();
            console.log('🏷️  Tag elements found:', tagElements);
            
            // Check if there's a tag selector or display
            const tagSelector = await page.locator('select, .tag-selector, #currentTag').first();
            if (await tagSelector.isVisible()) {
                currentTag = await tagSelector.inputValue().catch(() => 
                    tagSelector.textContent().catch(() => 'unknown')
                );
            }
        } catch (e) {
            console.log('❌ Error finding current tag:', e.message);
        }
        
        console.log(`🏷️  Current tag: ${currentTag}`);
        
        // Try to find and click on master tag if available
        try {
            console.log('🔍 Looking for master tag option...');
            
            // Look for tag options or buttons
            const masterOption = page.locator('option[value="master"], button:has-text("master"), .tag-option:has-text("master")').first();
            
            if (await masterOption.isVisible()) {
                console.log('✅ Found master tag option, clicking...');
                await masterOption.click();
                await page.waitForTimeout(3000); // Wait for data to load
            } else {
                console.log('❌ Master tag option not found');
            }
        } catch (e) {
            console.log('❌ Error switching to master tag:', e.message);
        }
        
        // Check for task cards with various selectors
        const cardSelectors = [
            '.task-card',
            '[data-task-id]',
            '.task-item',
            '[class*="task"]',
            '.card',
            '.bg-white',
            '.border',
            '.p-4',
            '.rounded',
            '[id*="task"]'
        ];
        
        const cardCounts = {};
        
        for (const selector of cardSelectors) {
            try {
                const elements = await page.locator(selector).all();
                cardCounts[selector] = elements.length;
                
                if (elements.length > 0) {
                    console.log(`✅ ${selector}: ${elements.length} elements`);
                    
                    // Get sample text from first few elements
                    for (let i = 0; i < Math.min(3, elements.length); i++) {
                        const text = await elements[i].textContent();
                        const preview = text.substring(0, 100).replace(/\s+/g, ' ').trim();
                        console.log(`   Sample ${i+1}: ${preview}...`);
                    }
                } else {
                    console.log(`❌ ${selector}: 0 elements`);
                }
            } catch (error) {
                cardCounts[selector] = 0;
                console.log(`❌ Error with ${selector}: ${error.message}`);
            }
        }
        
        // Check API endpoints directly from the page
        console.log('🔌 Testing API endpoints from browser...');
        
        const apiResults = {};
        const endpoints = [
            '/transkript2/info',
            '/transkript2/tasks',
            '/transkript2/tasks?tag=master',
            '/transkript2/tasks?tag=transkript'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await page.evaluate(async (url) => {
                    const response = await fetch(url);
                    const data = await response.json();
                    return {
                        ok: response.ok,
                        status: response.status,
                        data: data
                    };
                }, endpoint);
                
                apiResults[endpoint] = {
                    status: response.status,
                    ok: response.ok,
                    taskCount: response.data?.data?.tasks?.length || response.data?.data?.total_tasks || 0
                };
                
                console.log(`📡 ${endpoint}: ${response.status} (${apiResults[endpoint].taskCount} tasks)`);
                
            } catch (error) {
                apiResults[endpoint] = { error: error.message };
                console.log(`❌ ${endpoint}: Error - ${error.message}`);
            }
        }
        
        // Take screenshots for debugging
        await page.screenshot({ 
            path: 'E:/projects/taskmasterweb/transkript2-detailed-full.png',
            fullPage: true 
        });
        
        await page.screenshot({ 
            path: 'E:/projects/taskmasterweb/transkript2-detailed-viewport.png'
        });
        
        console.log('📸 Screenshots saved for debugging');
        
        // Generate comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            url: await page.url(),
            pageTitle: await page.title(),
            currentTag: currentTag,
            storageInfo: storageInfo,
            cardCounts: cardCounts,
            apiResults: apiResults,
            totalElements: await page.locator('*').count(),
            screenshots: [
                'E:/projects/taskmasterweb/transkript2-detailed-full.png',
                'E:/projects/taskmasterweb/transkript2-detailed-viewport.png'
            ]
        };
        
        return report;
        
    } catch (error) {
        console.error('❌ Error during execution:', error);
        return {
            error: error.message,
            timestamp: new Date().toISOString()
        };
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
        console.log('🏁 Browser closed');
    }
}

// Main execution
(async () => {
    console.log('==========================================');
    console.log('🕵️ DETAILED TRANSKRIPT2 ANALYSIS REPORT');
    console.log('==========================================');
    
    const report = await detailedTaskAnalysis();
    
    console.log('\n📊 DETAILED REPORT:');
    console.log('==========================================');
    console.log(JSON.stringify(report, null, 2));
    
    if (report.error) {
        console.log('\n❌ ANALYSIS COMPLETED WITH ERRORS');
        process.exit(1);
    } else {
        console.log('\n✅ ANALYSIS COMPLETED SUCCESSFULLY');
        
        // Summary
        const totalCards = Math.max(...Object.values(report.cardCounts).filter(v => typeof v === 'number'));
        console.log(`🎯 Maximum task cards found: ${totalCards}`);
        
        // API summary
        console.log('\n📡 API Summary:');
        Object.entries(report.apiResults).forEach(([endpoint, result]) => {
            if (result.taskCount) {
                console.log(`   ${endpoint}: ${result.taskCount} tasks`);
            }
        });
        
        process.exit(0);
    }
})();