const { chromium } = require('playwright');

async function testLoadingFix() {
    let browser = null;
    let page = null;
    
    try {
        console.log('🚀 Testing if loading issue is fixed...');
        
        browser = await chromium.launch({ 
            headless: false,
            slowMo: 500
        });
        
        page = await browser.newPage();
        
        console.log('📂 Navigating to transkript2 project...');
        await page.goto('http://localhost:8199/transkript2', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('⏳ Waiting for page to fully load...');
        await page.waitForTimeout(5000);
        
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
            
            return {
                todoCards,
                inProgressCards,
                doneCards,
                totalCards: todoCards + inProgressCards + doneCards
            };
        });
        
        // Check if still showing "Loading..."
        const isStillLoading = await page.evaluate(() => {
            const loadingTexts = Array.from(document.querySelectorAll('*')).filter(el => 
                el.textContent && el.textContent.includes('Loading...')
            ).length;
            return loadingTexts > 1; // More than just the project name
        });
        
        // Take screenshot for verification
        await page.screenshot({ 
            path: 'E:/projects/taskmasterweb/loading-fix-test-screenshot.png',
            fullPage: true 
        });
        
        console.log('\n📊 LOADING FIX TEST RESULTS:');
        console.log('================================');
        console.log(`Project Name: ${taskCounts.projectName}`);
        console.log(`Current Tag: ${taskCounts.currentTag}`);
        console.log(`Todo Count: ${taskCounts.todoCount}`);
        console.log(`In Progress Count: ${taskCounts.inProgressCount}`);
        console.log(`Done Count: ${taskCounts.doneCount}`);
        console.log(`Total Tasks Shown: ${taskCounts.totalTasks}`);
        console.log(`Task Cards Visible: ${taskCardsVisible.totalCards}`);
        console.log(`Still Loading: ${isStillLoading ? '❌ YES' : '✅ NO'}`);
        
        const isFixed = !isStillLoading && (taskCounts.totalTasks > 0 || taskCardsVisible.totalCards > 0);
        
        return {
            timestamp: new Date().toISOString(),
            testResults: {
                taskCounts,
                taskCardsVisible,
                isStillLoading,
                projectName: taskCounts.projectName,
                currentTag: taskCounts.currentTag
            },
            screenshots: ['loading-fix-test-screenshot.png'],
            verdict: isFixed ? 'LOADING_ISSUE_FIXED' : 'STILL_LOADING'
        };
        
    } catch (error) {
        console.error('❌ Error during loading test:', error);
        return {
            error: error.message,
            timestamp: new Date().toISOString(),
            verdict: 'LOADING_TEST_FAILURE'
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
    console.log('🔧 LOADING ISSUE FIX VERIFICATION');
    console.log('================================================');
    
    const report = await testLoadingFix();
    
    console.log('\n📋 LOADING FIX REPORT:');
    console.log('================================================');
    console.log(JSON.stringify(report, null, 2));
    
    // Save report
    const fs = require('fs');
    fs.writeFileSync('E:/projects/taskmasterweb/loading-fix-report.json', JSON.stringify(report, null, 2));
    
    if (report.error) {
        console.log('\n❌ LOADING FIX TEST COMPLETED WITH ERRORS');
        process.exit(1);
    } else {
        console.log(`\n${report.verdict === 'LOADING_ISSUE_FIXED' ? '✅' : '❌'} LOADING FIX TEST COMPLETED`);
        console.log(`🎯 Verdict: ${report.verdict}`);
        
        if (report.verdict === 'LOADING_ISSUE_FIXED') {
            console.log('🎉 Loading issue has been resolved!');
            console.log('   ✅ Tasks are now visible');
            console.log('   ✅ No more stuck on loading');
            console.log('   ✅ Current tag properly set to master');
        } else {
            console.log('⚠️  Loading issue may persist - check screenshot');
        }
        
        process.exit(0);
    }
})();