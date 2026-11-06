import { test } from '@playwright/test'
import { checkTraceRim } from '../debug/trace-rim.ts'

test.use({ viewport: { width: 800, height: 640 } })

for (const scheme of ['light', 'dark'] as const) {
  test(`fragment traces stay continuous and turn smoothly with ${scheme} ink`, async ({ page }) => {
    await checkTraceRim(page, scheme)
  })
}
