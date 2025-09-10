const { chromium } = require('playwright');

async function testModal() {
  console.log('🧪 Testing Modal Functionality...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:8199', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Find first task card
    const firstTaskCard = await page.$('.task-card');
    if (!firstTaskCard) {
      console.log('❌ No task cards found');
      return false;
    }

    console.log('✅ Found task card');

    // Click on task card to open modal
    await firstTaskCard.click();
    await page.waitForTimeout(2000);

    // Check if modal is visible
    const modal = await page.$('#editModal:not(.hidden)');
    if (!modal) {
      console.log('❌ Modal did not open');
      return false;
    }

    console.log('✅ Modal opened successfully');

    // Try clicking on the modal backdrop using coordinates
    const modalBox = await modal.boundingBox();
    if (modalBox) {
      // Click on the left edge of the modal (should be backdrop)
      await page.mouse.click(modalBox.x + 50, modalBox.y + modalBox.height / 2);
      await page.waitForTimeout(1000);

      // Check if modal closed
      const modalHidden = await page.$('#editModal.hidden');
      if (modalHidden) {
        console.log('✅ Modal closed with backdrop click (coordinates)');
      } else {
        console.log('❌ Modal did not close with backdrop click (coordinates)');
        
        // Try the close button instead
        await page.click('#closeModal');
        await page.waitForTimeout(1000);
        
        const modalClosedByButton = await page.$('#editModal.hidden');
        if (modalClosedByButton) {
          console.log('✅ Modal closed with close button');
        } else {
          console.log('❌ Modal close button also failed');
          return false;
        }
      }
    }

    return true;

  } catch (error) {
    console.error('❌ Modal test failed:', error);
    return false;
  } finally {
    await context.close();
    await browser.close();
  }
}

testModal().then(success => {
  console.log(success ? '\n🎉 Modal test completed' : '\n❌ Modal test failed');
  process.exit(success ? 0 : 1);
});