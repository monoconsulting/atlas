/**
 * Playwright Configuration for TM50 Sort Order Test
 * Configured for video recording at 1900x1200 resolution
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/tm50-sortorder-test.spec.js',
  
  /* Run tests in files in parallel */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Reporter configuration */
  reporter: [
    ['html', { outputFolder: 'web/test-reports/tm50-html-report' }],
    ['json', { outputFile: 'web/test-reports/tm50-results.json' }],
    ['list']
  ],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL */
    baseURL: 'http://localhost:8199',
    
    /* Video recording settings - 1900x1200 as requested */
    video: {
      mode: 'retain-on-failure',
      size: { width: 1900, height: 1200 }
    },
    
    /* Screenshots on failure */
    screenshot: 'only-on-failure',
    
    /* Viewport size matching video */
    viewport: { width: 1900, height: 1200 },
    
    /* Collect trace for debugging */
    trace: 'retain-on-failure',
    
    /* Timeout for each action */
    actionTimeout: 30000,
    
    /* Timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'TM50-Chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1900, height: 1200 },
        video: {
          mode: 'on', // Always record video for this test
          size: { width: 1900, height: 1200 }
        }
      },
    }
  ],

  /* Output directories */
  outputDir: 'web/test-reports/tm50-test-results',
  
  /* Global timeout */
  globalTimeout: 5 * 60 * 1000, // 5 minutes
  
  /* Test timeout */
  timeout: 2 * 60 * 1000, // 2 minutes per test
});