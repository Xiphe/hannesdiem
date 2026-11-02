import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`local navigation follows the opener and sticks without covering its target at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-navigation')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const header = page.locator('.temple-top-navigation')
    expect((await header.boundingBox())!.y).toBeGreaterThanOrEqual(900)
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
  const readable = await title.locator('canvas').evaluate((node) => {
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
