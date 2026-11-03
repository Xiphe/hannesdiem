import { expect, test } from '@playwright/test'

test('location is readable before enhancement, with native contact and map links', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto('/temple-location')
  const location = page.locator('.facts-grid')
  await expect(location.locator('.location-heading')).toHaveText(
    'A synthetic invitation with enough words to wrap naturally in the narrow layout.',
  )
  await expect(location.locator('.location-button')).toHaveAttribute(
    'href',
    '/_contact?email=mailto%3Afixture%40example.com',
  )
  await expect(location.locator('[data-map-link]')).toHaveAttribute(
    'href',
    /openstreetmap\.org\/\?mlat=52\.5&mlon=13\.4/,
  )
  expect(
    await location.evaluate((node) => node.nextElementSibling?.classList.contains('first-pair')),
  ).toBe(true)
  await context.close()
})

for (const width of [390, 1440]) {
  test(`location keeps its pin anchored and native heading at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'dark' })
    await page.goto('/temple-location')
    const location = page.locator('.facts-grid')
    await expect(location).toHaveAttribute('data-location-ready', '')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await expect(
      location.locator('.location-heading canvas, .location-heading [data-fitted]'),
    ).toHaveCount(0)
    await expect(location.locator('.country-rim')).toHaveAttribute(
      'href',
      /templeEurope-.*\.svg#land$/,
    )
    let previous = 0
    for (const progress of [0.2, 0.55, 0.85]) {
      await location.locator('.map-water').evaluate((node, progress) => {
        const rect = node.getBoundingClientRect()
        scrollTo(0, scrollY + rect.top - innerHeight + progress * (innerHeight + rect.height))
      }, progress)
      await expect
        .poll(() =>
          location.evaluate((node) => {
            const rect = node.querySelector('.map-water')!.getBoundingClientRect()
            const progress = (innerHeight - rect.top) / (innerHeight + rect.height)
            const raw = Math.max(0, Math.min(1, (progress - 0.2) / 0.8))
            const zoom = new DOMMatrix(
              getComputedStyle(node.querySelector('[data-map-camera]')!).transform,
            ).a
            return Math.abs(zoom - (0.55 + 4.65 * raw * raw))
          }),
        )
        .toBeLessThan(0.01)
      const zoom = await location
        .locator('[data-map-camera]')
        .evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a)
      expect(zoom).toBeGreaterThanOrEqual(previous)
      previous = zoom
      const centre = await location.locator('[data-map-camera]').evaluate((node) => {
        const point = new DOMPoint(695, 370).matrixTransform(
          new DOMMatrix(getComputedStyle(node).transform),
        )
        return { x: point.x, y: point.y }
      })
      expect(centre.x).toBeCloseTo(500, 1)
      expect(centre.y).toBeCloseTo(500, 1)
    }
    expect(previous).toBeGreaterThan(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const placement = await location.evaluate((node) => {
      const last = node.querySelector('.tile-copy p:last-child')!.getBoundingClientRect()
      const action = node.querySelector('.location-action')!.getBoundingClientRect()
      const button = node.querySelector('.location-button')!.getBoundingClientRect()
      return { gap: action.top - last.bottom, centre: (button.left + button.right) / 2 }
    })
    expect(placement.gap).toBeGreaterThanOrEqual(60)
    expect(placement.centre).toBeCloseTo(width / 2, 0)
  })
}

test('location observers and animations stop when its island is removed', async ({ page }) => {
  await page.goto('/temple-location')
  await expect(page.locator('.facts-grid')).toHaveAttribute('data-location-ready', '')
  await page.locator('.facts-grid').evaluate((node) => {
    const camera = node.querySelector('[data-map-camera]')!
    const state = { updates: 0, node }
    const observer = new MutationObserver(() => state.updates++)
    observer.observe(camera, { attributes: true })
    Object.assign(window, { locationState: state, locationObserver: observer })
  })
  await page.getByRole('link', { name: 'Return to fixture' }).click()
  await expect(page).toHaveURL('/fixture')
  const stopped = await page.evaluate(async () => {
    const { locationState: state, locationObserver: observer } = window as typeof window & {
      locationState: { updates: number; node: HTMLElement }
      locationObserver: MutationObserver
    }
    const before = state.updates
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('resize'))
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
    observer.disconnect()
    return (
      !state.node.isConnected &&
      !state.node.hasAttribute('data-location-ready') &&
      state.updates === before
    )
  })
  expect(stopped).toBe(true)
})
