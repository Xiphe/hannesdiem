import { expect, test } from '@playwright/test'

for (const interaction of ['hover', 'click'] as const) {
  test(`the liquid wraps a place with a concave connection after ${interaction}`, async ({
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
    const button = circle.locator('.fact-circle-invite')
    const box = await button.boundingBox()
    const resting = await circle.locator('.fact-circle-surface path').getAttribute('d')
    await circle.locator('input[value="3"]')[interaction]()
    if (interaction === 'click') await page.getByRole('button', { name: 'Close signup' }).click()
    await expect(circle).toHaveAttribute('data-target', '3')
    const wrapped = () =>
      circle.evaluate((root) => {
        const path = root.querySelector<SVGPathElement>('.fact-circle-surface path')!
        const inverse = path.getScreenCTM()!.inverse()
        const dot = root
          .querySelector('.fact-circle-place:has(input[value="3"]) .fact-circle-dot')!
          .getBoundingClientRect()
        const centre = root.querySelector('.fact-circle-invite')!.getBoundingClientRect()
        const cx = centre.x + centre.width / 2,
          cy = centre.y + centre.height / 2
        const dx = dot.x + dot.width / 2 - cx,
          dy = dot.y + dot.height / 2 - cy
        const length = Math.hypot(dx, dy)
        const inside = (x: number, y: number) =>
          path.isPointInFill(new DOMPoint(x, y).matrixTransform(inverse))
        const aroundDot = Array.from({ length: 12 }, (_, i) => {
          const angle = (i * Math.PI) / 6
          const radius = dot.width / 2 + 3
          return inside(cx + dx + Math.cos(angle) * radius, cy + dy + Math.sin(angle) * radius)
        }).every(Boolean)
        const joined = Array.from({ length: 16 }, (_, i) =>
          inside(cx + (dx * i) / 15, cy + (dy * i) / 15),
        ).every(Boolean)
        const waist = [1, -1].every(
          (sign) =>
            !inside(
              cx + dx * 0.66 - ((sign * dy) / length) * 21,
              cy + dy * 0.66 + ((sign * dx) / length) * 21,
            ),
        )
        return { aroundDot, joined, waist }
      })
    await expect.poll(wrapped).toEqual({ aroundDot: true, joined: true, waist: true })
    expect(await button.boundingBox()).toEqual(box)
    expect(
      await circle.locator('.fact-circle-surface').evaluate((el) => getComputedStyle(el).rotate),
    ).toBe('none')
    // Rapid input changes keep the rendered material moving; it settles around
    // the selected place even when earlier pools are still draining.
    await circle.locator('input[value="7"]')[interaction]()
    if (interaction === 'click') await page.getByRole('button', { name: 'Close signup' }).click()
    await page.waitForTimeout(100)
    await circle.locator('input[value="2"]')[interaction]()
    if (interaction === 'click') await page.getByRole('button', { name: 'Close signup' }).click()
    await expect(circle).toHaveAttribute('data-target', '2')
    const path = circle.locator('.fact-circle-surface path')
    const before = await path.getAttribute('d')
    await expect.poll(() => path.getAttribute('d')).not.toBe(before)
    if (interaction === 'hover') {
      await page.mouse.move(0, 0)
      await expect(circle).not.toHaveAttribute('data-pointing')
      await expect(path).toHaveAttribute('d', resting!)
      await page.waitForTimeout(150)
      expect(await path.getAttribute('d')).toBe(resting)
    }
  })
}

test('reduced motion follows the pointer between dots and stops after disposal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-facts')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const circle = page.locator('#fixture-share .fact-circle')
  await circle.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
  const path = circle.locator('.fact-circle-surface path')
  const resting = await path.getAttribute('d')
  const input = circle.locator('input[value="3"]')
  await input.hover()
  const dot = (await input.boundingBox())!
  await expect(circle).toHaveAttribute('data-target', '3')
  const before = await path.getAttribute('d')
  await page.mouse.move(dot.x + dot.width / 2 - 10, dot.y + dot.height / 2 + 12)
  await expect(circle).toHaveAttribute('data-target', '3')
  expect(await path.getAttribute('d')).not.toBe(before)
  const stationary = await path.getAttribute('d')
  await page.waitForTimeout(150)
  expect(await path.getAttribute('d')).toBe(stationary)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect.poll(() => path.getAttribute('d')).not.toBe(stationary)
  // Pause the active renderer offscreen, then resume its held pool.
  await circle.evaluate(
    (el) =>
      new Promise<void>((resolve) => {
        const observer = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) {
            observer.disconnect()
            resolve()
          }
        })
        observer.observe(el)
        el.style.transform = 'translateY(5000px)'
      }),
  )
  const sleeping = await path.getAttribute('d')
  await page.waitForTimeout(150)
  expect(await path.getAttribute('d')).toBe(sleeping)
  await circle.evaluate((el) => {
    el.style.transform = ''
  })
  await expect.poll(() => path.getAttribute('d')).not.toBe(sleeping)
  await path.evaluate((el) => Object.assign(window, { retiredCirclePath: el }))
  await page.getByRole('link', { name: 'Return to fixture' }).click()
  await expect(page).toHaveURL('/fixture')
  await expect
    .poll(() => page.evaluate(() => (window as any).retiredCirclePath.isConnected))
    .toBe(false)
  await expect
    .poll(() => page.evaluate(() => (window as any).retiredCirclePath.getAttribute('d')))
    .toBe(resting)
  const retired = await page.evaluate(() => (window as any).retiredCirclePath.getAttribute('d'))
  await page.mouse.move(500, 500)
  await page.setViewportSize({ width: 500, height: 700 })
  await page.waitForTimeout(200)
  expect(await page.evaluate(() => (window as any).retiredCirclePath.getAttribute('d'))).toBe(
    retired,
  )
})
