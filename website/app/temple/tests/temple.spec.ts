import { parseBridgeText } from '../bridge-text.tsx'
import { expect, test } from '@playwright/test'
import { bridgeGlyphScale } from '../bridge-reveal.ts'

test('Temple leaves room after the opening and scrolls its title independently of repainting', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-basic')
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
  await page.goto('/temple-basic')
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
    // Visible pieces keep native scroll motion while membership frames pause.
    await planes.evaluateAll((nodes) => {
      for (const node of nodes)
        for (const animation of node.getAnimations())
          if (animation instanceof CSSAnimation) animation.pause()
    })
    let membershipPaused = false
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
      if (!membershipPaused)
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
        )
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
    if (width < 1200) {
      // Narrow screens retain discrete forms rather than a full-width slab.
      expect(
        await pieces.evaluateAll((nodes) =>
          nodes.every((node) => node.getBoundingClientRect().width <= innerWidth * 1.5 + 1),
        ),
      ).toBe(true)
    }
    const scenes = await ranges()
    const verse = Math.round((900 * 0.3 + scenes[0].start) / 2)
    await seek(verse)
    await expect.poll(clear).toBe(false)
    const before = await positions()
    membershipPaused = true
    await ground.evaluate((node) => {
      Object.assign(window, { groundRequestFrame: window.requestAnimationFrame })
      window.requestAnimationFrame = () => 0
      ;(window as any).groundMutations = 0
      const observer = new MutationObserver((records) => {
        ;(window as any).groundMutations += records.length
      })
      observer.observe(node, { attributes: true, subtree: true })
      Object.assign(window, { groundMutationObserver: observer })
    })
    await seek(verse + 100)
    // Native timelines may sample after scrollY updates, even with RAF paused.
    await expect
      .poll(async () => (await positions())[0].y - before[0].y)
      .toBeCloseTo(-100 * (1 + [0.12, 0.26, 0.42][before[0].layer]), 0)
    const after = await positions()
    for (const [index, piece] of after.entries()) {
      expect(piece.x).toBeCloseTo(before[index].x, 1)
      expect(piece.y - before[index].y).toBeCloseTo(-100 * (1 + [0.12, 0.26, 0.42][piece.layer]), 0)
    }
    expect(
      await pieces.evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            node.getAnimations().length === 1 &&
            node.getAnimations()[0].timeline instanceof ScrollTimeline &&
            getComputedStyle(node).opacity === '1',
        ),
      ),
    ).toBe(true)
    expect(await page.evaluate(() => (window as any).groundMutations)).toBe(0)
    await page.evaluate(() => {
      window.requestAnimationFrame = (window as any).groundRequestFrame
      ;(window as any).groundMutationObserver.disconnect()
    })
    membershipPaused = false
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
    // Layout changes move the spaces with the actual content, not fixed lengths.
    await page
      .locator('.verse-copy')
      .first()
      .evaluate((node) => {
        ;(node as HTMLElement).style.paddingBottom = '300px'
      })
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

for (const width of [390, 1440]) {
  test(`Temple keeps the bridge body clear of background pieces at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' })
    await page.goto('/temple-four-phrases')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const bridge = page.locator('.bridge-body')
    const top = () =>
      bridge.evaluate(
        (node) =>
          scrollY +
          node.getBoundingClientRect().top +
          (node.querySelector<HTMLElement>('.bridge-page-stage > .bridge-body-copy')?.offsetTop ??
            0),
      )
    const pieces = page.locator('.fragment-ground-piece')
    const clearBridge = () =>
      pieces.evaluateAll((nodes) => {
        const bridge = document
          .querySelector('.bridge-body .bridge-body-copy')!
          .getBoundingClientRect()
        return nodes.every((node) => {
          const box = node.getBoundingClientRect()
          return (
            box.bottom <= Math.max(0, bridge.top) ||
            box.top >= innerHeight ||
            box.right <= 0 ||
            box.left >= innerWidth
          )
        })
      })
    // Introductory typography remains within the textured sculpture.
    const intro = page.locator('.bridge-copy [data-lettering="cinzel"]')
    await intro.evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top - 450))
    await expect
      .poll(() =>
        pieces.evaluateAll((nodes) => {
          const line = document
            .querySelector('.bridge-copy [data-lettering="cinzel"]')!
            .getBoundingClientRect()
          return nodes.some((node) => {
            const box = node.getBoundingClientRect()
            return (
              box.bottom > line.top &&
              box.top < line.bottom &&
              box.right > 0 &&
              box.left < innerWidth
            )
          })
        }),
      )
      .toBe(true)
    const start = await top()
    for (const y of [start - 675, start - 225, start, start + 900, start + 1800]) {
      await page.evaluate((y) => scrollTo(0, y), y)
      await expect.poll(clearBridge).toBe(true)
    }
    // The exclusion follows preceding layout changes and reverse seeking.
    await page
      .locator('.verse-copy')
      .first()
      .evaluate((node) => {
        ;(node as HTMLElement).style.paddingBottom = '300px'
      })
    await expect.poll(top).toBeGreaterThan(start + 290)
    for (const y of [await top(), (await top()) - 450]) {
      await page.evaluate((y) => scrollTo(0, y), y)
      await expect.poll(clearBridge).toBe(true)
    }
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
  // These surfaces stay bounded to the viewport. Full-page filtered/pulsing
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

test('Temple keeps the sculpture and traces without publishing an action', async ({ page }) => {
  await page.clock.install()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/temple-without-action')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.fragment-action-stage')).toHaveCount(0)
  await expect(page.locator('.fragment-ground-piece').first()).toBeAttached()
  await page.locator('.verse-copy').first().scrollIntoViewIfNeeded()
  const signals = page.locator('.fragment-ground-signal')
  for (let attempt = 0; attempt < 40 && (await signals.count()) === 0; attempt++)
    await page.clock.runFor(300)
  expect(await signals.count()).toBeGreaterThan(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(signals).toHaveCount(0)
  await expect(page.locator('.fragment-ground-field')).toBeHidden()
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
  await page.locator('.verse-copy').first().scrollIntoViewIfNeeded()
  // The trace scheduler owns timers; foreground painting is irrelevant here.
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0
  })
  await page.clock.runFor(2000)
  await expectTrace()
  expect(
    await signals.evaluateAll((nodes) => new Set(nodes.map((node) => node.parentElement)).size),
  ).toBe(await signals.count())
  for (const trace of await signals.all()) {
    const original = await trace.evaluate((node) =>
      node.parentElement!.querySelector(':scope > path')!.getAttribute('d'),
    )
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
  await page.goto('/temple-basic')
  const opening = page.locator('.temple-opening')
  await expect(opening).toHaveAttribute('data-ready', 'true')
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0)
  await expect(page.locator('.temple-page').locator('select, input, nav')).toHaveCount(0)
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
    expect((await page.goto('/temple-basic'))?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Temple of Sound' })).toBeVisible()
    await expect(page.locator('[data-poem-text]')).toContainText('Static verse fixture')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://hannesdiem.de/temple-basic',
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
  await page.goto('/temple-basic')
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
    await page.goto('/temple-basic')
    const artwork = page.locator('.temple-artwork')
    await expect(artwork).toHaveAttribute('data-state', 'ready')
    await expect(page.locator('html')).not.toHaveAttribute('data-temple-loading')
    await expect(page.locator('.temple-date')).not.toHaveAttribute('data-copy-cloud', '')
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
    const source = (await first.textContent())!.replace(/\s/g, '')
    // Native selection can initially be empty while fitted layout settles.
    // Retry the actual selection, preserving the complete-text assertion.
    await expect
      .poll(() =>
        first.evaluate((p) => {
          const range = document.createRange()
          range.selectNodeContents(p)
          const selection = getSelection()!
          selection.removeAllRanges()
          selection.addRange(range)
          return selection.toString().replace(/\s/g, '')
        }),
      )
      .toBe(source)
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

for (const scheme of ['light', 'dark'] as const) {
  test(`Temple follows ${scheme} appearance while fonts load, then reveals the completed scene`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme })
    let release!: () => void
    const ready = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/*.ttf', async (route) => {
      await ready
      await route.continue()
    })
    await page.goto('/temple-basic', { waitUntil: 'commit' })
    await expect(page.locator('html')).toHaveAttribute('data-temple-loading', '')
    await expect(page.locator('.temple-page')).toHaveCSS('visibility', 'hidden')
    const ground = scheme === 'light' ? 'rgb(255, 254, 253)' : 'rgb(0, 0, 0)'
    await expect(page.locator('html')).toHaveCSS('background-color', ground)
    await expect(page.locator('body')).toHaveCSS('background-color', ground)
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
    await page.emulateMedia({ colorScheme: scheme === 'light' ? 'dark' : 'light' })
    const changedGround = scheme === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 254, 253)'
    await expect(page.locator('html')).toHaveCSS('background-color', changedGround)
    await expect(page.locator('body')).toHaveCSS('background-color', changedGround)
    release()
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await expect(page.locator('.temple-page')).toHaveCSS('visibility', 'visible')
    await expect(page.getByRole('status')).toHaveCount(0)
    expect(await page.evaluate(() => getComputedStyle(document.body, '::before').content)).toBe(
      'none',
    )
  })
}

for (const failure of ['font', 'image'] as const) {
  test(`Temple recovers readable native text after ${failure} failure`, async ({ page }) => {
    await page.route('**/*', (route) =>
      route.request().resourceType() === failure ? route.abort() : route.continue(),
    )
    await page.goto('/temple-basic')
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
  await page.goto('/temple-basic')
  await expect(page.locator('.temple-page')).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('.temple-page')).toHaveCSS('visibility', 'visible', { timeout: 10_000 })
  expect(await page.evaluate(() => getComputedStyle(document.body, '::before').opacity)).toBe('0')
  await expect(page.getByRole('heading', { name: 'Temple of Sound' })).toBeVisible()
})

test('Temple releases every old cloud surface across repeated navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-basic')
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
  await page.goto('/temple-basic')
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

for (const [width, height] of [
  [390, 844],
  [430, 932],
  [844, 390],
  [1440, 844],
]) {
  test(`Temple repetition never dips down before contact at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/temple-four-phrases')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const rises = await page.evaluate(async () => {
      const tracks = [...document.querySelectorAll<HTMLElement>('.repetition-track')]
      const stages = tracks.map((track) => track.querySelector<HTMLElement>('.repetition-stage')!)
      const rises = []
      for (const [index, stage] of stages.slice(0, -1).entries()) {
        const lock = parseFloat(getComputedStyle(stage).top)
        const release =
          scrollY +
          tracks[index].getBoundingClientRect().bottom -
          stage.getBoundingClientRect().height -
          lock
        let lowest = Infinity
        let rise = 0
        // Resolve every pixel around native release; a coarse handoff sweep can
        // step over a short down/up nudge between four-pixel animation samples.
        for (let y = Math.floor(release) - 8; y <= release + 12; y++) {
          scrollTo(0, y)
          await new Promise(requestAnimationFrame)
          await new Promise(requestAnimationFrame)
          const top = stage
            .querySelector<HTMLElement>('.repetition-statement .phrase-entry')!
            .getBoundingClientRect().top
          lowest = Math.min(lowest, top)
          rise = Math.max(rise, top - lowest)
        }
        rises.push(rise)
      }
      return rises
    })
    for (const rise of rises) expect(rise).toBeLessThanOrEqual(0.05)
  })
}

