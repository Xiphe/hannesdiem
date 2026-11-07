import { defineConfig } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 8790)

export default defineConfig({
  testDir: '.',
  testMatch: ['**/tests/*.spec.ts', '**/temple/tests/*.spec.ts'],
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium' },
    {
      name: 'webkit-regressions',
      testMatch: [
        '**/tests/logo-theme.spec.ts',
        '**/tests/trace-rim.spec.ts',
        '**/tests/ground-spacing.spec.ts',
        '**/tests/ink.spec.ts',
        '**/tests/temple-entry.spec.ts',
        '**/tests/preview-row.spec.ts',
      ],
      use: { browserName: 'webkit' },
    },
  ],
  webServer: {
    cwd: '..',
    command: `npx wrangler dev website/tests/worker.ts --config website/wrangler.jsonc --ip 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { WEBSITE_TEST: 'true' },
  },
})
