const { chromium } = require('playwright');

async function takeScreenshot() {
  console.log('📸 Taking final screenshot of TaskMasterWeb with advanced filters...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:8199', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({ path: './taskmasterweb-advanced-filters-final.png', fullPage: true });
    console.log('✅ Screenshot saved as taskmasterweb-advanced-filters-final.png');
    
    // Test some filters for variety
    await page.check('input[name="priorityFilter"][value="high"]');
    await page.check('input[name="statusFilter"][value="todo"]');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: './taskmasterweb-filtered-view.png', fullPage: true });
    console.log('✅ Filtered view screenshot saved as taskmasterweb-filtered-view.png');

  } catch (error) {
    console.error('Screenshot failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

takeScreenshot();