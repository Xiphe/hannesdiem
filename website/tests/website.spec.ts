import { expect, test } from '@playwright/test'

test('published CMS input renders without browser JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    expect((await page.goto('/fixture'))?.status()).toBe(200)
    await expect(page.locator('main')).toContainText('Synthetic page')
    await expect(page).toHaveTitle(/Synthetic title/)
    expect(await page.locator('style[data-rmx-style]').count()).toBeGreaterThan(0)
  } finally {
    await context.close()
  }
})

test('navigation hydrates independently and loads newsletter state when opened', async ({
  page,
}) => {
  const errors: string[] = []
  let requests = 0
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/login', (route) => {
    requests++
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ready: true, csrfToken: 'test-csrf' }),
    })
  })
  await page.goto('/fixture', { waitUntil: 'networkidle' })
  expect(requests).toBe(0)
  await page.evaluate(() => {
    Object.assign(window, { staticRoot: document.querySelector('main'), mutations: 0 })
    new MutationObserver((records) => {
      ;(window as any).mutations += records.length
    }).observe(document.querySelector('main')!, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    })
  })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('region', { name: 'Newsletter', exact: true })).toBeVisible()
  await expect.poll(() => requests).toBe(1)
  await dialog.getByText('Fixture', { exact: true }).first().click()
  await expect(dialog.getByRole('link', { name: 'Fixture', exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => ({
      same: (window as any).staticRoot === document.querySelector('main'),
      mutations: (window as any).mutations,
    })),
  ).toEqual({ same: true, mutations: 0 })
  await page.getByRole('button', { name: 'Close navigation' }).click()
  await expect(dialog).not.toBeVisible()
  expect(errors).toEqual([])
})

test('Temple opening enhances only its island and leaves static verse unchanged', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-of-sound')
  const opening = page.locator('.temple-opening')
  await expect(opening).toHaveAttribute('data-ready', 'true')
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0)
  await expect(page.locator('select, input, nav')).toHaveCount(0)
  await page.evaluate(() => {
    const verse = document.querySelector('[data-poem-text]')!
    Object.assign(window, {
      templeVerse: verse,
      verseMutations: 0,
      oldCanvas: document.querySelector('canvas'),
    })
    new MutationObserver((records) => {
      ;(window as any).verseMutations += records.length
    }).observe(verse, { subtree: true, childList: true, attributes: true, characterData: true })
  })
  for (const fraction of [0.05, 0.1, 0.15, 0.3]) {
    await page.evaluate((value) => scrollTo(0, innerHeight * value), fraction)
    await page.waitForTimeout(30)
  }
  expect((await page.locator('.temple-date').boundingBox())!.y).toBeLessThan(0)
  await expect(page.locator('.temple-scroll-hint')).toHaveCSS('opacity', '0')
  await page.evaluate(() => scrollTo(0, 0))
  await expect(page.locator('.temple-scroll-hint')).toHaveCSS('opacity', '1')
  expect(
    await page.evaluate(() => ({
      same: (window as any).templeVerse === document.querySelector('[data-poem-text]'),
      mutations: (window as any).verseMutations,
    })),
  ).toEqual({ same: true, mutations: 0 })
  await page.getByRole('link', { name: 'Return to fixture' }).click()
  await expect(page).toHaveURL(/\/fixture$/)
  await expect(page.locator('.temple-opening')).toHaveCount(0)
  await page.goBack()
  await expect(page.locator('.temple-opening')).toHaveAttribute('data-ready', 'true')
  expect(errors).toEqual([])
})

test('Temple keeps the title and static verse readable without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    expect((await page.goto('/temple-of-sound'))?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Temple of Sound' })).toBeVisible()
    await expect(page.locator('[data-poem-text]')).toContainText('Static verse fixture')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://hannesdiem.de/temple-of-sound',
    )
  } finally {
    await context.close()
  }
})

test('Temple fits mobile and its animation stops when navigated away', async ({ page }) => {
  await page.addInitScript(() => {
    const paints = new WeakMap<HTMLCanvasElement, number>()
    ;(window as any).templePaints = paints
    const original = CanvasRenderingContext2D.prototype.clearRect
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) {
      paints.set(this.canvas, (paints.get(this.canvas) ?? 0) + 1)
      original.call(this, x, y, w, h)
    }
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/temple-of-sound')
  await expect(page.locator('.temple-opening')).toHaveAttribute('data-ready', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.setViewportSize({ width: 900, height: 700 })
  await expect
    .poll(() => page.locator('canvas').evaluate((c) => (c as HTMLCanvasElement).height))
    .toBe(700)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.locator('canvas').evaluate((c) => (c as HTMLCanvasElement).height))
    .toBe(844)
  await page.evaluate(() =>
    Object.assign(window, { oldTempleCanvas: document.querySelector('canvas') }),
  )
  await page.getByRole('link', { name: 'Return to fixture' }).click()
  await expect(page).toHaveURL(/\/fixture$/)
  await expect(page.locator('.temple-opening')).toHaveCount(0)
  const stopped = await page.evaluate(() =>
    (window as any).templePaints.get((window as any).oldTempleCanvas),
  )
  expect(stopped).toBeDefined()
  await page.waitForTimeout(100)
  expect(
    await page.evaluate(() => (window as any).templePaints.get((window as any).oldTempleCanvas)),
  ).toBe(stopped)
})
