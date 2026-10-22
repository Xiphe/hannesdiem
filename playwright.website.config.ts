import { defineConfig } from '@playwright/test'
import config from './playwright.config.ts'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 8787)
export default defineConfig({
  ...config,
  testMatch: '**/website.spec.ts',
  webServer: {
    command: `npx wrangler dev tests/website-worker.ts --ip 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    timeout: 120_000,
    env: { WEBSITE_TEST: 'true' },
    reuseExistingServer: false,
  },
})
