import { expect, test } from '@playwright/test'

for (const offset of [0, 320]) {
  test(`scrubbing back stops before the header disappears with ${offset}px before the artwork`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/temple-navigation')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await page.locator('.temple-artwork').evaluate((node, offset) => {
      const spacer = document.createElement('div')
      spacer.style.height = `${offset}px`
      node.parentNode!.insertBefore(spacer, node)
      // An unmapped first interval exposes the inverse timeline's page-zero end.
      node.querySelector('a[data-nav-stop]')!.setAttribute('href', '#synthetic-unmapped-start')
      scrollTo(0, 200 + offset)
    }, offset)
    const header = page.locator('.temple-top-navigation')
    const nav = page.locator('.temple-nav-items')
    await expect(header).toBeVisible()
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        }),
    )
    const box = (await nav.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(150, 0)
    await expect.poll(() => nav.evaluate((node) => node.scrollLeft)).toBeGreaterThan(100)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400 + offset)
    await page.mouse.wheel(-10000, 0)
    await expect.poll(() => nav.evaluate((node) => node.scrollLeft)).toBe(0)
    // Let native scrolling, the scrub frame and visibility observation settle.
    await page.waitForTimeout(200)
    await expect
      .poll(() => header.evaluate((node) => node.hasAttribute('data-nav-visible')))
      .toBe(true)
    expect(
      await page.locator('.temple-stage').evaluate((node) => node.getBoundingClientRect().top),
    ).toBeLessThan(0)
    await page.setViewportSize({ width: 390, height: 700 })
    await page.evaluate((offset) => scrollTo(0, 200 + offset), offset)
    await expect(header).toBeVisible()
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        }),
    )
    const resized = (await nav.boundingBox())!
    await page.mouse.move(195, resized.y + resized.height / 2)
    await page.mouse.wheel(150, 0)
    await expect.poll(() => nav.evaluate((node) => node.scrollLeft)).toBeGreaterThan(100)
    await page.mouse.move(100, resized.y + resized.height / 2)
    await page.mouse.down()
    await page.mouse.move(380, resized.y + resized.height / 2, { steps: 12 })
    await page.mouse.up()
    await expect.poll(() => nav.evaluate((node) => node.scrollLeft)).toBe(0)
    await page.waitForTimeout(200)
    await expect(header).toBeVisible()
    const top = await page
      .locator('.temple-stage')
      .evaluate((node) => node.getBoundingClientRect().top)
    expect(top).toBeLessThan(0)
    expect(top).toBeGreaterThan(-2)
    // Ordinary page scrolling can still reach the opener and hide the header.
    await page.evaluate((offset) => scrollTo(0, offset), offset)
    await expect(header).not.toBeVisible()
  })
}

test('later section labels align with the centre of their visible areas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-navigation')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page.evaluate(() => {
    const labels = document.querySelectorAll<HTMLAnchorElement>(
      '.temple-nav-items > a:not(.temple-nav-separator-link)',
    )
    const pairs = document.querySelectorAll('.first-pair')
    const insertAfter = (anchor: Node, node: Node) =>
      anchor.parentNode!.insertBefore(node, anchor.nextSibling)
    let previous: HTMLElement | undefined
    for (const [index, height] of [600, 750, 500].entries()) {
      const area = document.createElement('section')
      area.id = `synthetic-centred-area-${index}`
      area.dataset.navVisual = ''
      area.style.cssText = `height:${height}px;background:gray`
      if (index === 0) insertAfter(pairs[0], area)
      else if (index === 1) insertAfter(pairs[1], area)
      else insertAfter(previous!, area)
      previous = area
      labels[index + 1].href = `#${area.id}`
      labels[index + 1].removeAttribute('aria-disabled')
    }
    const tail = document.createElement('div')
    tail.id = 'synthetic-centre-tail'
    tail.style.height = '1500px'
    insertAfter(previous!, tail)
  })
  for (const index of [0, 1, 2, 1, 0]) {
    const area = page.locator(`#synthetic-centred-area-${index}`)
    await area.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      scrollTo(0, scrollY + rect.top + rect.height / 2 - innerHeight / 2)
    })
    const label = page.locator(`.temple-nav-items > a[href="#synthetic-centred-area-${index}"]`)
    await expect
      .poll(async () =>
        Math.abs(
          await label.evaluate((node) => {
            const rect = node.getBoundingClientRect()
            const nav = node.closest('nav')!.getBoundingClientRect()
            return rect.left + rect.width / 2 - nav.left - nav.width / 2
          }),
        ),
      )
      .toBeLessThanOrEqual(1)
  }
})

