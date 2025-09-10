const { chromium } = require('playwright');

async function testLoadingFixBigger() {
    let browser = null;
    let page = null;
    
    try {
        console.log('🚀 Testing with bigger window at localhost:8199/transkript2...');
        
        browser = await chromium.launch({ 
            headless: false,
            slowMo: 500
        });
        
        page = await browser.newPage();
        
        // Set bigger window size - double the height
        await page.setViewportSize({ width: 1920, height: 2160 });
        
        console.log('📂 Navigating to localhost:8199/transkript2...');
        await page.goto('http://localhost:8199/transkript2', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('⏳ Waiting for page to fully load...');
        await page.waitForTimeout(8000);
        
        // Check console errors
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(`${msg.type()}: ${msg.text()}`);
        });
        
        // Check if tasks are now visible
        const taskCounts = await page.evaluate(() => {
            const todoCount = document.getElementById('todoCount')?.textContent || '0';
            const inProgressCount = document.getElementById('inProgressCount')?.textContent || '0'; 
            const doneCount = document.getElementById('doneCount')?.textContent || '0';
            const projectName = document.getElementById('projectName')?.textContent || 'Loading...';
            const currentTag = document.getElementById('currentTagName')?.textContent || 'Loading...';
            
            return {
                todoCount,
                inProgressCount, 
                doneCount,
                projectName,
                currentTag,
                totalTasks: parseInt(todoCount) + parseInt(inProgressCount) + parseInt(doneCount)
            };
        });
        
        // Check for any task cards visible
        const taskCardsVisible = await page.evaluate(() => {
            const todoCards = document.querySelectorAll('#todoColumn .task-card, #todoColumn [data-task-id]').length;
            const inProgressCards = document.querySelectorAll('#inProgressColumn .task-card, #inProgressColumn [data-task-id]').length;
            const doneCards = document.querySelectorAll('#doneColumn .task-card, #doneColumn [data-task-id]').length;
            
            // Also check for any elements that might contain task content
            const todoContent = document.querySelector('#todoColumn')?.innerHTML || '';
            const inProgressContent = document.querySelector('#inProgressColumn')?.innerHTML || '';
            const doneContent = document.querySelector('#doneColumn')?.innerHTML || '';
            
            const hasTaskContent = !todoContent.includes('Loading...') || 
                                  !inProgressContent.includes('Loading...') || 
                                  !doneContent.includes('Loading...');
            
            return {
                todoCards,
                inProgressCards,
                doneCards,
                totalCards: todoCards + inProgressCards + doneCards,
                hasTaskContent,
                todoContent: todoContent.substring(0, 200) + '...',
                inProgressContent: inProgressContent.substring(0, 200) + '...',
                doneContent: doneContent.substring(0, 200) + '...'
            };
        });
        
        // Check network requests
        const networkRequests = [];
        page.on('request', request => {
            if (request.url().includes('transkript2')) {
                networkRequests.push(request.url());
            }
        });
        
        // Make a manual API call to verify backend is working
        const apiTest = await page.evaluate(async () => {
            try {
                const response = await fetch('/transkript2/tasks');
                const data = await response.json();
                return {
                    success: true,
                    taskCount: data.data?.tasks?.length || 0,
                    response: data
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        
        // Check if still showing "Loading..."
        const isStillLoading = await page.evaluate(() => {
            const loadingElements = Array.from(document.querySelectorAll('*')).filter(el => 
                el.textContent && el.textContent.trim() === 'Loading...'
            );
            return loadingElements.length;
        });
        
        // Take bigger screenshot
        await page.screenshot({ 
            path: 'E:/projects/taskmasterweb/loading-fix-bigger-screenshot.png',
            fullPage: true 
        });
        
        console.log('\n📊 BIGGER WINDOW TEST RESULTS:');
        console.log('====================================');
        console.log(`URL Tested: http://localhost:8199/transkript2`);
        console.log(`Window Size: 1920x2160`);
        console.log(`Project Name: ${taskCounts.projectName}`);
        console.log(`Current Tag: ${taskCounts.currentTag}`);
        console.log(`Todo Count: ${taskCounts.todoCount}`);
        console.log(`In Progress Count: ${taskCounts.inProgressCount}`);
        console.log(`Done Count: ${taskCounts.doneCount}`);
        console.log(`Total Tasks Shown: ${taskCounts.totalTasks}`);
        console.log(`Task Cards Visible: ${taskCardsVisible.totalCards}`);
        console.log(`Loading Elements: ${isStillLoading}`);
        console.log(`API Test Success: ${apiTest.success ? '✅' : '❌'}`);
        console.log(`API Task Count: ${apiTest.taskCount}`);
        console.log(`Console Messages: ${consoleMessages.length}`);
        
        if (consoleMessages.length > 0) {
            console.log('\n🐛 Console Messages:');
            consoleMessages.forEach(msg => console.log(`  - ${msg}`));
        }
        
        const isFixed = apiTest.success && apiTest.taskCount > 0 && isStillLoading === 0;
        
        return {
            timestamp: new Date().toISOString(),
            testResults: {
                url: 'http://localhost:8199/transkript2',
                windowSize: '1920x2160',
                taskCounts,
                taskCardsVisible,
                isStillLoading,
                apiTest,
                consoleMessages,
                networkRequests
            },
            screenshots: ['loading-fix-bigger-screenshot.png'],
            verdict: isFixed ? 'FULLY_WORKING' : (apiTest.success ? 'BACKEND_OK_FRONTEND_ISSUE' : 'BACKEND_ISSUE')
        };
        
    } catch (error) {
        console.error('❌ Error during bigger window test:', error);
        return {
            error: error.message,
            timestamp: new Date().toISOString(),
            verdict: 'TEST_FAILURE'
        };
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
        console.log('🏁 Browser closed');
    }
}

// Main execution
(async () => {
    console.log('================================================');
    console.log('🖼️  BIGGER WINDOW LOADING TEST');
    console.log('================================================');
    
    const report = await testLoadingFixBigger();
    
    console.log('\n📋 BIGGER WINDOW TEST REPORT:');
    console.log('================================================');
    console.log(JSON.stringify(report, null, 2));
    
    // Save report
    const fs = require('fs');
    fs.writeFileSync('E:/projects/taskmasterweb/loading-fix-bigger-report.json', JSON.stringify(report, null, 2));
    
    if (report.error) {
        console.log('\n❌ BIGGER WINDOW TEST FAILED');
        process.exit(1);
    } else {
        console.log(`\n${report.verdict === 'FULLY_WORKING' ? '✅' : '⚠️'} BIGGER WINDOW TEST COMPLETED`);
        console.log(`🎯 Verdict: ${report.verdict}`);
        
        if (report.verdict === 'FULLY_WORKING') {
            console.log('🎉 Everything is working perfectly!');
        } else if (report.verdict === 'BACKEND_OK_FRONTEND_ISSUE') {
            console.log('🔧 Backend API is working, but frontend has loading issues');
        } else if (report.verdict === 'BACKEND_ISSUE') {
            console.log('❌ Backend API is not responding correctly');
        }
        
        process.exit(0);
    }
})();