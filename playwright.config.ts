import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'src/tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/farmacologico/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