for (const width of [390, 1440]) {
  test(`Temple repetition follows scrolling without scene frames at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = (callback) =>
        raf((time) => {
          if (!(window as any).templeFramesPaused) callback(time)
        })
    })
    await page.goto('/temple-four-phrases')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    for (const index of [1, 2]) {
      const outgoing = page.locator('.repetition-stage').nth(index - 1)
      const incoming = page.locator('.repetition-stage').nth(index)
      const contact = await page
        .locator('.repetition-track')
        .nth(index)
        .evaluate((node) => {
          const previous =
            node.previousElementSibling!.querySelector<HTMLElement>('.repetition-stage')!
          const lock = parseFloat(getComputedStyle(previous).top)
          return {
            scroll: scrollY + node.getBoundingClientRect().top - (lock + previous.offsetHeight + 8),
            lock,
          }
        })
      await page.evaluate((y) => scrollTo(0, y + 10), contact.scroll)
      const expected = contact.lock - 2 * ((await page.evaluate(() => scrollY)) - contact.scroll)
      await expect.poll(async () => (await outgoing.boundingBox())!.y).toBeCloseTo(expected, 0)
      const before = (await outgoing.boundingBox())!.y
      await page.evaluate(() => {
        ;(window as any).templeFramesPaused = true
        scrollBy(0, 30)
      })
      await expect.poll(async () => (await outgoing.boundingBox())!.y).toBeLessThan(before - 50)
      const upper = (await outgoing.boundingBox())!
      const lower = (await incoming.boundingBox())!
      expect(lower.y - upper.y - upper.height).toBeGreaterThanOrEqual(7)
      await page.evaluate(() => scrollBy(0, -30))
      await expect.poll(async () => (await outgoing.boundingBox())!.y).toBeCloseTo(before, 0)
    }
  })
}

test('Temple repetition rebuilds for resize and motion changes, then disposes its animations', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/temple-four-phrases')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const stages = page.locator('.repetition-stage')
  await stages.first().evaluate((node) => {
    ;(window as any).repetitionAnimations = node
      .getAnimations({ subtree: true })
      .filter((animation) => !(animation instanceof CSSAnimation))
  })
  await page.setViewportSize({ width: 844, height: 390 })
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).repetitionAnimations.every(
          (animation: Animation) => animation.playState === 'idle',
        ),
      ),
    )
    .toBe(true)
  await page
    .locator('.repetition-track')
    .first()
    .evaluate((node) => {
      const stage = node.firstElementChild as HTMLElement
      scrollTo(
        0,
        scrollY + node.getBoundingClientRect().top - parseFloat(getComputedStyle(stage).top) + 100,
      )
    })
  const statement = stages.first().locator('.repetition-statement')
  await expect
    .poll(async () => {
      const box = (await statement.boundingBox())!
      return box.y + box.height / 2
    })
    .toBeCloseTo(195, 0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect
    .poll(() => stages.first().evaluate((node) => node.getAnimations({ subtree: true }).length))
    .toBe(0)
  await expect(stages.first()).toHaveCSS('transform', 'none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect
    .poll(() => stages.first().evaluate((node) => node.getAnimations({ subtree: true }).length))
    .toBeGreaterThan(0)
  await page.emulateMedia({ media: 'print' })
  await expect(stages.first()).toHaveCSS('transform', 'none')
  await expect(stages.first().locator('.repetition-reflection')).toHaveCSS('opacity', '1')
  await expect(stages.first().locator('.repetition-reflection .phrase-entry')).toHaveCSS(
    'transform',
    'none',
  )
  await page.emulateMedia({ media: null })
  await stages.first().evaluate((node) => {
    ;(window as any).repetitionAnimations = node
      .getAnimations({ subtree: true })
      .filter((animation) => !(animation instanceof CSSAnimation))
  })
  await page.getByRole('link', { name: 'Return to fixture' }).click()
  await expect(page.locator('.temple-opening')).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      (window as any).repetitionAnimations.every(
        (animation: Animation) => animation.playState === 'idle',
      ),
    ),
  ).toBe(true)
})

test('Temple repetition retains its handoff without native scroll timelines', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.addInitScript(() => {
    delete (window as any).ViewTimeline
  })
  await page.goto('/temple-four-phrases')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const outgoing = page.locator('.repetition-stage').first()
  const contact = await page
    .locator('.repetition-track')
    .nth(1)
    .evaluate((node) => {
      const previous = node.previousElementSibling!.querySelector<HTMLElement>('.repetition-stage')!
      return (
        scrollY +
        node.getBoundingClientRect().top -
        (parseFloat(getComputedStyle(previous).top) + previous.offsetHeight + 8)
      )
    })
  await page.evaluate((y) => scrollTo(0, y + 10), contact)
  await page.evaluate(() => new Promise(requestAnimationFrame))
  await page.evaluate(() => new Promise(requestAnimationFrame))
  const before = (await outgoing.boundingBox())!.y
  await page.evaluate(() => scrollBy(0, 30))
  await expect.poll(async () => (await outgoing.boundingBox())!.y).toBeLessThan(before - 50)
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
    // Native scroll offsets can round to pixels in WebKit; the quadratic entry
    // also already slows over these first five pixels of travel.
    expect(
      Math.abs((await incomingStage.boundingBox())!.y - (incomingAtContact.y - 10)),
    ).toBeLessThan(1.5)
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
    // This forward/reverse replay waits for 324 actual browser frames.
    test.slow()
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

test('Temple keeps ground material stable across themes and viewport changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'dark' })
  await page.goto('/temple-multiple')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page.locator('.verse-copy').first().scrollIntoViewIfNeeded()
  const pieces = page.locator('.fragment-ground-piece > g > path')
  await expect(pieces.first()).toBeAttached()
  const shapes = () => pieces.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('d')))
  const paths = await shapes()
  expect(paths.length).toBeGreaterThan(0)
  await expect(pieces.first()).toHaveAttribute('stroke-linejoin', 'round')
  await expect(pieces.first()).toHaveAttribute('stroke-width', '1.8')
  const groundInk = page.locator('.fragment-ground-piece linearGradient stop').first()
  const dark = await groundInk.evaluate((node) => getComputedStyle(node).stopColor)
  await page.emulateMedia({ colorScheme: 'light' })
  await expect
    .poll(() => groundInk.evaluate((node) => getComputedStyle(node).stopColor))
    .not.toBe(dark)
  expect(await shapes()).toEqual(paths)
  const viewport = page.viewportSize()!
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.verse-copy').first().scrollIntoViewIfNeeded()
  await expect(pieces.first()).toBeAttached()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize(viewport)
  await page.locator('.verse-copy').first().scrollIntoViewIfNeeded()
  await expect.poll(shapes).toEqual(paths)
})

for (const width of [390, 1440]) {
  test(`Temple bridge reveals sequential lines then scrolls each page away at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-four-phrases')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const pages = page.locator('.bridge-page')
    expect(await pages.count()).toBeGreaterThan(2)
    const source = await page.locator('.bridge-paragraph').allTextContents()
    const first = pages.first()
    const copy = first.locator('.bridge-body-copy')
    const geometry = await first.evaluate((node) => ({
      top: scrollY + node.getBoundingClientRect().top,
      hold: parseFloat((node as HTMLElement).style.getPropertyValue('--bridge-hold')),
      rows: Number((node as HTMLElement).dataset.rows),
    }))
    const inkInRow = (row: number) =>
      copy.locator('canvas').evaluate((node, row) => {
        const canvas = node as HTMLCanvasElement
        const ratio = canvas.height / canvas.getBoundingClientRect().height
        const lineHeight = parseFloat(getComputedStyle(canvas.parentElement!).lineHeight)
        const y = Math.floor(row * lineHeight * ratio)
        const h = Math.min(canvas.height - y, Math.floor(lineHeight * ratio))
        const data = canvas.getContext('2d')!.getImageData(0, y, canvas.width, h).data
        let count = 0
        for (let i = 3; i < data.length; i += 4) if (data[i] > 100) count++
        return count
      }, row)
    await page.evaluate((y) => scrollTo(0, y), geometry.top - 80)
    await expect.poll(() => inkInRow(0)).toBe(0)
    await page.evaluate((y) => scrollTo(0, y), geometry.top + (geometry.hold * 0.5) / geometry.rows)
    await expect(copy).toHaveAttribute('data-copy-cloud', '')
    await expect.poll(() => inkInRow(0)).toBeGreaterThan(0)
    expect(await inkInRow(1)).toBe(0)
    const firstPartial = await inkInRow(0)
    const before = (await copy.boundingBox())!.y
    await page.evaluate((y) => scrollTo(0, y), geometry.top + (geometry.hold * 1.5) / geometry.rows)
    await expect.poll(() => inkInRow(1)).toBeGreaterThan(0)
    expect(await inkInRow(0)).toBeGreaterThan(firstPartial)
    if (geometry.rows > 2) expect(await inkInRow(2)).toBe(0)
    expect((await copy.boundingBox())!.y).toBeCloseTo(before, 0)
    const fullFirstRow = await inkInRow(0)
    await page.evaluate((y) => scrollTo(0, y), geometry.top + (geometry.hold * 1.8) / geometry.rows)
    expect(await inkInRow(0)).toBe(fullFirstRow)
    await page.evaluate((y) => scrollTo(0, y), geometry.top + (geometry.hold * 0.5) / geometry.rows)
    await expect.poll(() => inkInRow(1)).toBe(0)
    await page.evaluate((y) => scrollTo(0, y), geometry.top + geometry.hold - 1)
    await expect.poll(() => inkInRow(0)).toBeGreaterThan(0)
    expect((await copy.boundingBox())!.y).toBeCloseTo(before, 0)
    await pages
      .nth(1)
      .evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top + 48))
    const outgoing = (await copy.boundingBox())!
    const incoming = (await pages.nth(1).locator('.bridge-body-copy').boundingBox())!
    expect(outgoing.y + outgoing.height).toBeLessThan(incoming.y)
    await expect(pages.nth(1).locator('.bridge-page-stage')).toBeVisible()
    expect(
      await page
        .locator('.bridge-body-copy')
        .evaluateAll((nodes) =>
          nodes.every((n) => n.getBoundingClientRect().height <= innerHeight * 0.65),
        ),
    ).toBe(true)
    await page
      .locator('.bridge-page[data-final]')
      .evaluate((node) =>
        scrollTo(
          0,
          scrollY +
            node.getBoundingClientRect().top +
            parseFloat((node as HTMLElement).style.getPropertyValue('--bridge-hold')),
        ),
      )
    await expect
      .poll(() =>
        page.locator('.bridge-page[data-final] canvas').evaluate((node) => {
          const canvas = node as HTMLCanvasElement
          const pixels = canvas
            .getContext('2d')!
            .getImageData(0, 0, canvas.width, canvas.height).data
          return pixels.some((alpha, index) => index % 4 === 3 && alpha > 100)
        }),
      )
      .toBe(true)
    await page.setViewportSize({ width: width === 390 ? 1440 : 390, height: 900 })
    await expect.poll(() => page.locator('.bridge-paragraph').allTextContents()).toEqual(source)
    // Source text is unchanged during resize; wait for the deferred glyph-mask
    // rebuild before checking the settled document width.
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      .toBe(false)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.bridge-page')).toHaveCount(0)
    await expect(page.locator('.bridge-body-copy')).toHaveCount(2)
    expect(await page.locator('.bridge-body-copy').allTextContents()).toEqual(source)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect(page.locator('.bridge-page').first()).toBeAttached()
    await page.evaluate(() => {
      ;(window as any).oldBridgeBody = document.querySelector('.bridge-body')
    })
    await page.getByRole('link', { name: 'Return to fixture' }).click()
    await expect(page.locator('.temple-artwork')).toHaveCount(0)
    const restored = await page.evaluate(() => {
      const body = (window as any).oldBridgeBody as HTMLElement
      return {
        text: [...body.querySelectorAll('.bridge-body-copy')].map((p) => p.textContent),
        masks: body.querySelectorAll('canvas, [data-copy-cloud]').length,
      }
    })
    expect(restored).toEqual({ text: source, masks: 0 })
  })
}

