import { expect, test } from '@playwright/test'

for (const interaction of ['hover', 'click'] as const) {
  test(`retargeting by ${interaction} carries one point without leaving old arms`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    if (interaction === 'click')
      await page.route('**/circle', (route) =>
        route.fulfill({
          json: {
            ready: true,
            email: 'fixture@example.org',
            name: 'Fixture member',
            csrfToken: 'fixture-csrf',
            places: [],
          },
        }),
      )
    await page.goto(interaction === 'click' ? '/temple-circle' : '/temple-facts')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const circle = page.locator(
      interaction === 'click' ? '#fixture-reservation .fact-circle' : '#fixture-share .fact-circle',
    )
    await circle.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await circle.locator('input[value="3"]')[interaction]()
    if (interaction === 'click') await page.getByRole('button', { name: 'Close signup' }).click()
    await page.waitForTimeout(550)
    await circle.locator('input[value="7"]')[interaction]()
    const arms = await circle
      .locator('.fact-circle-surface path')
      .evaluate(async (path: SVGPathElement) => {
        const counts: number[] = []
        const start = performance.now()
        while (performance.now() - start < 350) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
          const length = path.getTotalLength()
          const points = Array.from({ length: 128 }, (_, index) => {
            const point = path.getPointAtLength((length * index) / 128)
            return {
              angle: Math.atan2(point.y - 50, point.x - 50),
              extended: Math.hypot(point.x - 50, point.y - 50) > 54,
            }
          }).sort((a, b) => a.angle - b.angle)
          counts.push(
            points.filter(
              (point, index) =>
                point.extended && !points[(index + points.length - 1) % points.length].extended,
            ).length,
          )
        }
        return counts
      })
    expect(arms.length).toBeGreaterThan(1)
    expect(Math.max(...arms)).toBe(1)
    await expect(circle).toHaveAttribute('data-target', '7')
    // The remaining point must actually arrive at the requested dot.
    await expect
      .poll(() =>
        circle.evaluate((root) => {
          const path = root.querySelector<SVGPathElement>('.fact-circle-surface path')!
          const matrix = path.getScreenCTM()!
          const body = root.querySelector('.fact-circle-invite')!.getBoundingClientRect()
          const dot = root.querySelector('input[value="7"]')!.getBoundingClientRect()
          const x = body.x + body.width / 2,
            y = body.y + body.height / 2
          const length = path.getTotalLength()
          const points = Array.from({ length: 256 }, (_, index) => {
            const point = path.getPointAtLength((length * index) / 256)
            return new DOMPoint(point.x, point.y).matrixTransform(matrix)
          })
          const tip = points.reduce((a, b) =>
            Math.hypot(b.x - x, b.y - y) > Math.hypot(a.x - x, a.y - y) ? b : a,
          )
          const actual = Math.atan2(tip.y - y, tip.x - x)
          const expected = Math.atan2(dot.y + dot.height / 2 - y, dot.x + dot.width / 2 - x)
          return Math.abs(Math.atan2(Math.sin(actual - expected), Math.cos(actual - expected)))
        }),
      )
      .toBeLessThan(0.04)
  })
}
