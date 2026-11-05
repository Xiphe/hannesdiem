import { expect, test } from '@playwright/test'

for (const interaction of ['hover', 'click'] as const) {
  test(`real liquid responds to ${interaction} without moving native controls`, async ({
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
    const path = circle.locator('.fact-circle-surface path')
    const initial = await path.getAttribute('d')
    await circle.locator('input[value="3"]')[interaction]()
    if (interaction === 'click') await page.getByRole('button', { name: 'Close signup' }).click()
    await expect(circle).toHaveAttribute('data-target', '3')
    await expect.poll(() => path.getAttribute('d')).not.toBe(initial)
    // The measured density travels toward the selected place. It is not a
    // prescribed ring/neck pose: splitting and holes follow the particles.
    await expect
      .poll(() =>
        path.evaluate((node: SVGPathElement) => {
          const b = node.getBBox()
          return b.x + b.width
        }),
      )
      .toBeGreaterThan(260)
    expect(await path.getAttribute('d')).not.toMatch(/NaN|Infinity/)
    expect(await path.getAttribute('fill-rule')).toBe('evenodd')
    expect(await button.boundingBox()).toEqual(box)
    await circle.locator('input[value="7"]')[interaction]()
    if (interaction === 'click') await page.getByRole('button', { name: 'Close signup' }).click()
    await circle.locator('input[value="2"]')[interaction]()
    if (interaction === 'click') await page.getByRole('button', { name: 'Close signup' }).click()
    await expect(circle).toHaveAttribute('data-target', '2')
    const before = await path.getAttribute('d')
    await expect.poll(() => path.getAttribute('d')).not.toBe(before)
    if (interaction === 'hover') {
      await page.mouse.move(0, 0)
      await expect(circle).not.toHaveAttribute('data-pointing')
      // Release keeps the actual material. It calms and stops spending frames.
      await expect
        .poll(
          () =>
            path.evaluate(async (node) => {
              const before = node.getAttribute('d')
              await new Promise((resolve) => setTimeout(resolve, 150))
              return node.getAttribute('d') === before
            }),
          { timeout: 12_000 },
        )
        .toBe(true)
    }
  })
}

test('reduced motion is static; visible liquid resumes and disposes with its island', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-facts')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const circle = page.locator('#fixture-share .fact-circle')
  await circle.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
  const path = circle.locator('.fact-circle-surface path')
  const rest = await path.getAttribute('d')
  await circle.locator('input[value="3"]').hover()
  await expect(circle).toHaveAttribute('data-target', '3')
  await page.waitForTimeout(150)
  expect(await path.getAttribute('d')).toBe(rest)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect.poll(() => path.getAttribute('d')).not.toBe(rest)
  // Exercise the document lifecycle without relying on whether a headless
  // browser backgrounds another tab in this environment.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const hidden = await path.getAttribute('d')
  await page.waitForTimeout(150)
  expect(await path.getAttribute('d')).toBe(hidden)
  await page.evaluate(() => {
    delete (document as any).hidden
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => path.getAttribute('d')).not.toBe(hidden)
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
    .toBe(rest)
  await page.mouse.move(500, 500)
  await page.setViewportSize({ width: 500, height: 700 })
  await page.waitForTimeout(200)
  expect(await page.evaluate(() => (window as any).retiredCirclePath.getAttribute('d'))).toBe(rest)
})
