import { expect, test, type Locator } from '@playwright/test'
import sharp from 'sharp'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test.beforeEach(async ({ page }) => {
  // Reproduce older iOS WebKit ignoring media queries inside SVG images.
  await page.route(/\/assets\/(?:mark|templeMark)[^/]*\.svg$/, async (route) => {
    const response = await route.fetch()
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        '@media (prefers-color-scheme: dark)',
        '@media not all',
      ),
    })
  })
  await page.route('**/login', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ready: true, csrfToken: 'test-csrf' }),
    }),
  )
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
})

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'wait' })
})

async function expectColor(logo: Locator, rgb: readonly number[]) {
  await expect
    .poll(
      async () => {
        const { data, info } = await sharp(await logo.screenshot())
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })
        for (let i = 0; i < data.length; i += info.channels) {
          if (data[i] === rgb[0] && data[i + 1] === rgb[1] && data[i + 2] === rgb[2]) return true
        }
        return false
      },
      `logo should paint RGB(${rgb.join(', ')})`,
    )
    .toBe(true)
}

for (const width of [390, 1440]) {
  test(`branding follows dark/light/dark changes without SVG media support at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/fixture-release')
    const footer = page.locator('footer a[href="/"] img')
    for (const colorScheme of ['dark', 'light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await expectColor(footer, colorScheme === 'dark' ? [173, 212, 237] : [174, 30, 228])
    }
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const menu = page.getByRole('dialog', { name: 'Navigation', exact: true })
    await expectColor(menu.locator('a[href="/"] img'), [173, 212, 237])
  })

  test(`Temple logo layers select dark images without SVG media support at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/temple-navigation')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', /ready|fallback/)
    await page.locator('.temple-opening').evaluate((node) => {
      scrollTo(0, scrollY + node.getBoundingClientRect().bottom + 30)
    })
    await expect(page.locator('.temple-top-navigation')).toHaveAttribute('data-nav-visible', '')
    const logo = page.locator('.temple-nav-logo img').first()
    await expectColor(logo, [255, 249, 223])
    await page.emulateMedia({ colorScheme: 'light' })
    await expectColor(logo, [180, 106, 73])

    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/temple-bridge-finale')
    const original = page.locator('.temple-nav-logo-original')
    await expect
      .poll(() => original.evaluate((node) => (node as HTMLImageElement).currentSrc))
      .toContain('/markDark-')
    expect(await original.boundingBox()).toEqual(
      await page.locator('.temple-nav-logo img').first().boundingBox(),
    )
    await page.emulateMedia({ colorScheme: 'light' })
    await expect
      .poll(() => original.evaluate((node) => (node as HTMLImageElement).currentSrc))
      .toContain('/mark-')
  })
}
