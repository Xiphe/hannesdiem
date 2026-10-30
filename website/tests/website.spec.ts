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
  await page.setViewportSize({ width: 844, height: 390 })
  await expect
    .poll(() =>
      page.locator('.temple-stage > canvas').evaluate((c) => (c as HTMLCanvasElement).height),
    )
    .toBe(390)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(844)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() =>
      page.locator('.temple-stage > canvas').evaluate((c) => (c as HTMLCanvasElement).height),
    )
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

for (const scheme of ['light', 'dark'] as const) {
  test(`Temple shares cloud ink in ${scheme} mode and keeps native copy selectable`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    await page.goto('/temple-of-sound')
    const artwork = page.locator('.temple-artwork')
    await expect(artwork).toHaveAttribute('data-state', 'ready')
    await expect(page.locator('html')).not.toHaveAttribute('data-temple-loading')
    await expect(page.locator('.temple-date')).toHaveAttribute('data-copy-cloud', '')
    const first = page.locator('.verse-copy > p').first()
    await first.scrollIntoViewIfNeeded()
    await expect(first).toHaveAttribute('data-copy-cloud', '')
    const brightness = () =>
      first.locator('canvas').evaluate((c) => {
        const canvas = c as HTMLCanvasElement
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
        let sum = 0,
          count = 0
        for (let at = 0; at < pixels.length; at += 4)
          if (pixels[at + 3] > 200) {
            sum += (pixels[at] + pixels[at + 1] + pixels[at + 2]) / 3
            count++
          }
        return sum / count
      })
    await expect.poll(brightness).toBeGreaterThan(scheme === 'dark' ? 150 : 0)
    if (scheme === 'light') expect(await brightness()).toBeLessThan(100)
    expect(
      await first.evaluate((p) => {
        const range = document.createRange()
        range.selectNodeContents(p)
        const selection = getSelection()!
        selection.removeAllRanges()
        selection.addRange(range)
        return selection.toString().replace(/\s/g, '') === p.textContent!.replace(/\s/g, '')
      }),
    ).toBe(true)
    await page.emulateMedia({ colorScheme: scheme === 'light' ? 'dark' : 'light' })
    await expect.poll(brightness)[scheme === 'light' ? 'toBeGreaterThan' : 'toBeLessThan'](100)
    await page.emulateMedia({ forcedColors: 'active' })
    await expect(first.locator('canvas')).toHaveCSS('display', 'none')
    await expect(first).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)')
    await page.emulateMedia({ forcedColors: 'none', media: 'print' })
    await expect(page.locator('.refrain-canvas')).toHaveCSS('display', 'none')
    expect(errors).toEqual([])
  })
}

test('Temple stays black while fonts load, then reveals the completed scene', async ({ page }) => {
  let release!: () => void
  const ready = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/*.ttf', async (route) => {
    await ready
    await route.continue()
  })
  await page.goto('/temple-of-sound', { waitUntil: 'commit' })
  await expect(page.locator('html')).toHaveAttribute('data-temple-loading', '')
  await expect(page.locator('.temple-page')).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  release()
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.temple-page')).toHaveCSS('visibility', 'visible')
})

for (const failure of ['font', 'image'] as const) {
  test(`Temple recovers readable native text after ${failure} failure`, async ({ page }) => {
    await page.route('**/*', (route) =>
      route.request().resourceType() === failure ? route.abort() : route.continue(),
    )
    await page.goto('/temple-of-sound')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'fallback')
    await expect(page.locator('html')).not.toHaveAttribute('data-temple-loading')
    await expect(page.getByRole('heading', { name: 'Temple of Sound' })).toBeVisible()
    await expect(page.locator('.refrain-composition')).not.toHaveAttribute('data-ready')
    await expect(page.locator('.copy-cloud-canvas')).toHaveCount(0)
    const copy = page.locator('.verse-copy').first()
    await copy.scrollIntoViewIfNeeded()
    await expect(copy).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('Temple loading watchdog also recovers when the browser entry cannot load', async ({
  page,
}) => {
  await page.route('**/*.js', (route) => route.abort())
  await page.goto('/temple-of-sound')
  await expect(page.locator('.temple-page')).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('.temple-page')).toHaveCSS('visibility', 'visible', { timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Temple of Sound' })).toBeVisible()
})

test('Temple releases every old cloud surface across repeated navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-of-sound')
  for (let visit = 0; visit < 2; visit++) {
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await page.evaluate(() =>
      Object.assign(window, {
        oldClouds: [...document.querySelectorAll('.copy-cloud-canvas')],
      }),
    )
    await page.getByRole('link', { name: 'Return to fixture' }).click()
    await expect(page).toHaveURL(/\/fixture$/)
    expect(
      await page.evaluate(() =>
        (window as any).oldClouds.every((c: HTMLCanvasElement) => c.width === 0 && c.height === 0),
      ),
    ).toBe(true)
    await expect(page.locator('html')).not.toHaveAttribute('data-temple-loading')
    await page.goBack()
  }
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
})

test('Temple shares one cloud clock, freezes reduced motion and resumes a cached page', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const counts = { fields: 0, encodes: 0, dateAnimations: 0, draws: 0 }
    Object.assign(window, { templeRendering: counts })
    const put = CanvasRenderingContext2D.prototype.putImageData
    CanvasRenderingContext2D.prototype.putImageData = function (
      data: ImageData,
      dx: number,
      dy: number,
      x: number = 0,
      y: number = 0,
      width: number = data.width,
      height: number = data.height,
    ) {
      if (this.canvas.width === 128) counts.fields++
      return put.call(this, data, dx, dy, x, y, width, height)
    }
    const clear = CanvasRenderingContext2D.prototype.clearRect
    CanvasRenderingContext2D.prototype.clearRect = function (...args: Parameters<typeof clear>) {
      if (this.canvas.matches('.temple-stage > canvas')) counts.draws++
      return clear.apply(this, args)
    }
    const encode = HTMLCanvasElement.prototype.toDataURL
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      counts.encodes++
      return encode.apply(this, args)
    }
    const animate = HTMLElement.prototype.animate
    HTMLElement.prototype.animate = function (...args) {
      if (this.matches('.temple-date')) counts.dateAnimations++
      return animate.apply(this, args)
    }
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-of-sound')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const counts = () => page.evaluate(() => ({ ...(window as any).templeRendering }))
  await page.waitForTimeout(200)
  const frozen = await counts()
  await page.waitForTimeout(200)
  expect((await counts()).fields).toBe(frozen.fields)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForTimeout(1700)
  const active = await counts()
  expect(active.fields).toBeGreaterThan(frozen.fields)
  expect(active.encodes).toBe(0)
  expect(active.dateAnimations).toBe(0)
  // Exercise the browser lifecycle events without destroying the connected island.
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  const paused = await counts()
  await page.waitForTimeout(200)
  expect((await counts()).draws).toBe(paused.draws)
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await expect.poll(async () => (await counts()).draws).toBeGreaterThan(paused.draws)
})
