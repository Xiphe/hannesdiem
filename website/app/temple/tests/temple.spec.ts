import { expect, test } from '@playwright/test'

test('Temple leaves room after the opening and scrolls its title independently of repainting', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-of-sound')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const first = await page.locator('.verse-copy').first().boundingBox()
  expect(first!.y).toBeGreaterThanOrEqual(844 + 32)
  // Pause enhancement frames. The browser must still move the lettering with
  // the document, rather than leaving a viewport-fixed drawing behind.
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0
    scrollTo(0, innerHeight * 0.6)
  })
  await expect
    .poll(async () => (await page.locator('.temple-stage > canvas').boundingBox())!.y)
    .toBeLessThan(-300)
})

test('Temple paints the chorus in its native scrolling canvas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-of-sound')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const chorus = page.locator('.refrain-composition')
  await chorus.evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top - 600))
  const canvas = chorus.locator('canvas')
  await expect
    .poll(() =>
      canvas.evaluate((node) => {
        const canvas = node as HTMLCanvasElement
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
        return pixels.some((value, i) => i % 4 === 3 && value > 0)
      }),
    )
    .toBe(true)
  const before = (await canvas.boundingBox())!.y
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0
    scrollBy(0, 40)
  })
  await expect.poll(async () => (await canvas.boundingBox())!.y).toBeCloseTo(before - 40, 0)
})

