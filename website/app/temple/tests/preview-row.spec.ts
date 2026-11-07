import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  for (const javaScriptEnabled of [true, false]) {
    test(`Watch previews keep their rich descriptions below native thumbnail links at ${width}px (JS ${javaScriptEnabled})`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        baseURL,
        javaScriptEnabled,
        viewport: { width, height: 900 },
      })
      try {
        const page = await context.newPage()
        await page.goto('/temple-of-sound/watch')
        if (javaScriptEnabled)
          await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
        const row = page.locator('.temple-post-previews')
        await expect(row).toHaveCSS('scrollbar-width', 'none')
        await expect(row).toHaveCSS('overflow-x', 'auto')
        const thumbnail = row.locator('#fixture-middle')
        const item = thumbnail.locator('..')
        const copy = item.locator('.temple-post-preview-copy')
        await expect(thumbnail).toHaveAttribute('href', '/feed/fixture-middle')
        await expect(thumbnail.locator('a')).toHaveCount(0)
        await expect(copy.locator('.temple-post-preview-subheadline')).toHaveText(
          'A quiet synthetic session, without vocals',
        )
        const description = copy.locator('.temple-post-preview-description')
        await expect(description.locator('strong')).toHaveText('independent')
        await expect(description.locator('em')).toHaveText('formatted')
        await expect(description.getByRole('link', { name: 'Fixture reference' })).toHaveAttribute(
          'href',
          'https://example.org/recording',
        )
        const imageBounds = await thumbnail.boundingBox()
        const copyBounds = await copy.boundingBox()
        expect(copyBounds!.y).toBeGreaterThanOrEqual(imageBounds!.y + imageBounds!.height)
        const previous = await row.evaluate((node) => node.scrollLeft)
        await row.evaluate((node) => node.scrollBy({ left: -400, behavior: 'instant' }))
        await expect.poll(() => row.evaluate((node) => node.scrollLeft)).not.toBe(previous)
        await thumbnail.click()
        await expect(page).toHaveURL(/\/feed\/fixture-middle$/)
      } finally {
        await context.close()
      }
    })
  }
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`thumbnail hover and keyboard feedback preserve geometry with motion ${reducedMotion}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.emulateMedia({ reducedMotion })
    await page.goto('/temple-of-sound/watch')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const thumbnail = page.locator('.temple-post-preview').first()
    await thumbnail.scrollIntoViewIfNeeded()
    await page.mouse.move(0, 0)
    const before = await thumbnail.boundingBox()
    await thumbnail.hover()
    await expect(thumbnail.locator('img')).toHaveCSS('filter', 'brightness(1.1)')
    await expect(thumbnail).toHaveCSS('outline-color', 'rgb(50, 96, 139)')
    expect(await thumbnail.boundingBox()).toEqual(before)
    if (reducedMotion === 'reduce') {
      await expect(thumbnail).toHaveCSS('transition-property', 'none')
      await expect(thumbnail.locator('img')).toHaveCSS('transition-property', 'none')
    }
    await page.mouse.move(0, 0)
    await thumbnail.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(thumbnail).toBeFocused()
    await expect(thumbnail).toHaveCSS('outline-width', '3px')
    await expect(thumbnail.locator('img')).toHaveCSS('filter', 'brightness(1.1)')
  })
}
