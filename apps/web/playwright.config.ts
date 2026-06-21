import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration — AI DevOps Platform (web)
 *
 * Base URL points to the Next.js dev server. The dashboard is accessible
 * without authentication in development (NODE_ENV=development bypass).
 *
 * Projects:
 *   - chromium (default, desktop)
 *   - firefox
 *   - webkit (Safari)
 *   - mobile-chrome (responsive tests)
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results/artifacts',
  
  /* Fail the build on CI if tests are left 'only'. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Sequential to avoid port conflicts on a single dev server */
  workers: process.env.CI ? 1 : 2,

  /* Global timeout per test */
  timeout: 60_000,

  /* Assertion-level timeout */
  expect: {
    timeout: 10_000,
  },

  /* Reporter configuration – collect HTML report + JSON for artifact parsing */
  reporter: [
    ['list'],
    ['html', { outputFolder: './e2e-results/html-report', open: 'never' }],
    ['json', { outputFile: './e2e-results/results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    
    /* Capture screenshot/video/trace on first failure */
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    trace: 'on-first-retry',

    /* Always-on artifacts for the run (full screenshots) */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Save screenshots to named artifact folder */
        screenshot: 'on',
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],

  /* Start the Next.js dev server before tests if not already running */
  webServer: {
    command: 'cmd /c "npm run dev"',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    cwd: '.',
  },
});
