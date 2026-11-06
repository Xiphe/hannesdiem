import { test } from '@playwright/test'
import { checkGroundSpacing, groundViewports } from '../debug/ground-spacing.ts'

for (const viewport of groundViewports) {
  test(`seeded ground pieces leave no wide empty strips at ${viewport.width}px`, async ({
    page,
  }) => {
    await checkGroundSpacing(page, viewport)
  })
}