test('Temple bridge remains readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 900 },
  })
  const page = await context.newPage()
  await page.goto('/temple-four-phrases')
  await expect(page.locator('.bridge-body-copy')).toHaveCount(2)
  await expect(page.locator('.bridge-body-copy').first()).toBeVisible()
  await expect(page.locator('.bridge-body-copy').first()).not.toHaveCSS('font-size', '0px')
  await expect(page.locator('.bridge-body-copy canvas')).toHaveCount(0)
  await expect(page.locator('.bridge-body strong').first()).toHaveText('several bold words')
  await expect(page.locator('.bridge-body em').first()).toHaveText('some italic words')
  await context.close()
})

test('Temple bridge limits the moving front to seven glyphs', () => {
  for (const count of [1, 6, 7, 8, 31, 53, 100]) {
    for (let step = 0; step <= (count + 6) * 10; step++) {
      const scales = Array.from({ length: count }, (_, index) => bridgeGlyphScale(step / 10, index))
      expect(scales.filter((scale) => scale > 0 && scale < 1).length).toBeLessThanOrEqual(7)
      const firstChanging = scales.findIndex((scale) => scale < 1)
      if (firstChanging >= 0)
        expect(scales.slice(firstChanging + 7).every((scale) => scale === 0)).toBe(true)
    }
    expect(bridgeGlyphScale(count + 6, count - 1)).toBe(1)
  }
})

