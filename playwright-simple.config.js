// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'web/test-reports' }],
    ['json', { outputFile: 'web/test-reports/results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:8199',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: false,
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});