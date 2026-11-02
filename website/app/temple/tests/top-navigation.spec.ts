import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`local navigation becomes fixed as the opener exits without covering its target at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-navigation')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const header = page.locator('.temple-top-navigation')
    await expect(header).not.toBeVisible()
    await expect(header.locator('.temple-nav-title canvas')).not.toBeVisible()
    const exit = await page
      .locator('.temple-title-track')
      .evaluate(
        (node) =>
          scrollY +
          node.getBoundingClientRect().bottom -
          node.querySelector<HTMLElement>('.temple-stage')!.offsetHeight,
      )
    await page.evaluate((y) => scrollTo(0, y), exit - 2)
    await expect(header).not.toBeVisible()
    await expect(header.locator('.temple-nav-title canvas')).not.toBeVisible()
    await page.evaluate((y) => scrollTo(0, y), exit + 8)
    await expect(header).toBeVisible()
    expect(
      (await page.locator('.temple-opening').boundingBox())!.y +
        (await page.locator('.temple-opening').boundingBox())!.height,
    ).toBeGreaterThan(0)
    expect(await header.evaluate((node) => getComputedStyle(node).position)).toBe('fixed')
    await expect(header.locator('.temple-nav-items a')).toHaveText([
      'First target',
      'Second target',
      'Third target',
      'Fourth target',
      'Fifth target',
      'Sixth target',
      'Seventh target',
    ])
    await expect(header.locator('[aria-disabled=true]')).toHaveCount(6)
    await page
      .locator('.temple-opening')
      .evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().bottom + 30))
    await expect.poll(async () => (await header.boundingBox())!.y).toBeCloseTo(0, 0)
    await header.getByRole('link', { name: 'First target' }).click()
    await expect(page).toHaveURL(/#facts$/)
    await expect(page.locator('.facts-grid')).toBeFocused()
    const box = (await header.boundingBox())!
    expect((await page.locator('.facts-grid').boundingBox())!.y).toBeGreaterThanOrEqual(
      box.height - 1,
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const row = header.locator('.temple-nav-items')
    if (width === 390) {
      expect(await row.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true)
      await row.evaluate((node) => {
        node.scrollLeft = node.scrollWidth
      })
      const last = (await row.locator('a').last().boundingBox())!
      const track = (await row.boundingBox())!
      expect(last.x + last.width).toBeLessThanOrEqual(track.x + track.width + 1)
    }
    await header.getByRole('link', { name: 'Temple of Sound' }).click()
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    await expect(header).not.toBeVisible()
    await expect(header.locator('.temple-nav-title canvas')).not.toBeVisible()
  })
}

test('brand opens the normal navigation, supports keyboard dismissal and loads its newsletter on demand', async ({
  page,
}) => {
  await page.goto('/temple-navigation')
  await page
    .locator('.temple-opening')
    .evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().bottom + 30))
  const trigger = page.getByRole('button', { name: 'Open menu', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await expect(dialog).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(dialog.getByRole('navigation', { name: 'Main Navigation' })).toBeVisible()
  await expect(dialog.locator('.newsletter-skeleton')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Close navigation' }).click()
  await expect(dialog).not.toBeVisible()
})

test('native navigation works without artwork or browser JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  await page.goto('/temple-navigation')
  await page
    .locator('.temple-opening')
    .evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().bottom))
  const header = page.locator('.temple-top-navigation')
  await expect(header).toBeVisible()
  await expect(header.locator('.temple-nav-title-ink')).toBeVisible()
  await header.getByRole('link', { name: 'First target' }).click()
  await expect(page).toHaveURL(/#facts$/)
  await header.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toBeVisible()
  await context.close()
})

test('navigation shares the material renderer, freezes with reduced motion and disposes on navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await page.goto('/temple-navigation')
  const title = page.locator('.temple-nav-title')
  await page
    .locator('.temple-opening')
    .evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().bottom + 30))
  await expect(title).toHaveAttribute('data-ink-ready', '')
  const pixels = () =>
    title.locator('canvas').evaluate((node) => {
      const canvas = node as HTMLCanvasElement
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
      return {
        alpha: data.reduce((sum, n, i) => sum + (i % 4 === 3 ? n : 0), 0),
        frame: canvas.toDataURL(),
      }
    })
  await expect.poll(async () => (await pixels()).alpha).toBeGreaterThan(1000)
  const item = page.locator('.temple-nav-item-ink').first()
  await expect(item).toHaveAttribute('data-copy-cloud', '')
  expect(await item.evaluate((node) => getComputedStyle(node).fontFamily)).toContain(
    'UnboundedCopy',
  )
  const readable = await item.locator('canvas').evaluate((node) => {
    const canvas = node as HTMLCanvasElement
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    const luminance = (rgb: number[]) =>
      rgb
        .map((n) => n / 255)
        .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
        .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0)
    const background = luminance(
      getComputedStyle(canvas.closest('header')!)
        .backgroundColor.match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number),
    )
    let solid = 0,
      contrasting = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 240) continue
      solid++
      const foreground = luminance([data[i], data[i + 1], data[i + 2]])
      if (
        (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) >=
        4.5
      )
        contrasting++
    }
    return contrasting / solid
  })
  expect(readable).toBeGreaterThan(0.9)
  const before = await pixels()
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  expect((await pixels()).frame).toBe(before.frame)
  await title.locator('canvas').evaluate((node) => {
    Object.assign(window, { oldNavigationCanvas: node })
  })
  await page.getByRole('link', { name: 'Return to fixture' }).click()
  await expect(page).toHaveURL('/fixture')
  expect(
    await page.evaluate(() => {
      const canvas = (window as typeof window & { oldNavigationCanvas: HTMLCanvasElement })
        .oldNavigationCanvas
      return (
        !canvas.isConnected &&
        canvas.width === 0 &&
        canvas.height === 0 &&
        !canvas.parentElement!.hasAttribute('data-ink-ready')
      )
    }),
  ).toBe(true)
})

test('Temple header logo and favicon share the Temple palette', async ({ page }) => {
  await page.goto('/temple-navigation')
  const mark = await page.locator('.temple-nav-logo img').getAttribute('src')
  await expect(page.locator('link[rel=icon]')).toHaveAttribute('href', mark!)
})

test('fixed navigation remains available when artwork enhancement fails', async ({ page }) => {
  await page.route('**/*.ttf', (route) => route.abort())
  await page.goto('/temple-navigation')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'fallback')
  await page.evaluate(() => scrollTo(0, 40))
  const header = page.locator('.temple-top-navigation')
  await expect(header).toBeVisible()
  await header.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toBeVisible()
})

test('header slides down from above and keeps its dates beneath the wordmark', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/temple-navigation')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const header = page.locator('.temple-top-navigation')
  const motion = await header.evaluate(async (node) => {
    const stage = document.querySelector<HTMLElement>('.temple-stage')!
    const track = document.querySelector('.temple-title-track')!
    scrollTo(0, scrollY + track.getBoundingClientRect().bottom - stage.offsetHeight + 10)
    for (let i = 0; i < 20; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const animation = node
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSTransition && animation.transitionProperty === 'transform',
        )
      if (!animation) continue
      animation.pause()
      animation.currentTime = Number(animation.effect!.getTiming().duration) / 2
      const rect = node.getBoundingClientRect()
      const result = { y: rect.top, height: rect.height }
      animation.finish()
      return result
    }
    return null
  })
  expect(motion).not.toBeNull()
  expect(motion!.y).toBeGreaterThan(-motion!.height)
  expect(motion!.y).toBeLessThan(-0.5)
  await expect.poll(async () => (await header.boundingBox())!.y).toBeCloseTo(0, 0)
  const date = header.locator('.temple-nav-date')
  await expect(date.locator('time').first()).toHaveAttribute('datetime', '2030-01-01')
  await expect(date.locator('time').last()).toHaveAttribute('datetime', '2030-02-02')
  expect((await date.boundingBox())!.y).toBeGreaterThanOrEqual(
    (await header.locator('.temple-nav-title').boundingBox())!.y +
      (await header.locator('.temple-nav-title').boundingBox())!.height,
  )
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(() =>
        date.evaluate((node) => {
          const text = document.createRange()
          text.selectNodeContents(node)
          const title = node.parentElement!.querySelector('.temple-nav-title')!
          return Math.abs(text.getBoundingClientRect().width - title.getBoundingClientRect().width)
        }),
      )
      .toBeLessThan(1)
  }
})

test('section links move slowly, allow interruption and retain native hash history', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/temple-navigation')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page.evaluate(() => scrollTo(0, 240))
  const link = page.locator('.temple-nav-items').getByRole('link', { name: 'First target' })
  const before = await page.evaluate(() => scrollY)
  await link.click()
  await expect(page).toHaveURL(/#facts$/)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 2)
  await expect(page.locator('.facts-grid')).not.toBeFocused()
  await page.mouse.wheel(0, 20)
  await page.waitForTimeout(300)
  const stopped = await page.evaluate(() => scrollY)
  await page.waitForTimeout(1300)
  expect(Math.abs((await page.evaluate(() => scrollY)) - stopped)).toBeLessThanOrEqual(1)
  await expect(page.locator('.facts-grid')).not.toBeFocused()
  const started = await page.evaluate(() => performance.now())
  await link.click()
  await expect(page.locator('.facts-grid')).toBeFocused()
  expect((await page.evaluate(() => performance.now())) - started).toBeGreaterThanOrEqual(1000)
  await page.goBack()
  await expect(page).toHaveURL(/\/temple-navigation$/)
})

test('reduced motion reaches the section synchronously', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-navigation')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page.evaluate(() => scrollTo(0, 240))
  await expect(page.locator('.temple-top-navigation')).toBeVisible()
  expect(
    await page.locator('.temple-nav-items a[href]').evaluate((node) => {
      ;(node as HTMLAnchorElement).click()
      return document.activeElement === document.querySelector('.facts-grid')
    }),
  ).toBe(true)
})
