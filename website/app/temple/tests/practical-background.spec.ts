import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`practical reading contours keep their curved ends at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/temple-of-sound/watch')
    for (const id of ['watch', 'create', 'share']) {
      const section = page.locator(`#${id}`)
      await expect(section).toHaveAttribute('data-material-ready', '')
      const clipping = await section.evaluate((node) => {
        const boundary = node.querySelector('.fact-material-boundary')!.getBoundingClientRect()
        const path = node.querySelector<SVGPathElement>('.fact-material path')!
        const matrix = path.getScreenCTM()!
        const radius = parseFloat(getComputedStyle(path).strokeWidth) / 2
        const strokeY = radius * Math.hypot(matrix.b, matrix.d)
        const length = path.getTotalLength()
        const points = Array.from({ length: 1025 }, (_, i) => {
          const point = path.getPointAtLength((length * i) / 1024)
          return new DOMPoint(point.x, point.y).matrixTransform(matrix)
        }).filter((point) => point.x >= 0 && point.x <= innerWidth)
        return {
          top: boundary.top - Math.min(...points.map((point) => point.y - strokeY)),
          bottom: Math.max(...points.map((point) => point.y + strokeY)) - boundary.bottom,
        }
      })
      expect(clipping.top, `${id} upper contour`).toBeLessThanOrEqual(1)
      expect(clipping.bottom, `${id} lower contour`).toBeLessThanOrEqual(1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  })

  test(`practical sections share the bounded parallax ground at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/temple-of-sound/visit')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await expect(page.locator('.temple-stage')).toHaveCount(0)
    const ground = page.locator('.fragment-ground')
    await expect(ground).toHaveCount(1)
    const field = ground.locator('.fragment-ground-field')
    if (await page.evaluate(() => typeof ScrollTimeline === 'undefined')) {
      await expect(field).toBeHidden()
      expect(errors).toEqual([])
      return
    }
    // Freeze ambient drift to measure only the actual native scroll parallax.
    await page.addStyleTag({ content: '.fragment-ground-plane { animation: none !important }' })
    const planes = ground.locator('.fragment-ground-plane')
    await expect(planes).toHaveCount(3)
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    for (const id of ['facts', 'watch', 'create', 'share', 'watch']) {
      await page.locator(`#${id}`).evaluate(async (node) => {
        node.scrollIntoView({ behavior: 'instant' })
        // Settle native timeline sampling and the viewport's membership frame.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        )
      })
      await expect
        .poll(() =>
          planes.evaluateAll((nodes) =>
            nodes.every((node) =>
              [...node.children].some((piece) => {
                const rect = piece.getBoundingClientRect()
                return rect.top < innerHeight && rect.bottom > 0
              }),
            ),
          ),
        )
        .toBe(true)
      expect(
        await planes.evaluateAll((nodes) => Math.max(...nodes.map((node) => node.clientHeight))),
      ).toBeLessThanOrEqual(900 + 128)
    }
    const selected = await planes.evaluateAll((nodes) =>
      nodes.map((plane, layer) => {
        const piece = [...plane.children].find((node) => {
          const rect = node.getBoundingClientRect()
          return rect.top < innerHeight - 100 && rect.bottom > 100
        })!
        return {
          id: piece.querySelector('linearGradient')!.id,
          top: piece.getBoundingClientRect().top,
          depth: [-0.12, -0.26, -0.42][layer],
        }
      }),
    )
    await page.evaluate(() => scrollBy({ top: 50, behavior: 'instant' }))
    for (const { id, top, depth } of selected) {
      await expect
        .poll(() =>
          ground
            .locator(`.fragment-ground-piece:has(#${id})`)
            .evaluate((node) => node.getBoundingClientRect().top),
        )
        .toBeCloseTo(top + 50 * (depth - 1), 0)
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(field).toBeHidden()
    await expect(ground.locator('.fragment-ground-piece')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
