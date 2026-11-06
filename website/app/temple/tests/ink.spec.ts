import { test } from '@playwright/test'
import { checkInkBaselines, inkViewport } from '../debug/ink.ts'

test.use(inkViewport)

test('cached glyph baselines agree with settled native text', async ({ page, baseURL }) => {
  await checkInkBaselines(page, new URL('/temple-of-sound', baseURL).href)
})
