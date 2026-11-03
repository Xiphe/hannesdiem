import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  for (const modal of ['contact button', 'contact link', 'lyrics', 'navigation'] as const) {
    test(`${modal} keeps the background scroll position at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.goto(
        modal === 'lyrics' ? '/fixture-scrolled-long-release' : '/fixture-scrolled-contact',
        { waitUntil: 'networkidle' },
      )
      const trigger =
        modal === 'contact button'
          ? page.getByRole('link', { name: 'Contact fixture', exact: true })
          : modal === 'contact link'
            ? page.getByRole('link', { name: 'Contact retreat', exact: true })
            : modal === 'lyrics'
              ? page.locator('main a[data-rmx-target="overlay"]').last()
              : page.getByRole('button', { name: 'Open menu', exact: true })
      if (modal === 'navigation') await page.evaluate(() => scrollTo(0, 1600))
      else await trigger.scrollIntoViewIfNeeded()
      const before = await page.evaluate(() => scrollY)
      expect(before).toBeGreaterThan(1000)
      await trigger.click()
      const dialog = page.getByRole('dialog', {
        name: modal === 'navigation' ? 'Navigation' : 'Page dialog',
        exact: true,
      })
      await expect(dialog).toBeVisible()
      if (modal !== 'navigation') await expect(dialog.locator('[data-overlay-panel]')).toBeVisible()
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(before)
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible()
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(before)
    })
  }
}
