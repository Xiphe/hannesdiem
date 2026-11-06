import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: 'line',
  use: {
    baseURL: process.env.QA_BASE_URL,
    browserName: 'chromium',
    reducedMotion: 'reduce',
    // Real email links and sessions must stay out of recorded artifacts.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    { name: 'desktop', testMatch: 'site.spec.ts', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', testMatch: 'site.spec.ts', use: { viewport: { width: 390, height: 844 } } },
    ...(process.env.QA_AUTH === 'true'
      ? [{ name: 'login', testMatch: 'login.spec.ts', timeout: 180_000 }]
      : []),
  ],
})
