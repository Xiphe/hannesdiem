import { expect, test } from '@playwright/test'

test('facts publish native CMX text, images and action states without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto('/temple-facts')
  await expect(page.locator('#fixture-watch h2')).toHaveText(
    'A synthetic update heading that spans several lines on small screens.',
  )
  await expect(page.locator('#fixture-watch button')).toBeDisabled()
  await expect(page.locator('#fixture-create .fact-action a')).toHaveAttribute(
    'href',
    'mailto:fixture@example.com',
  )
  expect(
    await page
      .locator('.poem-pairs')
      .evaluate((node) => [...node.children].map((child) => child.id)),
  ).toEqual([
    'facts',
    'verse-fixture-pair-1',
    'fixture-watch',
    'verse-fixture-pair-2',
    'fixture-create',
  ])
  await expect(page.locator('.fact-story img')).toHaveCount(4)
  await context.close()
})

for (const width of [390, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`facts fit their material, resize and connect navigation at ${width}px in ${colorScheme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto('/temple-facts')
      await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
      for (const id of ['fixture-watch', 'fixture-create']) {
        const section = page.locator(`#${id}`)
        await expect(section).toHaveAttribute('data-material-ready', '')
        const geometry = await section.evaluate((section) => {
          const copy = section.querySelector('.fact-copy-tile')!.getBoundingClientRect()
          const svg = section.querySelector<SVGSVGElement>('svg')!
          const path = svg.querySelector('path')!
          const inverse = path.getScreenCTM()!.inverse()
          const inside = [
            [copy.left, copy.top],
            [copy.right, copy.top],
            [copy.left, copy.bottom],
            [copy.right, copy.bottom],
          ].every(([x, y]) => path.isPointInFill(new DOMPoint(x, y).matrixTransform(inverse)))
          const boundary = section.querySelector('.fact-material-boundary')!.getBoundingClientRect()
          const previous = section.previousElementSibling!.getBoundingClientRect()
          const action = section.querySelector('.fact-action')!.getBoundingClientRect()
          return {
            inside,
            overlap: previous.bottom - boundary.top,
            actionX: action.left + action.width / 2,
          }
        })
        expect(geometry.inside).toBe(true)
        expect(geometry.overlap).toBeLessThanOrEqual(1)
        expect(geometry.actionX).toBeCloseTo(width / 2, 0)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.evaluate(() => scrollTo(0, 1000))
      await page.locator('.temple-nav-items a[href="#fixture-create"]').click()
      await expect(page).toHaveURL(/#fixture-create$/)
      await page.setViewportSize({ width: width === 390 ? 1440 : 390, height: 900 })
      await expect(page.locator('#fixture-create')).toHaveAttribute('data-material-ready', '')
      expect(errors).toEqual([])
    })
  }
}

test('fact material listeners stop after island disposal', async ({ page }) => {
  await page.goto('/temple-facts')
  await expect(page.locator('#fixture-watch')).toHaveAttribute('data-material-ready', '')
  await page.locator('#fixture-watch').evaluate((node) => {
    const material = node.querySelector<SVGSVGElement>('svg')!
    Object.assign(window, {
      retiredFact: { node, material, style: material.getAttribute('style') },
    })
  })
  await page.getByRole('link', { name: 'Return to fixture' }).click()
  await expect(page).toHaveURL('/fixture')
  await page.setViewportSize({ width: 500, height: 700 })
  expect(
    await page.evaluate(() => {
      const { node, material, style } = (window as any).retiredFact
      return !node.hasAttribute('data-material-ready') && material.getAttribute('style') === style
    }),
  ).toBe(true)
})
