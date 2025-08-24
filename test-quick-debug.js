const { chromium } = require('playwright');

async function quickDebugTest() {
    console.log('🔍 Quick Debug Test - Checking TaskMasterWeb Status...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000
    });
    
    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 }
    });
    
    const page = await context.newPage();

    try {
        console.log('📍 Navigating to TaskMasterWeb...');
        await page.goto('http://localhost:8199', { waitUntil: 'networkidle' });
        
        console.log('🔄 Force refreshing to bypass cache...');
        await page.reload({ waitUntil: 'networkidle' });
        
        console.log('⏳ Waiting for page to load...');
        await page.waitForTimeout(3000);

        // Take screenshot of what we actually see
        await page.screenshot({ path: './debug-screenshot.png', fullPage: true });
        console.log('📸 Screenshot saved as debug-screenshot.png');

        // Check what elements are actually present
        console.log('\n🔍 Checking for key elements:');
        
        const header = await page.$('header');
        console.log(`   Header: ${header ? '✅ Found' : '❌ Missing'}`);
        
        const createBtn = await page.$('#createTaskBtn');
        console.log(`   Create Button: ${createBtn ? '✅ Found' : '❌ Missing'}`);
        
        const todoColumn = await page.$('#todoColumn');
        console.log(`   Todo Column: ${todoColumn ? '✅ Found' : '❌ Missing'}`);
        
        const inProgressColumn = await page.$('#inProgressColumn');
        console.log(`   In Progress Column: ${inProgressColumn ? '✅ Found' : '❌ Missing'}`);
        
        const doneColumn = await page.$('#doneColumn');
        console.log(`   Done Column: ${doneColumn ? '✅ Found' : '❌ Missing'}`);

        // Check for any JavaScript errors
        const jsErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                jsErrors.push(msg.text());
            }
        });

        // Wait a bit more to catch any async errors
        await page.waitForTimeout(2000);

        if (jsErrors.length > 0) {
            console.log('\n❌ JavaScript Errors Found:');
            jsErrors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        } else {
            console.log('\n✅ No JavaScript errors detected');
        }

        // Check if any elements are loading
        const loadingTexts = await page.$$eval('*', elements => {
            return elements.filter(el => 
                el.textContent && el.textContent.toLowerCase().includes('loading')
            ).map(el => el.textContent.trim());
        });

        if (loadingTexts.length > 0) {
            console.log('\n⏳ Loading states found:');
            loadingTexts.forEach(text => console.log(`   - ${text}`));
        }

        // Check page title and basic content
        const title = await page.title();
        console.log(`\n📄 Page Title: "${title}"`);
        
        const bodyText = await page.$eval('body', el => el.textContent.substring(0, 200));
        console.log(`📄 Body Content Preview: "${bodyText}..."`);

        // Test if we can actually click the create button if it exists
        if (createBtn) {
            console.log('\n🧪 Testing Create Button Click...');
            try {
                await page.click('#createTaskBtn', { timeout: 5000 });
                await page.waitForTimeout(1000);
                
                const modal = await page.$('#createTaskModal');
                if (modal && await modal.isVisible()) {
                    console.log('✅ Create button works - modal opened');
                } else {
                    console.log('⚠️  Create button clicked but no modal appeared');
                }
            } catch (error) {
                console.log(`❌ Create button click failed: ${error.message}`);
            }
        }

        console.log('\n🎯 Debug Test Complete');

    } catch (error) {
        console.error('💥 Debug test failed:', error);
        await page.screenshot({ path: './debug-error-screenshot.png', fullPage: true });
        console.log('📸 Error screenshot saved as debug-error-screenshot.png');
    } finally {
        await context.close();
        await browser.close();
    }
}

quickDebugTest().catch(error => {
    console.error('Debug test runner failed:', error);
    process.exit(1);
});