for (const colorScheme of ['dark', 'light'] as const) {
  test(`Temple bridge uses solid ink over cloud backgrounds in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/temple-four-phrases')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const first = page.locator('.bridge-page').first()
    await first.evaluate((node) =>
      scrollTo(
        0,
        scrollY +
          node.getBoundingClientRect().top +
          parseFloat((node as HTMLElement).style.getPropertyValue('--bridge-hold')) * 0.9,
      ),
    )
    const blueLead = () =>
      first.locator('canvas').evaluate((node) => {
        const canvas = node as HTMLCanvasElement
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
        let sum = 0,
          count = 0
        for (let i = 0; i < pixels.length; i += 4)
          if (pixels[i + 3] > 230) {
            sum += pixels[i + 2] - pixels[i]
            count++
          }
        return count ? sum / count : 0
      })
    await expect.poll(blueLead).toBeGreaterThan(10)
    const solidColors = await first.locator('canvas').evaluate((node) => {
      const canvas = node as HTMLCanvasElement
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
      const colors = new Set<string>()
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i + 3] === 255) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`)
      return colors.size
    })
    expect(solidColors).toBe(1)
    const cloudColors = await page.locator('.bridge-cloud-canvas').evaluate((node) => {
      const canvas = node as HTMLCanvasElement
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
      const colors = new Set<string>()
      for (let i = 0; i < pixels.length; i += 4)
        colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`)
      return colors.size
    })
    expect(cloudColors).toBeGreaterThan(5)
    const groundOverlay = await page
      .locator('.temple-bridge-ground')
      .evaluate((node) => getComputedStyle(node, '::before').content)
    expect(groundOverlay).toBe('none')
    if (colorScheme === 'light') {
      const darkEnough = await page.locator('.bridge-cloud-canvas').evaluate((node) => {
        const c = node as HTMLCanvasElement
        const pixels = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
        for (let i = 0; i < pixels.length; i += 4) {
          if (
            pixels[i + 3] > 10 &&
            (pixels[i] >= 231 || pixels[i + 1] >= 237 || pixels[i + 2] >= 242)
          )
            return false
        }
        return true
      })
      expect(darkEnough).toBe(true)
    }

    await expect
      .poll(() =>
        page.locator('.bridge-cloud-canvas').evaluate((node) => {
          const c = node as HTMLCanvasElement
          return c
            .getContext('2d')!
            .getImageData(0, 0, c.width, c.height)
            .data.reduce(
              (peak, value, index) => (index % 4 === 3 ? Math.max(peak, value) : peak),
              0,
            )
        }),
      )
      .toBeGreaterThan(30)
    await expect(page.locator('.temple-bridge-ground')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    )
  })
}

test('Temple bridge selection preserves the unfinished reveal', async ({ page }) => {
  await page.goto('/temple-four-phrases')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const copy = page.locator('.bridge-page').first().locator('.bridge-body-copy')
  await copy.evaluate((node) => {
    const track = node.closest('.bridge-page') as HTMLElement
    scrollTo(
      0,
      scrollY +
        track.getBoundingClientRect().top +
        parseFloat(track.style.getPropertyValue('--bridge-hold')) * 0.1,
    )
  })
  await expect(copy).toHaveAttribute('data-copy-cloud', '')
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  const inkCount = () =>
    copy.locator('canvas').evaluate((node) => {
      const canvas = node as HTMLCanvasElement
      return canvas
        .getContext('2d')!
        .getImageData(0, 0, canvas.width, canvas.height)
        .data.reduce((sum, value, index) => sum + (index % 4 === 3 ? value : 0), 0)
    })
  const beforeSelection = await inkCount()
  expect(beforeSelection).toBeGreaterThan(0)
  const selection = await copy.evaluate((node) => {
    const range = document.createRange()
    range.setStart(node.firstChild!, 0)
    range.setEnd(node.firstChild!, 12)
    const r = range.getBoundingClientRect()
    return { x: r.x, y: r.y + r.height / 2, end: r.right, text: range.toString() }
  })
  await page.mouse.move(selection.x, selection.y)
  await page.mouse.down()
  await page.mouse.move(selection.end, selection.y, { steps: 12 })
  await page.mouse.up()
  expect(await page.evaluate(() => getSelection()?.toString())).toBe(selection.text)
  await expect(copy.locator('canvas')).toBeVisible()
  await expect(copy).not.toHaveAttribute('data-copy-selected', '')
  expect(await copy.evaluate((node) => getComputedStyle(node, '::selection').color)).toBe(
    'rgba(0, 0, 0, 0)',
  )
  expect(await inkCount()).toBe(beforeSelection)
  // Even selecting the entire source must not expose unfinished letters.
  await copy.evaluate((node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    getSelection()!.removeAllRanges()
    getSelection()!.addRange(range)
  })
  expect(await inkCount()).toBe(beforeSelection)
  for (const tag of ['strong', 'em']) {
    expect(
      await copy
        .locator(tag)
        .first()
        .evaluate((node) => getComputedStyle(node, '::selection').color),
    ).toBe('rgba(0, 0, 0, 0)')
  }
  await page.evaluate(() => getSelection()?.removeAllRanges())
  await expect(copy.locator('canvas')).toBeVisible()
})

test('Temple bridge vapor forms locally without moving or scaling its canvas', async ({ page }) => {
  await page.goto('/temple-four-phrases')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const track = page.locator('.bridge-page').first()
  const geometry = await track.evaluate((node) => ({
    top: scrollY + node.getBoundingClientRect().top,
    hold: parseFloat((node as HTMLElement).style.getPropertyValue('--bridge-hold')),
  }))
  const cloud = page.locator('.bridge-cloud-canvas')
  const field = () =>
    cloud.evaluate((node) => {
      const canvas = node as HTMLCanvasElement
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
      let mass = 0,
        weightedY = 0
      for (let y = 0; y < canvas.height; y++)
        for (let x = 0; x < canvas.width; x++) {
          const a = pixels[(y * canvas.width + x) * 4 + 3]
          mass += a
          weightedY += ((a * y) / canvas.height) * innerHeight
        }
      return { mass, y: mass ? weightedY / mass : 0 }
    })
  await page.evaluate((y) => scrollTo(0, y), geometry.top + geometry.hold * 0.05)
  await expect.poll(async () => (await field()).mass).toBeGreaterThan(10000)
  const initial = await field()
  const rect = await cloud.boundingBox()
  await expect(cloud).toHaveCSS('transform', 'none')
  await page.evaluate((y) => scrollTo(0, y), geometry.top + geometry.hold)
  await expect.poll(async () => (await field()).mass).toBeGreaterThan(initial.mass * 1.3)
  // Sample the simulation over time: an irregular field need not have the
  // same centroid as its source text, but it should settle before departure.
  await expect
    .poll(async () => {
      const earlier = await field()
      await page.waitForTimeout(200)
      const later = await field()
      return Math.abs(later.mass - earlier.mass) / Math.max(1, earlier.mass)
    })
    .toBeLessThan(0.05)
  const before = await field()
  await page.evaluate((y) => scrollTo(0, y), geometry.top + geometry.hold + 120)
  await expect.poll(async () => (await field()).y).toBeLessThan(before.y - 35)
  expect(await cloud.boundingBox()).toEqual(rect)
  await expect(cloud).toHaveCSS('transform', 'none')
})

test('Temple bridge vapor reaches the viewport edge as text leaves', async ({ page }) => {
  await page.goto('/temple-four-phrases')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const first = page.locator('.bridge-page').first()
  const geometry = await first.evaluate((node) => ({
    top: scrollY + node.getBoundingClientRect().top,
    hold: parseFloat((node as HTMLElement).style.getPropertyValue('--bridge-hold')),
  }))
  await page.evaluate((y) => scrollTo(0, y), geometry.top + geometry.hold)
  const copyTop = (await first.locator('.bridge-body-copy').boundingBox())!.y
  await page.evaluate((y) => scrollTo(0, y), geometry.top + geometry.hold + copyTop + 80)
  await expect
    .poll(() =>
      page.locator('.bridge-cloud-canvas').evaluate((node) => {
        const canvas = node as HTMLCanvasElement
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, 1).data
        let alpha = 0
        for (let i = 3; i < pixels.length; i += 4) alpha += pixels[i]
        return alpha
      }),
    )
    .toBeGreaterThan(50)
})

test('Temple bridge glimmer dust appears with the vapor, away from the opener', async ({
  page,
}) => {
  await page.goto('/temple-four-phrases')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const dust = page.locator('.bridge-dust-canvas')
  const amount = () =>
    dust.evaluate((node) => {
      const c = node as HTMLCanvasElement
      if (!c.width || !c.height) return 0
      return c
        .getContext('2d')!
        .getImageData(0, 0, c.width, c.height)
        .data.reduce((sum, value, index) => sum + (index % 4 === 3 ? value : 0), 0)
    })
  expect(await amount()).toBe(0)
  await page
    .locator('.bridge-page')
    .first()
    .evaluate((node) =>
      scrollTo(
        0,
        scrollY +
          node.getBoundingClientRect().top +
          parseFloat((node as HTMLElement).style.getPropertyValue('--bridge-hold')),
      ),
    )
  await expect.poll(amount).toBeGreaterThan(10)
  await expect(dust).toHaveAttribute('aria-hidden', 'true')
  await expect(dust).toHaveCSS('pointer-events', 'none')
  await page.getByRole('link', { name: 'Return to fixture' }).click()
  await expect(page.locator('.bridge-dust-canvas')).toHaveCount(0)
})

test('Temple light-mode glimmers have visible contrast against the cloud', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/temple-four-phrases')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page
    .locator('.bridge-page')
    .first()
    .evaluate((node) =>
      scrollTo(
        0,
        scrollY +
          node.getBoundingClientRect().top +
          parseFloat((node as HTMLElement).style.getPropertyValue('--bridge-hold')),
      ),
    )
  await expect
    .poll(() =>
      page.evaluate(() => {
        const dust = document.querySelector<HTMLCanvasElement>('.bridge-dust-canvas')!
        const cloud = document.querySelector<HTMLCanvasElement>('.bridge-cloud-canvas')!
        if (!dust.width || !cloud.width) return 0
        const d = dust.getContext('2d')!.getImageData(0, 0, dust.width, dust.height).data
        const c = cloud.getContext('2d')!.getImageData(0, 0, cloud.width, cloud.height).data
        let visible = 0
        for (let y = 0; y < dust.height; y++)
          for (let x = 0; x < dust.width; x++) {
            const i = (y * dust.width + x) * 4,
              a = d[i + 3] / 255
            if (a < 0.02) continue
            const j =
              (Math.floor((y / dust.height) * cloud.height) * cloud.width +
                Math.floor((x / dust.width) * cloud.width)) *
              4
            const ca = c[j + 3] / 255
            const ground = [231, 237, 242],
              weight = [0.2126, 0.7152, 0.0722]
            let contrast = 0
            for (let k = 0; k < 3; k++)
              contrast += (d[i + k] - (c[j + k] * ca + ground[k] * (1 - ca))) * a * weight[k]
            if (contrast > 12) visible++
          }
        return visible
      }),
    )
    .toBeGreaterThan(12)
})

test('Temple bridge inline emphasis preserves literal text and nested formatting', () => {
  const runs = parseBridgeText('Plain **bold** and *italic* and ***both***.')
  expect(runs.map((run) => run.text).join('')).toBe('Plain bold and italic and both.')
  expect(runs.find((run) => run.text === 'bold')).toMatchObject({ bold: true, italic: false })
  expect(runs.find((run) => run.text === 'italic')).toMatchObject({ bold: false, italic: true })
  expect(runs.find((run) => run.text === 'both')).toMatchObject({ bold: true, italic: true })
  expect(parseBridgeText('**bold *and italic* bold**')).toEqual([
    { text: 'bold ', bold: true, italic: false },
    { text: 'and italic', bold: true, italic: true },
    { text: ' bold', bold: true, italic: false },
  ])
  expect(parseBridgeText('unfinished **stars')).toEqual([
    { text: 'unfinished **stars', bold: false, italic: false },
  ])
  expect(parseBridgeText(String.raw`escaped \*stars\*`)).toEqual([
    { text: 'escaped *stars*', bold: false, italic: false },
  ])
  expect(parseBridgeText('<strong>literal HTML</strong>')[0].text).toBe(
    '<strong>literal HTML</strong>',
  )
})

for (const width of [390, 1440])
  test(`Temple bridge preserves bold and italic across pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-four-phrases')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const body = page.locator('.bridge-body')
    await expect(body.getByText('several bold words', { exact: true })).toHaveCSS(
      'font-weight',
      '700',
    )
    await expect(body.getByText('some italic words', { exact: true })).toHaveCSS(
      'font-style',
      'italic',
    )
    expect(await body.textContent()).not.toContain('*')
    const repeated = body.locator('.bridge-paragraph').nth(1)
    const pages = repeated.locator('.bridge-page')
    expect(await pages.count()).toBeGreaterThan(1)
    for (let i = 0; i < (await pages.count()); i++)
      expect(await pages.nth(i).locator('strong').count()).toBeGreaterThan(0)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(body.locator('.bridge-page')).toHaveCount(0)
    await expect(body.getByText('several bold words', { exact: true })).toHaveCSS(
      'font-weight',
      '700',
    )
    await expect(body.getByText('some italic words', { exact: true })).toHaveCSS(
      'font-style',
      'italic',
    )
  })

