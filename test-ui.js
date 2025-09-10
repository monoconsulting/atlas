const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,  // Keep false so we can see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: './test-videos/' }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('Navigating to http://localhost:8199...');
    
    // Navigate to the app
    await page.goto('http://localhost:8199', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    // Wait a bit for any async content
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ 
      path: './ui-test-full.png', 
      fullPage: true 
    });
    
    // Get page source
    console.log('Getting page source...');
    const content = await page.content();
    fs.writeFileSync('./page-source.html', content);
    
    // Check for CSS loading
    console.log('Checking CSS loading...');
    const styles = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.map(link => ({
        href: link.href,
        loaded: link.sheet !== null
      }));
    });
    console.log('CSS Links:', JSON.stringify(styles, null, 2));
    
    // Check computed styles on key elements
    console.log('Checking computed styles...');
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontFamily: computed.fontFamily,
        display: computed.display
      };
    });
    console.log('Body styles:', JSON.stringify(bodyStyles, null, 2));
    
    // Check if main grid container exists and its styles
    const mainStyles = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return { error: 'No main element found' };
      
      const computed = window.getComputedStyle(main);
      return {
        display: computed.display,
        gridTemplateColumns: computed.gridTemplateColumns,
        gap: computed.gap,
        maxWidth: computed.maxWidth,
        padding: computed.padding
      };
    });
    console.log('Main element styles:', JSON.stringify(mainStyles, null, 2));
    
    // Check all loaded stylesheets
    const allStyles = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      const loadedSheets = [];
      
      sheets.forEach((sheet, index) => {
        try {
          loadedSheets.push({
            index,
            href: sheet.href,
            rulesCount: sheet.cssRules ? sheet.cssRules.length : 0,
            ownerNodeTagName: sheet.ownerNode?.tagName,
            ownerNodeSrc: sheet.ownerNode?.src || sheet.ownerNode?.href
          });
        } catch (e) {
          loadedSheets.push({
            index,
            href: sheet.href,
            error: e.message
          });
        }
      });
      
      return loadedSheets;
    });
    console.log('All stylesheets:', JSON.stringify(allStyles, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: './ui-test-error.png' });
  }
  
  await context.close();
  await browser.close();
  
  console.log('Test completed. Check ui-test-full.png and page-source.html');
})();