for (const width of [320, 390, 768]) {
  test(`mobile timeline centres its endpoints and follows page scroll at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/temple-navigation')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const nav = page.locator('.temple-nav-items')
    const centre = () =>
      nav.evaluate((node) => {
        const word = node.querySelector('[data-nav-stop]')!.getBoundingClientRect()
        const area = node.getBoundingClientRect()
        return word.left + word.width / 2 - area.left - area.width / 2
      })
    await expect.poll(centre).toBeCloseTo(0, 0)
    await page.evaluate(() => scrollTo(0, 200))
    await expect(page.locator('.temple-top-navigation')).toBeVisible()
    const brand = (await page.locator('.temple-nav-brand').boundingBox())!
    expect(brand.x + brand.width / 2).toBeCloseTo(width / 2, 0)
    expect((await page.locator('.temple-nav-logo').boundingBox())!.x).toBe(0)
    const style = await nav.evaluate((node) => ({
      scrollbar: getComputedStyle(node).scrollbarWidth,
      fade: getComputedStyle(node).maskImage,
    }))
    expect(style.scrollbar).toBe('none')
    expect(style.fade).toContain('linear-gradient')
    const rail = (await page.locator('.temple-nav-progress').boundingBox())!
    const header = (await page.locator('.temple-top-navigation').boundingBox())!
    expect(rail.x).toBe(0)
    expect(rail.width).toBe(width)
    expect(rail.y + rail.height).toBeCloseTo(header.y + header.height, 0)
    const marker = page.locator('.temple-nav-progress span')
    expect((await marker.boundingBox())!.width).toBe(64)
    expect(await marker.evaluate((node) => getComputedStyle(node).backgroundImage)).toContain(
      'linear-gradient',
    )
    const before = await page.evaluate(() => scrollY)
    const box = (await nav.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(100, 0)
    await expect
      .poll(async () => Math.abs((await nav.evaluate((node) => node.scrollLeft)) - 100))
      .toBeLessThanOrEqual(1)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100)
    // The native wheel event and its page update are delivered in separate frames.
    const middle = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve(scrollY)))
        }),
    )
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
    await expect
      .poll(async () =>
        Math.abs(
          await nav.evaluate((node) => {
            const word = node.querySelector('[data-nav-stop]:last-of-type')!.getBoundingClientRect()
            const area = node.getBoundingClientRect()
            return word.left + word.width / 2 - area.left - area.width / 2
          }),
        ),
      )
      .toBeLessThan(1)
    await page.evaluate((y) => scrollTo(0, y), middle)
    // WebKit rounds the page and native scroller independently to whole pixels.
    await expect
      .poll(async () => Math.abs((await nav.evaluate((node) => node.scrollLeft)) - 100))
      .toBeLessThanOrEqual(1)
    await page.setViewportSize({ width: 1440, height: 844 })
    await expect.poll(() => nav.evaluate((node) => node.scrollLeft)).toBe(0)
    await expect(page.locator('.temple-nav-progress')).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(() =>
          Math.abs(
            document.querySelector('.temple-nav-progress')!.getBoundingClientRect().bottom -
              document.querySelector('.temple-nav-items')!.getBoundingClientRect().bottom,
          ),
        ),
      )
      .toBeLessThan(1)
    await page.setViewportSize({ width, height: 844 })
    await page.evaluate(() => scrollTo(0, 0))
    await expect.poll(centre).toBeCloseTo(0, 0)
  })
}

test('dragging the mobile timeline scrubs without activating its link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-navigation')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page.evaluate(() => scrollTo(0, 200))
  const nav = page.locator('.temple-nav-items')
  const box = (await nav.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2, { steps: 12 })
  await page.mouse.up()
  await expect.poll(() => nav.evaluate((node) => node.scrollLeft)).toBeGreaterThan(60)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400)
  await expect(page).toHaveURL('/temple-navigation')
  await page.waitForTimeout(150)
  const resting = await page.evaluate(() => scrollY)
  await page.waitForTimeout(200)
  expect(await page.evaluate(() => scrollY)).toBe(resting)
})

test('native horizontal touch scrubs while a vertical swipe still scrolls normally', async ({
  browser,
  browserName,
  baseURL,
}) => {
  test.skip(browserName !== 'chromium', 'Native touch swipes use the Chromium input protocol')
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  })
  try {
    const page = await context.newPage()
    await page.goto('/temple-navigation')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await page.evaluate(() => scrollTo(0, 200))
    const nav = page.locator('.temple-nav-items')
    const box = (await nav.boundingBox())!
    const cdp = await context.newCDPSession(page)
    const pan = async (fromX: number, fromY: number, toX: number, toY: number) => {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: fromX, y: fromY }],
      })
      for (let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [
            {
              x: fromX + ((toX - fromX) * i) / 12,
              y: fromY + ((toY - fromY) * i) / 12,
            },
          ],
        })
        await page.waitForTimeout(20)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    await pan(300, box.y + 22, 160, box.y + 22)
    await expect.poll(() => nav.evaluate((node) => node.scrollLeft)).toBeGreaterThan(100)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400)
    await expect(page).toHaveURL('/temple-navigation')
    await page.waitForTimeout(300)
    const before = await page.evaluate(() => scrollY)
    await pan(200, box.y + 35, 200, box.y - 20)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 20)
  } finally {
    await context.close()
  }
})

test('mobile wordmark material covers both ends of the native lettering', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-navigation')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page.evaluate(() => scrollTo(0, 200))
  const title = page.locator('.temple-nav-title')
  await expect(title).toHaveAttribute('data-ink-ready', '')
  const bounds = await title.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const { width, height } = canvas
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, width, height).data
    let left = width,
      right = 0
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if (pixels[(y * width + x) * 4 + 3] < 20) continue
        left = Math.min(left, x)
        right = Math.max(right, x)
      }
    return { left: left / width, right: right / width }
  })
  expect(bounds.left).toBeLessThan(0.1)
  expect(bounds.right).toBeGreaterThan(0.9)
  // Labels initially beyond the viewport must retain complete material when revealed.
  const nav = page.locator('.temple-nav-items')
  await nav.evaluate((node) => {
    node.scrollLeft = node.scrollWidth
  })
  const lastCanvas = nav.locator('.temple-nav-item-ink').last().locator('canvas')
  await expect
    .poll(() =>
      lastCanvas.evaluate((canvas: HTMLCanvasElement) => {
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
        let right = 0
        for (let y = 0; y < canvas.height; y++)
          for (let x = 0; x < canvas.width; x++) {
            if (pixels[(y * canvas.width + x) * 4 + 3] > 20) right = Math.max(right, x)
          }
        return right / canvas.width
      }),
    )
    .toBeGreaterThan(0.9)
})

test('the menu opens from the left without automatically outlining its brand', async ({ page }) => {
  await page.goto('/fixture-release')
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.navigation-menu')).toBeFocused()
  await expect(dialog.getByRole('link', { name: 'Hannes Diem', exact: true })).not.toBeFocused()
  await expect
    .poll(async () => (await dialog.locator('[data-navigation-panel]').boundingBox())!.x)
    .toBeCloseTo(0, 0)
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('link', { name: 'Hannes Diem', exact: true })).toBeFocused()
})
