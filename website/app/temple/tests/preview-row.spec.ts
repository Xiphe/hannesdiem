import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  for (const javaScriptEnabled of [true, false]) {
    test(`Watch cards date their rich descriptions and open through the full card at ${width}px (JS ${javaScriptEnabled})`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        baseURL,
        javaScriptEnabled,
        locale: 'de-DE',
        timezoneId: 'Asia/Tokyo',
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
        const date = copy.locator('time')
        await expect(date).toHaveAttribute('datetime', '2025-04-08T19:30:00Z')
        await expect(date).toHaveText(javaScriptEnabled ? '9. April 2025' : 'April 8, 2025')
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
        // A description's own link stays interactive above the stretched feed link.
        await context.route('https://example.org/recording', (route) =>
          route.fulfill({
            contentType: 'text/html',
            body: '<p>Synthetic external destination</p>',
          }),
        )
        await description.getByRole('link', { name: 'Fixture reference' }).click()
        await expect(page).toHaveURL('https://example.org/recording')
        await page.goBack()
        await expect(date).toHaveText(javaScriptEnabled ? '9. April 2025' : 'April 8, 2025')
        // Click the date in the text panel, outside the thumbnail's own bounds.
        const itemBounds = await item.boundingBox()
        const dateBounds = await date.boundingBox()
        await item.click({
          position: { x: 24, y: dateBounds!.y - itemBounds!.y + dateBounds!.height / 2 },
        })
        await expect(page).toHaveURL(/\/feed\/fixture-middle$/)
      } finally {
        await context.close()
      }
    })
  }
}

for (const colorScheme of ['light', 'dark'] as const) {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`card hover stays border-free and keyboard feedback preserves geometry in ${colorScheme} with motion ${reducedMotion}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.emulateMedia({ reducedMotion, colorScheme })
      await page.goto('/temple-of-sound/watch')
      await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
      const thumbnail = page.locator('.temple-post-preview').first()
      await thumbnail.scrollIntoViewIfNeeded()
      await page.mouse.move(0, 0)
      const before = await thumbnail.boundingBox()
      const item = thumbnail.locator('..')
      const copy = item.locator('.temple-post-preview-copy')
      const play = thumbnail.locator('.temple-post-preview-play')
      const icon = play.locator('svg')
      await expect(item).toHaveCSS('filter', colorScheme === 'light' ? 'none' : 'contrast(1)')
      const backgroundTone = () =>
        item.evaluate((node) =>
          getComputedStyle(node)
            .backgroundColor.match(/[\d.]+/g)!
            .slice(0, 3)
            .reduce((sum, channel) => sum + Number(channel), 0),
        )
      const restingTone = await backgroundTone()
      await expect
        .poll(() => play.evaluate((node) => getComputedStyle(node, '::before').transform))
        .toBe('matrix(1, 0, 0, 1, 0, 0)')
      const iconBefore = await icon.boundingBox()
      const panel = await copy.boundingBox()
      await page.mouse.move(panel!.x + 24, panel!.y + 24)
      if (colorScheme === 'light') {
        await expect(item).toHaveCSS('filter', 'none')
        await expect.poll(backgroundTone).toBeLessThan(restingTone)
      } else await expect(item).toHaveCSS('filter', 'contrast(1.08)')
      await expect
        .poll(() => play.evaluate((node) => getComputedStyle(node, '::before').transform))
        .toBe('matrix(7, 0, 0, 7, 0, 0)')
      expect(await icon.boundingBox()).toEqual(iconBefore)
      await expect(thumbnail.locator('img')).toHaveCSS('transform', 'none')
      await expect(thumbnail).toHaveCSS('outline-style', 'none')
      await expect(item).toHaveCSS('border-top-width', '0px')
      await expect(item).toHaveCSS('box-shadow', 'none')
      expect(await thumbnail.boundingBox()).toEqual(before)
      if (reducedMotion === 'reduce') {
        await expect(item).toHaveCSS('transition-property', 'none')
        expect(
          await play.evaluate((node) => getComputedStyle(node, '::before').transitionProperty),
        ).toBe('none')
      }
      await page.mouse.move(0, 0)
      await thumbnail.focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      await expect(thumbnail).toBeFocused()
      await expect(thumbnail).toHaveCSS('outline-width', '3px')
      if (colorScheme === 'light') {
        await expect(item).toHaveCSS('filter', 'none')
        await expect.poll(backgroundTone).toBeLessThan(restingTone)
      } else await expect(item).toHaveCSS('filter', 'contrast(1.08)')
      await expect
        .poll(() => play.evaluate((node) => getComputedStyle(node, '::before').transform))
        .toBe('matrix(7, 0, 0, 7, 0, 0)')
      await expect(thumbnail.locator('img')).toHaveCSS('transform', 'none')
    })
  }
}