test('Temple bridge canvas paints the native bold and italic fonts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/temple-four-phrases')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const first = page.locator('.bridge-page').first()
  await first.evaluate((node) =>
    scrollTo(
      0,
      scrollY +
        node.getBoundingClientRect().top +
        parseFloat((node as HTMLElement).style.getPropertyValue('--bridge-hold')),
    ),
  )
  for (const tag of ['strong', 'em']) {
    // This check compares one complete native run; pagination and wrapped
    // emphasis are exercised separately. Keep its fixture unwrapped.
    expect(
      await first
        .locator(tag)
        .first()
        .evaluate((node) => node.getClientRects().length),
    ).toBe(1)
    await expect
      .poll(() =>
        first
          .locator(tag)
          .first()
          .evaluate((node) => {
            const parent = node.closest('.bridge-body-copy') as HTMLElement
            const actual = parent.querySelector('canvas')!
            const expected = document.createElement('canvas')
            expected.width = actual.width
            expected.height = actual.height
            const context = expected.getContext('2d')!
            const p = parent.getBoundingClientRect(),
              r = node.getBoundingClientRect(),
              style = getComputedStyle(node)
            const ratioX = actual.width / p.width,
              ratioY = actual.height / p.height
            context.setTransform(ratioX, 0, 0, ratioY, 0, 0)
            context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
            const range = document.createRange()
            range.selectNodeContents(node)
            const textRect = range.getBoundingClientRect()
            context.fillText(
              node.textContent!,
              r.left - p.left,
              textRect.top - p.top + context.measureText('Hg').fontBoundingBoxAscent,
            )
            const x = Math.floor((r.left - p.left) * ratioX),
              y = Math.floor((r.top - p.top) * ratioY)
            const w = Math.min(actual.width - x, Math.ceil(r.width * ratioX)),
              h = Math.min(actual.height - y, Math.ceil(r.height * ratioY))
            const a = actual.getContext('2d')!.getImageData(x, y, w, h).data
            const b = context.getImageData(x, y, w, h).data
            let difference = 0,
              ink = 0
            for (let i = 3; i < a.length; i += 4) {
              difference += Math.abs(a[i] - b[i])
              ink += b[i]
            }
            return difference / Math.max(1, ink)
          }),
      )
      .toBeLessThan(0.06)
  }
})