for (const width of [390, 1440]) {
  test(`Temple scrolls a spatial sculpture around dynamic chorus gaps at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' })
    await page.goto('/temple-multiple')
    const ground = page.locator('.fragment-ground')
    const planes = ground.locator('.fragment-ground-plane')
    const pieces = ground.locator('.fragment-ground-piece')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await expect(planes).toHaveCount(3)
    await expect(pieces.first()).toBeAttached()
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let frames = 4
          function settle() {
            if (--frames === 0) resolve()
            else requestAnimationFrame(settle)
          }
          requestAnimationFrame(settle)
        }),
    )
    // Freeze only ambient float so scroll geometry can be compared precisely.
    // Native scroll motion must keep working without enhancement frames.
    await planes.evaluateAll((nodes) => {
      for (const node of nodes)
        for (const animation of node.getAnimations())
          if (animation instanceof CSSAnimation) animation.pause()
      window.requestAnimationFrame = () => 0
    })
    const ranges = () =>
      page.locator('.refrain-composition').evaluateAll((nodes) =>
        nodes.map((node) => {
          const stage = node.querySelector<HTMLElement>('.refrain-stage')!
          return {
            start:
              scrollY + node.getBoundingClientRect().top - parseFloat(getComputedStyle(stage).top),
            hold: node.getBoundingClientRect().height - stage.offsetHeight,
            top: parseFloat(getComputedStyle(stage).top),
            bottom: parseFloat(getComputedStyle(stage).top) + stage.offsetHeight,
          }
        }),
      )
    const seek = async (y: number) => {
      y = Math.round(y)
      await page.evaluate((value) => scrollTo(0, value), y)
      await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(y, 0)
      // WebKit samples native timelines after scrollY has already updated.
      await expect
        .poll(() =>
          planes
            .first()
            .evaluate((node) => parseFloat(getComputedStyle(node).translate.split(' ').at(-1)!)),
        )
        .toBeCloseTo(-y * 0.12, 0)
    }
    const clear = () =>
      pieces.evaluateAll((nodes) =>
        nodes.every((node) => {
          const box = node.getBoundingClientRect()
          return (
            box.bottom <= 0 || box.top >= innerHeight || box.right <= 0 || box.left >= innerWidth
          )
        }),
      )
    const positions = () =>
      pieces.evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = node.getBoundingClientRect()
          return { x: box.x, y: box.y, layer: Number(node.parentElement!.dataset.layer) }
        }),
      )
    await seek(0)
    await expect.poll(clear).toBe(true)
    const scenes = await ranges()
    const verse = Math.round((900 * 0.3 + scenes[0].start) / 2)
    await seek(verse)
    await expect.poll(clear).toBe(false)
    const before = await positions()
    await ground.evaluate((node) => {
      ;(window as any).groundMutations = 0
      new MutationObserver((records) => {
        ;(window as any).groundMutations += records.length
      }).observe(node, { attributes: true, subtree: true })
    })
    await seek(verse + 100)
    const after = await positions()
    for (const [index, piece] of after.entries()) {
      expect(piece.x).toBeCloseTo(before[index].x, 1)
      expect(piece.y - before[index].y).toBeCloseTo(-100 * (1 + [0.12, 0.26, 0.42][piece.layer]), 0)
    }
    expect(
      await pieces.evaluateAll((nodes) =>
        nodes.every(
          (node) => node.getAnimations().length === 0 && getComputedStyle(node).opacity === '1',
        ),
      ),
    ).toBe(true)
    const chorusClear = (scene: { top: number; bottom: number }) =>
      pieces.evaluateAll(
        (nodes, area) =>
          nodes.every((node) => {
            const box = node.getBoundingClientRect()
            return (
              box.bottom <= area.top ||
              box.top >= area.bottom ||
              box.right <= 0 ||
              box.left >= innerWidth
            )
          }),
        scene,
      )
    // Only the chorus's actual reading area is reserved, leaving pieces behind
    // neighbouring verse lines even when both scenes share the viewport.
    // Only the central reading interval is clear; pieces can reach into
    // chorus arrival/departure. Holes are spatial, without fades or exits.
    for (const scene of scenes) {
      for (const fraction of [0.35, 0.5, 0.65]) {
        await seek(scene.start + scene.hold * fraction)
        await expect.poll(() => chorusClear(scene)).toBe(true)
      }
    }
    await seek(verse)
    const reversed = await positions()
    for (const [index, piece] of reversed.entries()) {
      expect(piece.x).toBeCloseTo(before[index].x, 1)
      expect(piece.y).toBeCloseTo(before[index].y, 0)
    }
    expect(await page.evaluate(() => (window as any).groundMutations)).toBe(0)
    // Layout changes move the spaces with the actual content, not fixed lengths.
    const oldPiece = await pieces.first().elementHandle()
    await page
      .locator('.verse-copy')
      .first()
      .evaluate((node) => {
        ;(node as HTMLElement).style.paddingBottom = '300px'
      })
    await expect.poll(() => oldPiece!.evaluate((node) => node.isConnected)).toBe(false)
    const shifted = await ranges()
    expect(shifted[0].start).toBeGreaterThan(scenes[0].start + 290)
    for (const scene of shifted) {
      await seek(scene.start + scene.hold * 0.5)
      await expect.poll(() => chorusClear(scene)).toBe(true)
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.fragment-ground-field')).toBeHidden()
    await expect
      .poll(() =>
        planes.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).translate)),
      )
      .toEqual(['none', 'none', 'none'])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  })
}

test('Temple background drifts without animation frames and rests with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/temple-multiple')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const planes = page.locator('.fragment-ground-ink .fragment-ground-plane')
  await expect(planes).toHaveCount(3)
  // These surfaces span the reading document. Full-page filtered/pulsing
  // overlays caused a measured raster/compositing regression and visible blinking.
  expect(
    await planes.evaluateAll((nodes) =>
      nodes.every(
        (node) =>
          [
            getComputedStyle(node),
            getComputedStyle(node, '::before'),
            getComputedStyle(node, '::after'),
          ].every((style) => style.filter === 'none') &&
          node
            .getAnimations({ subtree: true })
            .every(
              (animation) =>
                !(animation.effect instanceof KeyframeEffect) ||
                animation.effect.target !== node ||
                animation.effect
                  .getKeyframes()
                  .every((frame) => !('filter' in frame) && !('opacity' in frame)),
            ),
      ),
    ),
  ).toBe(true)
  const positions = () =>
    planes.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).transform))
  await expect.poll(positions).not.toEqual(['none', 'none', 'none'])
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0
  })
  const before = await positions()
  await expect.poll(positions).not.toEqual(before)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(positions).toEqual(['none', 'none', 'none'])
  await expect
    .poll(() =>
      planes.evaluateAll((nodes) =>
        nodes.every((node) =>
          node.getAnimations().every((animation) => animation.timeline instanceof ViewTimeline),
        ),
      ),
    )
    .toBe(true)
})

test('Temple bounds concurrent edge traces and clears them for reduced motion and navigation', async ({
  page,
}) => {
  await page.clock.install()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/temple-multiple')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  // The opener stays clear; signals belong to the patterned reading ground.
  const signals = page.locator('.fragment-ground-signal')
  const expectTrace = async () => {
    // A skipped launch is valid. Advance the seeded scheduler instead of
    // requiring multiple traces at an arbitrary instant.
    for (let attempt = 0; attempt < 20 && (await signals.count()) === 0; attempt++)
      await page.clock.runFor(300)
    expect(await signals.count()).toBeGreaterThan(0)
    expect(await signals.count()).toBeLessThanOrEqual(6)
  }
  await expect(signals).toHaveCount(0)
  await page
    .locator('.fragment-action-stage')
    .evaluate((node) => node.scrollIntoView({ block: 'center' }))
  // The trace scheduler owns timers; foreground painting is irrelevant here.
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0
  })
  await page.clock.runFor(2000)
  await expectTrace()
  expect(
    await signals.evaluateAll((nodes) => new Set(nodes.map((node) => node.parentElement)).size),
  ).toBe(await signals.count())
  const shapes = await page
    .locator('.fragment-action-pieces [data-piece] path')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('d')))
  for (const trace of await signals.all()) {
    const original = await trace.evaluate((node) =>
      node.parentElement!.querySelector(':scope > path')!.getAttribute('d'),
    )
    expect(shapes).toContain(original)
    const tip = trace.locator('.fragment-signal-tip')
    expect(await tip.getAttribute('d')).not.toBe(original)
    const screenWidth = await tip.evaluate((node) => {
      const matrix = (node as SVGPathElement).getScreenCTM()!
      return parseFloat(getComputedStyle(node).strokeWidth) * Math.hypot(matrix.a, matrix.b)
    })
    expect(screenWidth).toBeCloseTo(3, 1)
    await expect(tip).toHaveCSS('vector-effect', 'none')
    await expect(trace).toHaveAttribute('aria-hidden', 'true')
  }
  await page.clock.runFor(4000)
  await expectTrace()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(signals).toHaveCount(0)
  await page.clock.fastForward(60000)
  await expect(signals).toHaveCount(0)
  await page.evaluate(() => {
    ;(window as any).motionResumed = new Promise<void>((resolve) => {
      matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => resolve(), {
        once: true,
      })
    })
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => (window as any).motionResumed)
  await page.clock.runFor(2000)
  await expectTrace()
  await page.getByRole('link', { name: 'Return to fixture' }).click()
  await expect(page).toHaveURL(/\/fixture$/)
  await page.clock.fastForward(60000)
  await expect(signals).toHaveCount(0)
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
    await expect(page.getByRole('link', { name: 'Explore fixture' })).toHaveAttribute(
      'href',
      '/fixture',
    )
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
      first
        .locator('canvas')
        .first()
        .evaluate((c) => {
          const canvas = c as HTMLCanvasElement
          const pixels = canvas
            .getContext('2d')!
            .getImageData(0, 0, canvas.width, canvas.height).data
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
    await expect(first.locator('canvas').first()).toHaveCSS('display', 'none')
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
  const seekSpinner = (time: number) =>
    page.evaluate((time) => {
      const animations = document
        .getAnimations()
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.animationName.startsWith('temple-spinner-'),
        )
      if (!animations.length) throw new Error('Loading spinner animations missing')
      for (const animation of animations) {
        animation.pause()
        animation.currentTime = time
      }
      return getComputedStyle(document.body, '::before').opacity
    }, time)
  expect(await seekSpinner(299)).toBe('0')
  await expect(page.getByRole('status')).toHaveCount(0)
  expect(await seekSpinner(300)).toBe('1')
  await expect(page.getByRole('status')).toHaveText('loading')
  release()
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.temple-page')).toHaveCSS('visibility', 'visible')
  await expect(page.getByRole('status')).toHaveCount(0)
  expect(await page.evaluate(() => getComputedStyle(document.body, '::before').content)).toBe(
    'none',
  )
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
  expect(await page.evaluate(() => getComputedStyle(document.body, '::before').opacity)).toBe('0')
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
    // Navigation updates history before the replacement frame commits.
    await expect(page.locator('.temple-artwork')).toHaveCount(0)
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

for (const width of [390, 1440]) {
  test(`Temple keeps multiple choruses independent at ${width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/temple-multiple')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const pairs = page.locator('.first-pair')
    await expect(pairs).toHaveCount(2)
    for (let i = 0; i < 2; i++) {
      const chorus = pairs.nth(i).locator('.refrain-composition')
      await expect(chorus).toHaveAttribute('data-ready', 'true')
      for (const progress of [0, 1]) {
        await chorus.evaluate((node, progress) => {
          const stage = node.querySelector<HTMLElement>('.refrain-stage')!
          const top = node.getBoundingClientRect().top + scrollY
          const lock = (innerHeight - stage.offsetHeight) / 2
          scrollTo(
            0,
            top - lock + (node.clientHeight - stage.offsetHeight) * progress + (progress ? 2 : -2),
          )
        }, progress)
        await expect(chorus).toHaveAttribute(
          'data-active',
          String(progress ? (i === 0 ? 2 : 1) : 0),
        )
      }
    }
    const stacked = pairs.last().locator('[data-face="unbounded"] [data-line]')
    await expect(stacked).toHaveCount(3)
    const rowTops = await stacked.evaluateAll((rows) =>
      rows.map((row) => row.getBoundingClientRect().top),
    )
    expect(rowTops[1]).toBeGreaterThan(rowTops[0])
    expect(rowTops[2]).toBeGreaterThan(rowTops[1])
    const sweep = pairs.last().locator('[data-shape="sweep"]')
    const verticalRange = await sweep.locator('.block-row-ink').evaluateAll((letters) => {
      const offsets = letters.map((letter) => parseFloat((letter as HTMLElement).style.top))
      return Math.max(...offsets) - Math.min(...offsets)
    })
    expect(verticalRange).toBeGreaterThan(5)
    const angles = await sweep
      .locator('[data-ink-angle]')
      .evaluateAll((letters) =>
        letters.map((letter) => Number((letter as HTMLElement).dataset.inkAngle)),
      )
    expect(Math.min(...angles)).toBeLessThan(0)
    expect(Math.max(...angles)).toBeGreaterThan(0)
    await expect(sweep).toHaveText('A gently sweeping synthetic line')
    const last = pairs.last().locator('.verse-coda p').last()
    await last.scrollIntoViewIfNeeded()
    await expect(last).toHaveAttribute('data-copy-cloud', '')
    await expect(last).toHaveText('A final synthetic paragraph follows.')
    await expect(pairs.last().locator('[data-lettering="germania"]')).toHaveCSS(
      'font-family',
      'Germania, serif',
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    await page.getByRole('link', { name: 'Return to fixture' }).click()
    await expect(pairs).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('Temple verse phrases catch up into their original layout as they enter', async ({ page }) => {
  await page.goto('/temple-multiple')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.phrase-entry').first().locator('[data-type-line]')).toHaveCount(1)
  await expect(page.locator('.phrase-entry').nth(1).locator('[data-type-line]')).toHaveCount(2)
  await expect(page.locator('.phrase-entry').first()).not.toHaveAttribute('data-entry')
  const secondPair = page.locator('.first-pair').last()
  await expect(
    secondPair.locator('.verse-copy').first().locator('.phrase-entry').first(),
  ).not.toHaveAttribute('data-entry')
  for (const pair of await page.locator('.first-pair').all()) {
    await expect(pair.locator('.verse-coda .phrase-entry').first()).not.toHaveAttribute(
      'data-entry',
    )
  }
  const line = page.locator('.phrase-entry').nth(2)
  const supported = await page.evaluate(() => CSS.supports('animation-timeline', 'view()'))
  test.skip(!supported, 'Native scroll timelines unavailable')
  const offset = () => line.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).m42)
  for (const [fraction, settled] of [
    [0.96, false],
    [0.4, true],
  ] as const) {
    await line.evaluate((node, fraction) => {
      // The parent's origin is unanimated; the line is the first in this group.
      const top = node.parentElement!.getBoundingClientRect().top + scrollY
      scrollTo(0, top - innerHeight * fraction)
    }, fraction)
    if (settled) await expect.poll(offset).toBeLessThan(0.5)
    else await expect.poll(offset).toBeGreaterThan(20)
  }
  await expect(line.locator('.copy-cloud-canvas')).toHaveCount(1)
  for (const child of await line.locator('[data-type-line]').all()) {
    await expect(child).toHaveCSS('transform', 'none')
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(offset).toBe(0)
})

for (const width of [390, 1440]) {
  test(`Temple resolves all four chorus phrases at ${width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/temple-four-phrases')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const pair = page.locator('.first-pair').last()
    const chorus = pair.locator('.refrain-composition')
    await expect(chorus.locator('.refrain-phrase')).toHaveCount(4)
    await expect(chorus.locator('[data-face="bricolage"] [data-line]')).toHaveCount(
      width <= 900 ? 4 : 2,
    )
    await expect(chorus.locator('[data-face="germania"]')).toHaveCSS(
      'font-family',
      'Germania, serif',
    )
    for (let index = 0; index < 4; index++) {
      await chorus.evaluate((node, progress) => {
        const stage = node.querySelector<HTMLElement>('.refrain-stage')!
        const top = node.getBoundingClientRect().top + scrollY
        scrollTo(
          0,
          top -
            (innerHeight - stage.offsetHeight) / 2 +
            (node.clientHeight - stage.offsetHeight) * progress +
            2,
        )
      }, index / 3)
      await expect(chorus).toHaveAttribute('data-active', String(index))
    }
    await pair.locator('.verse-coda').scrollIntoViewIfNeeded()
    await expect(pair.locator('.verse-coda .phrase-entry')).not.toHaveAttribute('data-entry')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    expect(errors).toEqual([])
  })
}

test('mobile curved copy keeps two rows without editor controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-multiple')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('[data-shape="sweep"] .block-row')).toHaveCount(2)
  await expect(page.locator('input, .small-curve-controls')).toHaveCount(0)
})

for (const width of [390, 1440]) {
  test(`Temple repetition holds, reveals and yields at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-four-phrases')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const tracks = page.locator('.repetition-track')
    await expect(tracks).toHaveCount(3)
    const first = tracks.first()
    const stage = first.locator('.repetition-stage')
    const geometry = await first.evaluate((node) => {
      const stage = node.querySelector<HTMLElement>('.repetition-stage')!
      return {
        start: scrollY + node.getBoundingClientRect().top - parseFloat(getComputedStyle(stage).top),
        hold: node.getBoundingClientRect().height - stage.offsetHeight,
      }
    })
    await page.evaluate((y) => scrollTo(0, y), geometry.start)
    await expect(first.locator('.repetition-reflection')).toHaveCSS('opacity', '0')
    const center = await stage.locator('.repetition-statement').boundingBox()
    expect(center!.y + center!.height / 2).toBeCloseTo(450, 0)
    await page.evaluate((y) => scrollTo(0, y), geometry.start + geometry.hold * 0.6)
    await expect(first.locator('.repetition-reflection')).toHaveCSS('opacity', '1')
    const held = await stage.boundingBox()
    expect(held!.y).toBeCloseTo(center!.y, 0)
    await expect(first.locator('.repetition-statement .phrase-entry')).toHaveAttribute(
      'data-entry',
      '',
    )
    const collision = await tracks.nth(1).evaluate((node) => {
      const current = node.querySelector<HTMLElement>('.repetition-stage')!
      const previous = node.previousElementSibling!.querySelector<HTMLElement>('.repetition-stage')!
      const lock = parseFloat(getComputedStyle(previous).top)
      const contactY = lock + previous.offsetHeight + 8
      return {
        scroll: scrollY + node.getBoundingClientRect().top - contactY,
        distance: contactY - parseFloat(getComputedStyle(current).top),
      }
    })
    await page.evaluate((y) => scrollTo(0, y), collision.scroll)
    await expect
      .poll(async () => {
        const upper = (await stage.boundingBox())!
        const lower = (await tracks.nth(1).locator('.repetition-stage').boundingBox())!
        return Math.abs(lower.y - (upper.y + upper.height) - 8)
      })
      .toBeLessThan(2)
    const beforeImpact = (await stage.boundingBox())!
    const incomingStage = tracks.nth(1).locator('.repetition-stage')
    const incomingAtContact = (await incomingStage.boundingBox())!

    await page.evaluate((y) => scrollTo(0, y), collision.scroll + 5)
    await expect.poll(async () => (await stage.boundingBox())!.y).toBeLessThan(beforeImpact.y - 9)
    expect((await stage.boundingBox())!.height).toBeCloseTo(beforeImpact.height, 0)
    expect((await incomingStage.boundingBox())!.y).toBeCloseTo(incomingAtContact.y - 10, 0)
    await page.evaluate((y) => scrollTo(0, y), collision.scroll + collision.distance + 240)
    await expect(tracks.nth(1).locator('.repetition-reflection')).toHaveCSS('opacity', '1')
    const settled = await incomingStage.locator('.repetition-statement').boundingBox()
    expect(settled!.y + settled!.height / 2).toBeCloseTo(450, 0)

    await page.evaluate((y) => scrollTo(0, y), collision.scroll + collision.distance * 2)
    await expect.poll(async () => (await stage.boundingBox())!.y).toBeLessThan(held!.y - 50)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const width of [390, 1440]) {
  test(`Temple repetition never overlaps during the full handoff at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-four-phrases')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const result = await page.evaluate(async () => {
      const tracks = [...document.querySelectorAll<HTMLElement>('.repetition-track')]
      const stages = tracks.map((t) => t.querySelector<HTMLElement>('.repetition-stage')!)
      const start = scrollY + tracks[0].getBoundingClientRect().top - innerHeight / 2
      const end = scrollY + tracks.at(-1)!.getBoundingClientRect().bottom - innerHeight / 2
      const stops = Array.from({ length: 81 }, (_, i) => start + ((end - start) * i) / 80)
      let smallest = Infinity
      let idleReadingFrames = 0
      for (const y of [...stops, ...stops.reverse()]) {
        scrollTo(0, y)
        await new Promise(requestAnimationFrame)
        await new Promise(requestAnimationFrame)
        const boxes = stages.map((s) => s.getBoundingClientRect())
        for (let i = 1; i < stages.length; i++) {
          const atCentre = Math.abs(boxes[i].top - parseFloat(getComputedStyle(stages[i]).top)) < 1
          const next =
            boxes[i + 1] ??
            document
              .querySelectorAll('.refrain-composition')[2]
              .querySelector('.refrain-phrase')!
              .getBoundingClientRect()
          const previousGone = boxes[i - 1].bottom <= 0
          if (atCentre && previousGone && next.top > innerHeight + 24) {
            const opacity = Number(
              getComputedStyle(stages[i].querySelector('.repetition-reflection')!).opacity,
            )
            if (opacity >= 1) idleReadingFrames++
          }
        }

        for (let i = 1; i < boxes.length; i++) {
          if (boxes[i].top < innerHeight && boxes[i - 1].bottom > 0) {
            smallest = Math.min(smallest, boxes[i].top - boxes[i - 1].bottom)
          }
        }
      }
      return { smallest, idleReadingFrames }
    })
    expect(result.smallest).toBeGreaterThanOrEqual(7)
    expect(result.idleReadingFrames).toBe(0)
  })
}

for (const width of [390, 1440]) {
  test(`Temple final reflection stays in motion throughout its hold at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-four-phrases')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const track = page.locator('.repetition-track').last()
    const range = await track.evaluate((node) => {
      const stage = node.querySelector<HTMLElement>('.repetition-stage')!
      return {
        start: scrollY + node.getBoundingClientRect().top - parseFloat(getComputedStyle(stage).top),
        hold: (node as HTMLElement).offsetHeight - stage.offsetHeight,
      }
    })
    const reflection = track.locator('.repetition-reflection')
    const values = []
    for (const fraction of [0.2, 0.4, 0.6, 0.8]) {
      await page.evaluate((y) => scrollTo(0, y), range.start + range.hold * fraction)
      await page.evaluate(() => new Promise(requestAnimationFrame))
      await page.evaluate(() => new Promise(requestAnimationFrame))
      values.push(Number(await reflection.evaluate((n) => getComputedStyle(n).opacity)))
    }
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1] + 0.01)
  })
}

test('Temple responsive chorus rows update across the breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/temple-four-phrases')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const rows = page.locator('[data-small-refrain-lines] [data-line]')
  await expect(rows).toHaveCount(4)
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 1000 })
    await expect(rows).toHaveCount(4)
    await expect
      .poll(() =>
        rows.evaluateAll((elements) =>
          elements.every((row) => {
            const words = [...row.querySelectorAll('[data-word]')].map((word) =>
              word.getBoundingClientRect(),
            )
            return words.every((word) => Math.abs(word.top - words[0].top) < 2)
          }),
        ),
      )
      .toBe(true)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(rows).toHaveCount(2)
  await page.setViewportSize({ width: 390, height: 900 })
  await expect(rows).toHaveCount(4)
})

