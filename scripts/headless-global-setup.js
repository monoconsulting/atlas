/**
 * Headless-Only Global Setup Script
 * Task 11: Validates environment and prepares headless test execution
 */

const fs = require('fs');
const path = require('path');

async function globalSetup(config) {
  console.log('🚀 Starting headless-only test execution setup...');
  
  // Ensure we're in headless mode
  console.log('✅ Validating headless-only configuration...');
  
  // Check that we're not in headed mode through environment
  if (process.env.HEADED === 'true' || process.env.PLAYWRIGHT_HEADED === 'true') {
    throw new Error('❌ CRITICAL ERROR: Headed mode detected in environment variables!');
  }
  
  // Check command line arguments for headed mode
  const cliArgs = process.argv.join(' ');
  if (cliArgs.includes('--headed') || cliArgs.includes('--ui')) {
    throw new Error('❌ CRITICAL ERROR: Headed mode detected in command line arguments!');
  }
  
  console.log('   Environment validation: No headed mode detected');
  
  // Create artifact directories
  const directories = [
    'test-results',
    'test-results/headless-reports',
    'test-results/headless-reports/html',
    'test-results/headless-artifacts',
    'test-results/headless-artifacts/screenshots',
    'test-results/headless-artifacts/videos',
    'test-results/headless-artifacts/traces'
  ];
  
  console.log('📁 Creating artifact directories...');
  directories.forEach(dir => {
    const fullPath = path.resolve(dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`   Created: ${dir}`);
    } else {
      console.log(`   Exists: ${dir}`);
    }
  });
  
  // Create execution timestamp
  const timestamp = new Date().toISOString();
  const executionInfo = {
    timestamp,
    mode: 'headless-only',
    browser: 'chromium',
    config: 'playwright-headless.config.js',
    enforced_headless: true
  };
  
  fs.writeFileSync(
    'test-results/headless-reports/execution-info.json',
    JSON.stringify(executionInfo, null, 2)
  );
  
  console.log('📊 Test execution info saved');
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Mode: headless-only`);
  console.log(`   Browser: chromium`);
  
  // Validate browser installation
  try {
    const { chromium } = require('playwright');
    console.log('🌐 Validating chromium browser...');
    
    // Test browser launch in headless mode
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    console.log('✅ Chromium browser validation successful');
  } catch (error) {
    console.error('❌ Browser validation failed:', error.message);
    throw new Error('Chromium browser not properly installed or configured');
  }
  
  console.log('🎯 Global setup complete - ready for headless test execution');
  return executionInfo;
}

module.exports = globalSetup;