for (const width of [390, 1440])
  test(`Temple bridge final address lingers and fades at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-four-phrases')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const final = page.locator('.bridge-page[data-final]')
    const source = final.locator('[data-bridge-linger]')
    const ghost = page.locator('.bridge-linger')
    const geometry = await final.evaluate((node) => ({
      top: scrollY + node.getBoundingClientRect().top,
      hold: parseFloat((node as HTMLElement).style.getPropertyValue('--bridge-hold')),
    }))
    await page.evaluate((y) => scrollTo(0, y), geometry.top + geometry.hold - 1)
    await expect(ghost).toBeHidden()
    const rangeRect = (selector: string) =>
      page.locator(selector).evaluate((node) => {
        const r = document.createRange()
        r.selectNodeContents(node)
        return r.getBoundingClientRect().toJSON()
      })
    const before = await rangeRect('.bridge-page[data-final] [data-bridge-linger]')
    const ink = () =>
      source.evaluate((node) => {
        const p = node.closest('.bridge-body-copy')!,
          c = p.querySelector('canvas')!,
          r = node.getBoundingClientRect(),
          pr = p.getBoundingClientRect()
        const rx = c.width / pr.width,
          ry = c.height / pr.height
        const d = c
          .getContext('2d')!
          .getImageData(
            Math.ceil((r.left - pr.left) * rx),
            Math.ceil((r.top - pr.top) * ry),
            Math.floor(r.width * rx),
            Math.floor(r.height * ry),
          ).data
        return d.reduce((sum, value, index) => sum + (index % 4 === 3 ? value : 0), 0)
      })
    await expect.poll(ink).toBeGreaterThan(100)
    const originalInk = await ink()
    await page.evaluate((y) => scrollTo(0, y), geometry.top + geometry.hold + 5)
    await expect(ghost).toBeVisible()
    const fixed = await rangeRect('.bridge-linger')
    expect(fixed.x).toBeCloseTo(before.x, 0)
    expect(fixed.y).toBeCloseTo(before.y, 0)
    await expect.poll(ink).toBeLessThan(originalInk * 0.1)
    await page.evaluate((y) => scrollTo(0, y), geometry.top + geometry.hold + 495)
    await expect
      .poll(async () => Number(await ghost.evaluate((node) => getComputedStyle(node).opacity)))
      .toBeLessThan(0.85)
    expect(Number(await ghost.evaluate((node) => getComputedStyle(node).opacity))).toBeGreaterThan(
      0.3,
    )
    expect((await rangeRect('.bridge-linger')).y).toBeCloseTo(before.y, 0)
    expect((await source.boundingBox())!.y).toBeLessThan(before.y - 400)
    const paused = await ghost.evaluate((node) => getComputedStyle(node).opacity)
    await page.waitForTimeout(200)
    expect(await ghost.evaluate((node) => getComputedStyle(node).opacity)).toBe(paused)
    await page.evaluate((y) => scrollTo(0, y), geometry.top + geometry.hold + 990)
    await expect(ghost).toBeHidden()
    await page.evaluate((y) => scrollTo(0, y), geometry.top + geometry.hold - 1)
    await expect.poll(ink).toBeGreaterThan(originalInk * 0.9)
    await expect(ghost).toBeHidden()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.bridge-linger')).toHaveCount(0)
    await expect(page.locator('.bridge-page')).toHaveCount(0)
  })

for (const [width, height] of [
  [390, 844],
  [1440, 900],
  [844, 390],
]) {
  test(`Temple rise reaches centre before a shared assembly hold at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/temple-rise')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const rise = page.locator('.verse-rise')
    const calls = rise.locator('.rise-call')
    expect(
      await calls.evaluateAll((nodes) =>
        nodes.every((node) => getComputedStyle(node).position === 'relative'),
      ),
    ).toBe(true)
    const fonts = await calls.evaluateAll((nodes) =>
      nodes.map((n) => parseFloat(getComputedStyle(n).fontSize)),
    )
    for (let i = 1; i < fonts.length; i++) expect(fonts[i]).toBeGreaterThan(fonts[i - 1])
    const ink = calls.locator('.rise-call-ink')
    const widths = await ink.evaluateAll((nodes) =>
      nodes.map((n) => n.getBoundingClientRect().width),
    )
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeGreaterThan(widths[i - 1])
    expect(
      await ink.last().evaluate((node) => {
        const range = document.createRange()
        range.selectNodeContents(node)
        return range.getClientRects().length
      }),
    ).toBe(1)
    const column = await page.locator('.final-verse').boundingBox()
    const portrait = width <= 640 && height > width
    expect((await calls.last().boundingBox())!.width).toBeCloseTo(
      portrait ? width * 1.01 : width - 32,
      0,
    )
    expect((await calls.last().boundingBox())!.width).toBeGreaterThan(column!.width)
    if (portrait) {
      const extent = await ink.last().evaluate((node) => {
        const style = getComputedStyle(node)
        const measure = document.createElement('canvas').getContext('2d')!
        measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        const metrics = measure.measureText(node.textContent!)
        return Math.max(
          metrics.width,
          metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
        )
      })
      expect(extent).toBeGreaterThan(width)
      expect(extent).toBeLessThan(width * 1.015)
    } else {
      expect(widths.at(-1)!).toBeGreaterThan((width - 32) * 0.85)
      expect(widths.at(-1)!).toBeLessThan((width - 32) * 0.92)
    }
    expect((await page.locator('.verse-drop-copy').boundingBox())!.width).toBeCloseTo(
      column!.width,
      0,
    )
    // Each delayed call stays below the screen until its own short approach,
    // reaches the same centre, then immediately travels with native scrolling.
    for (let index = 0; index < 4; index++) {
      const call = calls.nth(index)
      const arrival = await call.evaluate((node) => {
        const rect = node.getBoundingClientRect()
        const offset = new DOMMatrix(getComputedStyle(node).transform).m42
        return scrollY + rect.top - offset + rect.height / 2 - innerHeight / 2
      })
      if (index > 0) {
        await page.evaluate((y) => scrollTo(0, y), arrival - height * 0.1)
        await expect.poll(async () => (await call.boundingBox())!.y).toBeGreaterThan(height)
      }
      // Scroll offsets are quantised to whole pixels in some engines.
      await page.evaluate((y) => scrollTo(0, Math.ceil(y)), arrival)
      await expect
        .poll(() =>
          call.evaluate((node) => {
            const rect = node.getBoundingClientRect()
            return Math.abs(rect.top + rect.height / 2 - innerHeight / 2)
          }),
        )
        .toBeLessThan(1.1)
      if (index === 3) {
        // No word may begin assembling before the final call's arrival.
        await page.evaluate((y) => scrollTo(0, Math.floor(y) - 1), arrival)
        await expect
          .poll(() =>
            page
              .locator('.verse-drop-word')
              .evaluateAll((nodes) =>
                Math.max(...nodes.map((node) => parseFloat(getComputedStyle(node).opacity))),
              ),
          )
          .toBe(0)
        await page.evaluate((y) => scrollTo(0, Math.ceil(y)), arrival)
      }
      // Backtracking for the gate check schedules another timeline update.
      // Wait for its arrival before measuring subsequent native movement.
      await expect
        .poll(() =>
          call.evaluate((node) => Math.abs(new DOMMatrix(getComputedStyle(node).transform).m42)),
        )
        .toBeLessThan(0.1)
      const before = (await call.boundingBox())!.y
      await page.evaluate(() => scrollBy(0, 50))
      await expect.poll(async () => (await call.boundingBox())!.y - before).toBeCloseTo(-50, 0)
    }
    const drop = page.locator('.verse-drop-copy')
    expect(
      await page.locator('.verse-finale-stage').evaluate((node) => getComputedStyle(node).position),
    ).toBe('sticky')
    const pin = await page.locator('.verse-finale').evaluate((node) => {
      const rect = node.getBoundingClientRect()
      const stageHeight = node.querySelector('.verse-finale-stage')!.getBoundingClientRect().height
      return {
        start:
          scrollY + rect.top - parseFloat(getComputedStyle(node).getPropertyValue('--finale-top')),
        hold: rect.height - stageHeight,
      }
    })
    const meanOpacity = () =>
      page
        .locator('.verse-drop-word')
        .evaluateAll(
          (nodes) =>
            nodes.reduce((sum, node) => sum + parseFloat(getComputedStyle(node).opacity), 0) /
            nodes.length,
        )
    await page.evaluate((y) => scrollTo(0, y), pin.start + pin.hold * 0.25)
    await expect.poll(meanOpacity).toBeGreaterThan(0)
    const partial = await meanOpacity()
    const pinnedY = (await drop.boundingBox())!.y
    const pinnedCalls = await calls.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    )
    expect(
      (await calls.last().boundingBox())!.y + (await calls.last().boundingBox())!.height,
    ).toBeLessThanOrEqual(pinnedY + 1)
    expect(pinnedY + (await drop.boundingBox())!.height / 2).toBeCloseTo(height * 0.5, 0)
    await page.evaluate((y) => scrollTo(0, y), pin.start + pin.hold * 0.75)
    await expect.poll(meanOpacity).toBeGreaterThan(partial)
    expect((await drop.boundingBox())!.y).toBeCloseTo(pinnedY, 0)
    const heldCalls = await calls.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    )
    for (let index = 0; index < heldCalls.length; index++)
      expect(heldCalls[index]).toBeCloseTo(pinnedCalls[index], 0)
    await page.evaluate((y) => scrollTo(0, Math.ceil(y) + 1), pin.start + pin.hold)
    await expect
      .poll(() =>
        page
          .locator('.verse-drop-word')
          .evaluateAll((nodes) =>
            Math.min(...nodes.map((node) => parseFloat(getComputedStyle(node).opacity))),
          ),
      )
      .toBeGreaterThan(0.8)
    // The earlier exit must overlap visible depth motion, not merely an
    // imperceptible easing tail whose progress is fractionally below one.
    const remainingDepth = () =>
      page
        .locator('.verse-drop-word')
        .evaluateAll((nodes) =>
          Math.max(...nodes.map((node) => new DOMMatrix(getComputedStyle(node).transform).m43)),
        )
    await expect.poll(remainingDepth).toBeGreaterThan(20)
    expect(await remainingDepth()).toBeLessThan(200)
    const dropBefore = (await drop.boundingBox())!.y
    const callsBefore = await calls.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    )
    await page.evaluate(() => scrollBy(0, 50))
    await expect.poll(async () => (await drop.boundingBox())!.y - dropBefore).toBeCloseTo(-50, 0)
    const callsAfter = await calls.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    )
    for (let index = 0; index < callsAfter.length; index++)
      expect(callsAfter[index] - callsBefore[index]).toBeCloseTo(-50, 0)
    await page.evaluate((y) => scrollTo(0, Math.ceil(y)), pin.start + pin.hold * 1.2)
    await expect
      .poll(() =>
        page
          .locator('.verse-drop-word')
          .evaluateAll((nodes) =>
            nodes.every(
              (node) => node.getAnimations()[0].effect!.getComputedTiming().progress === 1,
            ),
          ),
      )
      .toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect
      .poll(() =>
        calls.evaluateAll((nodes) =>
          nodes.every((n) => getComputedStyle(n).animationName === 'none'),
        ),
      )
      .toBe(true)
  })
}