test('Temple renders the authored action after the first pair with theme-aware fragments and native keyboard navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await page.goto('/temple-multiple')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const pairs = page.locator('.first-pair')
  const stage = pairs.first().locator('.fragment-action-stage')
  await expect(stage).toHaveAttribute('data-fragments-ready', '')
  await expect(pairs.nth(1).locator('.fragment-action-stage')).toHaveCount(0)
  const link = stage.getByRole('link', { name: 'Explore fixture' })
  await expect(link).toHaveAttribute('href', '/fixture')
  await expect(stage.locator('[data-piece]')).toHaveCount(11)
  await stage.scrollIntoViewIfNeeded()
  const shapes = () =>
    stage.locator('path').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('d')))
  const paths = await shapes()
  const artwork = page.locator('.temple-artwork')
  const patternPaths = await artwork
    .locator('.fragment-ground-piece > g > path')
    .evaluateAll((nodes) => [...new Set(nodes.map((path) => path.getAttribute('d')))])
  expect(patternPaths.length).toBeGreaterThan(0)
  for (const path of patternPaths) expect(paths).toContain(path)
  await expect(stage.locator('path').first()).toHaveAttribute('stroke-linejoin', 'round')
  await expect(stage.locator('path').first()).toHaveAttribute('stroke-width', '1.8')
  // Hidden subtrees need not recompute paint styles in WebKit. Exercise the
  // background theme switch while it is actually rendered.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.fragment-ground-field')).toBeVisible()
  const groundInk = page.locator('.fragment-ground-piece linearGradient stop').first()
  const ground = await groundInk.evaluate((n) => getComputedStyle(n).stopColor)
  const dark = await stage
    .locator('linearGradient stop')
    .first()
    .evaluate((n) => getComputedStyle(n).stopColor)
  await page.emulateMedia({ colorScheme: 'light' })
  await expect
    .poll(() =>
      stage
        .locator('linearGradient stop')
        .first()
        .evaluate((n) => getComputedStyle(n).stopColor),
    )
    .not.toBe(dark)
  expect(await shapes()).toEqual(paths)
  await expect.poll(() => groundInk.evaluate((n) => getComputedStyle(n).stopColor)).not.toBe(ground)
  await page.setViewportSize({ width: 390, height: 844 })
  await stage.scrollIntoViewIfNeeded()
  expect(await shapes()).toEqual(paths)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await link.focus()
  await link.press('Enter')
  await expect(page).toHaveURL(/\/fixture$/)
  await expect(page.locator('.fragment-action-stage')).toHaveCount(0)
})

