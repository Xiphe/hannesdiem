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
  await expect(page.locator('#fixture-watch .temple-signup a')).toHaveAttribute(
    'href',
    '/newsletter/temple',
  )
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
    'fixture-share',
  ])
  await expect(page.locator('.fact-story img')).toHaveCount(5)
  const spots = page.locator('#fixture-share .fact-circle input[type="radio"]')
  await expect(spots).toHaveCount(10)
  await expect(spots.nth(9)).toBeChecked()
  await expect(spots.nth(9)).toBeDisabled()
  await expect(page.locator('#fixture-share .fact-circle-prompt')).toHaveText(
    'Synthetic circle invitation',
  )
  await spots.nth(2).check()
  await expect(spots.nth(2)).toBeChecked()
  await spots.nth(6).check()
  await expect(spots.nth(6)).toBeChecked()
  await expect(spots.nth(2)).not.toBeChecked()
  await expect(spots.nth(9)).toBeChecked()
  await expect(page.locator('#fixture-share .fact-action')).toHaveCount(0)
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
      for (const id of ['fixture-watch', 'fixture-create', 'fixture-share']) {
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
          const action = section.querySelector('.fact-action')?.getBoundingClientRect()
          return {
            inside,
            overlap: previous.bottom - boundary.top,
            actionX: action ? action.left + action.width / 2 : null,
          }
        })
        expect(geometry.inside).toBe(true)
        expect(geometry.overlap).toBeLessThanOrEqual(1)
        if (geometry.actionX !== null) expect(geometry.actionX).toBeCloseTo(width / 2, 0)
      }
      const circleLayout = await page.locator('#fixture-share').evaluate((section) => {
        const copy = section.querySelector('.fact-copy-tile')!
        const circle = section.querySelector('.fact-circle')!
        const photo = section.querySelector('.fact-primary-photo')!.getBoundingClientRect()
        const box = circle.getBoundingClientRect()
        const topDot = circle.querySelector('input[value="1"]')!.getBoundingClientRect()
        const bottomDot = circle.querySelector('input[value="6"]')!.getBoundingClientRect()
        return {
          below: box.top - copy.getBoundingClientRect().bottom,
          rightOfPhotoCentre: box.x + box.width / 2 - photo.x - photo.width / 2,
          followsCopy: Boolean(
            copy.compareDocumentPosition(circle) & Node.DOCUMENT_POSITION_FOLLOWING,
          ),
          dotSpread: bottomDot.y - topDot.y,
        }
      })
      expect(circleLayout.followsCopy).toBe(true)
      expect(circleLayout.dotSpread).toBeGreaterThan(150)
      if (width <= 760) expect(circleLayout.below).toBeGreaterThanOrEqual(0)
      else expect(circleLayout.rightOfPhotoCentre).toBeGreaterThan(0)
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

for (const width of [390, 1440]) {
  test(`circle guides selection toward free places at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-facts')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const circle = page.locator('#fixture-share .fact-circle')
    const invite = circle.getByRole('button', { name: 'Synthetic circle invitation' })
    const held = circle.locator('input[value="10"]')
    const free = circle.locator('input[value="6"]')
    const surface = circle.locator('.fact-circle-surface path')
    const rest = await surface.evaluate((path: SVGPathElement) => ({
      width: path.getBBox().width,
      height: path.getBBox().height,
    }))
    // A dot activates the effect directly, without visiting the centre first.
    await free.hover()
    await expect(circle).toHaveAttribute('data-pointing', '')
    await expect(circle).toHaveAttribute('data-target', '6')
    await held.hover()
    await expect(circle).not.toHaveAttribute('data-pointing')
    await invite.hover({ position: { x: 4, y: 4 } })
    await expect(circle).toHaveAttribute('data-pointing', '')
    await expect(circle).not.toHaveAttribute('data-target', '10')
    const box = (await invite.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4)
    await expect(circle).toHaveAttribute('data-target', '6')
    await expect(circle.locator('.fact-circle-prompt')).toHaveCSS('opacity', '1')
    await expect
      .poll(() => surface.evaluate((path: SVGPathElement) => path.getBBox().height))
      .toBeGreaterThan(rest.height + 6)
    const pulled = await surface.evaluate((path: SVGPathElement) => ({
      width: path.getBBox().width,
      height: path.getBBox().height,
    }))
    expect(pulled.width).toBeGreaterThanOrEqual(rest.width)
    // The longer pull stops near the dot, while leaving a visible gap.
    await expect
      .poll(async () => {
        const dot = await free.locator('..').locator('.fact-circle-dot').boundingBox()
        const outline = await surface.boundingBox()
        return dot!.y - outline!.y - outline!.height
      })
      .toBeLessThan(15)
    const dot = (await free.locator('..').locator('.fact-circle-dot').boundingBox())!
    const outline = (await surface.boundingBox())!
    expect(dot.y - outline.y - outline.height).toBeGreaterThan(4)
    await expect(free).not.toBeChecked()
    // Only the perimeter pulls outward; the body, label and hit area stay put.
    expect(await invite.boundingBox()).toEqual(box)
    await page.mouse.down()
    await page.mouse.up()
    await expect(free).toBeFocused()
    await expect(free).toBeChecked()
    await expect(held).toBeChecked()
    const ripple = free.locator('..').locator('.fact-circle-ripple')
    await expect.poll(() => ripple.evaluate((node) => node.getAnimations().length)).toBe(1)
    await expect.poll(() => ripple.evaluate((node) => node.getAnimations().length)).toBe(0)
    await page.mouse.move(box.x + box.width / 2 + 1, box.y + box.height - 4)
    await expect(circle).toHaveAttribute('data-pointing', '')
    await expect(circle).not.toHaveAttribute('data-target', '6')
    await page.mouse.move(0, 0)
    await expect(circle).not.toHaveAttribute('data-pointing')
    await expect(circle.locator('.fact-circle-prompt')).toHaveCSS('opacity', '1')
    await invite.focus()
    await expect(circle).toHaveAttribute('data-pointing', '')
    await page.keyboard.press('Enter')
    await expect(circle.locator('input[value="1"]')).toBeFocused()
    await expect(circle.locator('input[value="1"]')).toBeChecked()
    await expect(held).toBeChecked()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const third = circle.locator('input[value="3"]')
    await third.check()
    expect(
      await third
        .locator('..')
        .locator('.fact-circle-ripple')
        .evaluate((node) => node.getAnimations().length),
    ).toBe(0)
  })
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
  await expect
    .poll(() =>
      page.evaluate(() => {
        const { node, material, style } = (window as any).retiredFact
        return !node.hasAttribute('data-material-ready') && material.getAttribute('style') === style
      }),
    )
    .toBe(true)
})