for (const reduced of [false, true])
  for (const width of [390, 1440]) {
    test(`Temple final refrain resolves four phrases after the drop at ${width}px (reduced: ${reduced})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/temple-rise')
      await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
      const finalVerse = page.locator('.final-verse')
      await expect(finalVerse).toHaveAttribute('data-has-refrain', '')
      await expect(finalVerse).toHaveCSS('padding-bottom', '0px')
      await expect(page.locator('.rise-controls, input[type=range]')).toHaveCount(0)
      const chorus = page.locator('.final-refrain .refrain-composition')
      await expect(chorus).toHaveAttribute('data-ready', 'true')
      const phrases = chorus.locator('.refrain-phrase')
      const runway = await chorus.evaluate(
        (node) =>
          node.getBoundingClientRect().height -
          node.querySelector('.refrain-stage')!.getBoundingClientRect().height,
      )
      expect(runway).toBeCloseTo(900 * 0.78, 0)
      expect(
        await phrases.evaluateAll((nodes) =>
          nodes.map((node) => (node as HTMLElement).dataset.face),
        ),
      ).toEqual(['cinzel', 'cinzel', 'unbounded', 'cinzel'])
      const gap =
        (await chorus.boundingBox())!.y -
        ((await finalVerse.boundingBox())!.y + (await finalVerse.boundingBox())!.height)
      expect(gap).toBeGreaterThanOrEqual(0)
      expect(gap).toBeLessThanOrEqual(48)
      for (let index = 0; index < 4; index++) {
        await chorus.evaluate((node, progress) => {
          const rect = node.getBoundingClientRect()
          const stage = node.querySelector('.refrain-stage')!.getBoundingClientRect()
          scrollTo(
            0,
            scrollY +
              rect.top -
              (innerHeight - stage.height) / 2 +
              (rect.height - stage.height) * progress,
          )
        }, index / 3)
        await expect(chorus).toHaveAttribute('data-active', String(index))
      }
      const long = phrases.nth(2).locator('[data-ink]')
      expect((await long.boundingBox())!.height).toBeLessThanOrEqual(451)
      expect(
        await long.locator('[data-word]').evaluateAll((nodes) =>
          nodes.every((node) => {
            const rect = node.getBoundingClientRect()
            return rect.left >= -1 && rect.right <= innerWidth + 1
          }),
        ),
      ).toBe(true)
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
      await expect(chorus).toHaveAttribute('data-active', '3')
      await expect
        .poll(() =>
          chorus.locator('.refrain-stage').evaluate((node) => {
            const rect = node.getBoundingClientRect()
            return rect.top + rect.height / 2
          }),
        )
        .toBeCloseTo(450, 0)
      const atEnd = await chorus.locator('.refrain-stage').boundingBox()
      await page.evaluate(() => scrollBy(0, 100))
      expect((await chorus.locator('.refrain-stage').boundingBox())!.y).toBeCloseTo(atEnd!.y, 0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      )
    })
  }

for (const viewport of [
  { width: 390, height: 844 },
  { width: 390, height: 664 },
  { width: 375, height: 568 },
]) {
  test(`Temple mobile final phrase stays centred at page end at ${viewport.width}x${viewport.height}`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ baseURL, viewport, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    try {
      await page.goto('/temple-rise')
      await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
      const chorus = page.locator('.final-refrain .refrain-composition')
      const stage = chorus.locator('.refrain-stage')
      const ending = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
      const center = () =>
        stage.evaluate((node) => {
          const rect = node.getBoundingClientRect()
          return rect.top + rect.height / 2
        })
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
      await expect(chorus).toHaveAttribute('data-active', '3')
      // Position belongs to native sticky layout even when enhancement frames
      // stall. Exercise approach, page end and reverse scroll without a repaint.
      await page.evaluate(() => {
        window.requestAnimationFrame = () => 0
      })
      for (const offset of [-40, -5, 0, -10, 0]) {
        await page.evaluate((y) => scrollTo(0, y), ending + offset)
        await expect(chorus).toHaveAttribute('data-active', '3')
        await expect.poll(center).toBeCloseTo(viewport.height / 2, 0)
      }
      // Real preceding type/rise layout has fractional CSS-pixel extents.
      // Vary that geometry: integer scrollHeight must not carry the final
      // sticky stage past its release boundary, even for part of a pixel.
      for (const fraction of [0, 0.25, 0.5, 0.75]) {
        await chorus.evaluate((node, fraction) => {
          node.parentElement!.style.paddingTop = `${fraction}px`
          scrollTo(0, document.documentElement.scrollHeight)
        }, fraction)
        await expect
          .poll(() =>
            stage.evaluate(
              (node) => node.getBoundingClientRect().top - parseFloat(getComputedStyle(node).top),
            ),
          )
          .toBeCloseTo(0, 2)
      }
    } finally {
      await context.close()
    }
  })
}

for (const width of [390, 1440]) {
  test(`Temple sculpture resumes after the bridge at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-bridge-finale')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await page.addStyleTag({ content: '.fragment-ground-plane { animation: none !important; }' })
    const pieces = page.locator('.fragment-ground-piece')
    const visiblePieces = () =>
      pieces.evaluateAll(
        (nodes) =>
          nodes.filter((node) => {
            const rect = node.getBoundingClientRect()
            return (
              rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
            )
          }).length,
      )
    const phrase = page.locator('.final-verse-phrase').first()
    await phrase.evaluate((node) =>
      scrollTo(0, scrollY + node.getBoundingClientRect().top - innerHeight * 0.35),
    )
    await expect.poll(visiblePieces).toBeGreaterThan(0)
    const bridge = page.locator('.bridge-page').first()
    await bridge.evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top + 100))
    await expect.poll(visiblePieces).toBe(0)
    // Native parallax must reveal the same arrangement on forward seeking.
    await phrase.evaluate((node) =>
      scrollTo(0, scrollY + node.getBoundingClientRect().top - innerHeight * 0.35),
    )
    await expect.poll(visiblePieces).toBeGreaterThan(0)
    const chorus = page.locator('.final-refrain .refrain-composition')
    await chorus.evaluate((node) => {
      const stage = node.querySelector<HTMLElement>('.refrain-stage')!
      const hold = node.getBoundingClientRect().height - stage.offsetHeight
      scrollTo(
        0,
        scrollY +
          node.getBoundingClientRect().top -
          parseFloat(getComputedStyle(stage).top) +
          hold / 2,
      )
    })
    await expect
      .poll(() =>
        pieces.evaluateAll((nodes) => {
          const stage = document
            .querySelector('.final-refrain .refrain-stage')!
            .getBoundingClientRect()
          return nodes.every((node) => {
            const box = node.getBoundingClientRect()
            return (
              box.bottom <= stage.top ||
              box.top >= stage.bottom ||
              box.right <= 0 ||
              box.left >= innerWidth
            )
          })
        }),
      )
      .toBe(true)
    // The closing chorus has no departure: its ground must stay empty all the
    // way to the document end, including below the centred final phrase.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
    await expect(chorus).toHaveAttribute('data-active', '3')
    await expect.poll(visiblePieces).toBe(0)
  })
}