test('Temple action scatters on click and zooms the same pieces back to full size', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/temple-of-sound')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const stage = page.locator('.fragment-action-stage')
  await stage.scrollIntoViewIfNeeded()
  await expect(stage).toHaveAttribute('data-fragments-ready', '')
  const board = stage.locator('svg')
  const scales = () =>
    stage
      .locator('[data-piece]')
      .evaluateAll((nodes) =>
        nodes.map((n) => Number(n.getAttribute('transform')!.match(/scale\(([^)]+)\)/)![1])),
      )
  const base = await scales()
  const link = stage.getByRole('link', { name: 'Explore fixture' })
  // Exercise the actual click effect while keeping this synthetic link on screen.
  await link.evaluate((n) => n.addEventListener('click', (e) => e.preventDefault(), { once: true }))
  await link.click()
  await expect(board).toHaveAttribute('data-border-burst', '')
  await expect.poll(async () => (await scales()).every((s) => s === 0)).toBe(true)
  await expect.poll(async () => (await scales()).some((s, i) => s > 0 && s < base[i])).toBe(true)
  await expect(board).not.toHaveAttribute('data-border-burst', '')
  expect(await scales()).toEqual(base)
  await page.getByRole('link', { name: 'Return to fixture' }).click()
  await expect(page.locator('.fragment-action-stage')).toHaveCount(0)
})
