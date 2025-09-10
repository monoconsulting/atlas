// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Headless-Only Playwright Configuration
 * Task 11: Enforces headless mode, chromium only, with comprehensive artifact collection
 * @see https://playwright.dev/docs/test-configuration
 */

// Validate environment and block headed mode attempts
function validateHeadlessOnlyMode() {
  // Check for any environment variables that might override headless mode
  if (process.env.HEADED === 'true' || process.env.PLAYWRIGHT_HEADED === 'true') {
    console.error('❌ ERROR: Headed mode is not allowed in this configuration!');
    console.error('This configuration enforces headless-only execution.');
    console.error('Use playwright-simple.config.js for headed development testing.');
    process.exit(1);
  }
  
  // Block command line arguments that enable headed mode
  if (process.argv.includes('--headed') || process.argv.includes('--ui')) {
    console.error('❌ ERROR: --headed and --ui modes are not allowed!');
    console.error('This configuration enforces headless-only execution.');
    console.error('Use: npx playwright test --config playwright-simple.config.js --headed');
    process.exit(1);
  }
  
  console.log('✅ Headless-only mode validated - proceeding with chromium headless execution');
}

// Run validation before configuration
validateHeadlessOnlyMode();

module.exports = defineConfig({
  testDir: './tests',
  
  /* Enforce single-threaded execution for stability */
  fullyParallel: false,
  workers: 1,
  
  /* No retries by default - loop script handles retries */
  retries: 0,
  
  /* Fail build on CI if test.only is present */
  forbidOnly: !!process.env.CI,
  
  /* Comprehensive reporting with artifact storage */
  reporter: [
    ['html', { 
      outputFolder: 'test-results/headless-reports/html',
      open: 'never'  // Never open browser since we're headless-only
    }],
    ['json', { 
      outputFile: 'test-results/headless-reports/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/headless-reports/junit.xml' 
    }],
    ['line'], // Console output for loop script parsing
    ['blob'] // For trace viewing
  ],
  
  /* Global test settings */
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 15000 // 15 seconds for assertions
  },
  
  /* Shared test configuration - HEADLESS ENFORCED */
  use: {
    baseURL: 'http://localhost:8199',
    
    /* CRITICAL: Headless mode enforced - cannot be overridden */
    headless: true,
    
    /* Comprehensive artifact collection */
    trace: 'on', // Always collect traces for debugging
    screenshot: 'on', // Always take screenshots
    video: 'on', // Always record video
    
    /* Extended timeouts for headless stability */
    actionTimeout: 20000,
    navigationTimeout: 45000,
    
    /* Additional debugging options */
    launchOptions: {
      // Force headless mode at browser level
      headless: true,
      // Additional chromium args for stability in headless mode
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ]
    }
  },
  
  /* Chromium-only configuration */
  projects: [
    {
      name: 'chromium-headless',
      use: { 
        ...devices['Desktop Chrome'],
        // Explicitly enforce headless again at project level
        headless: true,
        launchOptions: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
          ]
        }
      },
    }
  ],
  
  /* Artifact and output directories */
  outputDir: 'test-results/headless-artifacts',
  
  /* Web server configuration for local testing */
  webServer: {
    command: 'python -m uvicorn app.main:app --host 127.0.0.1 --port 8199',
    url: 'http://127.0.0.1:8199/health',
    reuseExistingServer: true,
    timeout: 120000,
  },
  
  /* Global configuration */
  globalSetup: require.resolve('./scripts/headless-global-setup.js'),
  globalTeardown: require.resolve('./scripts/headless-global-teardown.js'),
});