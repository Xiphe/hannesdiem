import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.route('https://customer-fixture.cloudflarestream.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Stream fixture</title>',
    }),
  )
})

for (const width of [390, 900, 1440]) {
  test(`recordings retain rich text and direct links after hydration at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/temple-video#fixture-recording')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const recording = page.getByRole('region', { name: 'Synthetic recording' })
    await expect(recording).toBeVisible()
    await expect(recording.locator('strong')).toHaveText('independent')
    await expect(recording.locator('em')).toHaveText('formatted')
    await expect(recording.getByRole('link', { name: 'Fixture reference' })).toHaveAttribute(
      'href',
      'https://example.org/recording',
    )
    await expect(recording.getByRole('listitem')).toHaveText('First fixture detail')
    expect(
      await recording.evaluate((node) => ({
        before: node.previousElementSibling?.id,
        after: node.nextElementSibling?.id,
      })),
    ).toEqual({ before: 'fixture-watch', after: 'verse-fixture-pair-2' })
    const iframe = recording.locator('iframe')
    await expect(iframe).toHaveAttribute('title', 'Synthetic recording')
    await expect(iframe).toHaveAttribute('loading', 'lazy')
    await expect(iframe).toHaveAttribute('src', /\/iframe\?preload=none$/)
    const box = (await iframe.boundingBox())!
    expect(box.width / box.height).toBeCloseTo(9 / 16, 2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const top = (await recording.boundingBox())!.y
    const navigation = (await page.locator('.temple-top-navigation').boundingBox())!
    expect(top).toBeGreaterThanOrEqual(navigation.y + navigation.height + 8)
    expect(top).toBeLessThanOrEqual(130)
    await recording.getByRole('link', { name: 'Synthetic recording', exact: true }).click()
    await expect(page).toHaveURL(/#fixture-recording$/)
    await page.reload()
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await expect(recording).toBeVisible()
    const restoredNavigation = (await page.locator('.temple-top-navigation').boundingBox())!
    expect((await recording.boundingBox())!.y).toBeGreaterThanOrEqual(
      restoredNavigation.y + restoredNavigation.height + 8,
    )
    expect((await recording.boundingBox())!.y).toBeLessThanOrEqual(130)
    expect(errors).toEqual([])
  })
}

test('recordings and their rich-text descriptions work without site JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    await context.route('https://customer-fixture.cloudflarestream.com/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Stream fixture</title>',
      }),
    )
    const page = await context.newPage()
    await page.goto('/temple-video#fixture-recording')
    const recording = page.getByRole('region', { name: 'Synthetic recording' })
    await expect(recording).toBeVisible()
    await expect(recording.locator('strong')).toHaveText('independent')
    await expect(
      recording.getByRole('link', { name: 'Synthetic recording', exact: true }),
    ).toHaveAttribute('href', '#fixture-recording')
    await expect(recording.locator('iframe')).toHaveAttribute('title', 'Synthetic recording')
  } finally {
    await context.close()
  }
})
