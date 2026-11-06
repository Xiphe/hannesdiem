import { expect, test } from '@playwright/test'
import sharp from 'sharp'

test('entering from the end of the poem arrives at Visit rather than retaining the old scroll', async ({
  page,
}) => {
  await page.goto('/temple-entry-poem')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await page.locator('.temple-entry-closing a').click()
  await expect(page).toHaveURL(/\/temple-of-sound\/visit$/)
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page.waitForTimeout(500)
  await expect
    .poll(() =>
      page.locator('#facts').evaluate((node) => Math.round(node.getBoundingClientRect().top)),
    )
    .toBeGreaterThan(0)
  expect(
    await page.locator('#facts').evaluate((node) => node.getBoundingClientRect().top),
  ).toBeLessThan(200)
  await page.locator('#share').scrollIntoViewIfNeeded()
  await page.goBack()
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await page.locator('.temple-entry-closing a').click()
  await expect(page).toHaveURL(/\/temple-of-sound\/visit$/)
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page.waitForTimeout(500)
  await expect
    .poll(() =>
      page.locator('#facts').evaluate((node) => Math.round(node.getBoundingClientRect().top)),
    )
    .toBeGreaterThan(0)
  expect(
    await page.locator('#facts').evaluate((node) => node.getBoundingClientRect().top),
  ).toBeLessThan(200)
})

test('decorative nav gaps keep a pointer and highlight the closest section without enlarging the piece', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/temple-of-sound/visit')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const nav = page.locator('.temple-nav-items')
  const piece = nav.locator('.temple-nav-separator-slot').first()
  const bounds = (await piece.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  const cursor = await page.evaluate(
    ({ x, y }) => getComputedStyle(document.elementFromPoint(x, y)!).cursor,
    { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
  )
  expect(cursor).toBe('pointer')
  await expect(piece.locator('svg')).toHaveCSS('transform', 'none')
  await expect(nav.locator('[data-nav-point]:hover')).toHaveCount(1)
  await page.mouse.move(0, 500)
  await expect(nav.locator('[data-nav-point]:hover')).toHaveCount(0)
})

test('the header date belongs to the same poem link as the wordmark', async ({ page }) => {
  await page.goto('/temple-of-sound/visit')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.temple-nav-brand')).toHaveAttribute('href', '/temple-of-sound')
  await expect(page.locator('.temple-nav-brand a')).toHaveCount(0)
  await page.locator('.temple-nav-date').click()
  await expect(page).toHaveURL('/temple-of-sound')
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(10)
})

for (const width of [390, 1440]) {
  test(`navigation paint shares stable native pointer targets throughout at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-of-sound/visit')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    for (const selector of ['.temple-nav-items', '.temple-nav-brand', '.temple-nav-logo']) {
      const failures = await page.locator(selector).evaluate((node) => {
        const box = node.getBoundingClientRect()
        const failures: { x: number; y: number; tag: string; cursor: string }[] = []
        for (let x = box.left + 1; x < box.right; x += 4) {
          for (const y of [box.top + 1, box.top + box.height / 2, box.bottom - 1]) {
            const hit = document.elementFromPoint(x, y)!
            const cursor = getComputedStyle(hit).cursor
            if (
              cursor !== 'pointer' ||
              !(hit instanceof HTMLAnchorElement || hit instanceof HTMLButtonElement)
            )
              failures.push({ x, y, tag: hit.tagName, cursor })
          }
        }
        return failures
      })
      expect(failures, selector).toEqual([])
    }
    const nav = page.locator('.temple-nav-items')
    const box = (await nav.boundingBox())!
    for (let x = box.x + 2; x < box.x + box.width; x += 16) {
      await page.mouse.move(x, box.y + box.height / 2)
      await expect(nav.locator('[data-nav-point]:hover')).toHaveCount(1)
    }
  })
}

test('the welcome button hands over to the centered header button at the top', async ({ page }) => {
  await page.goto('/temple-entry-poem')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const button = page.locator('.temple-entry-welcome a')
  const hint = page.locator('.temple-entry-more')
  const header = page.locator('.temple-top-navigation')
  await button.evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top - 100))
  await expect(header).not.toHaveAttribute('data-nav-visible', '')
  await expect(hint).toBeVisible()
  await button.evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top))
  await expect(header).toHaveAttribute('data-nav-visible', '')
  await expect(header).toHaveCSS('transition-property', 'visibility')
  await expect(header).toHaveCSS('opacity', '1')
  await expect(button).toHaveCSS('visibility', 'hidden')
  await expect(hint).not.toBeVisible()
  await expect(header.locator('.temple-nav-enter a')).toBeVisible()
  const handoff = await header.evaluate(async (node) => {
    const welcome = document.querySelector('.temple-entry-welcome a')!
    const action = node.querySelector('.temple-nav-enter a')!
    const samples = []
    for (let frame = 0; frame < 20; frame++) {
      samples.push({
        old: getComputedStyle(welcome).visibility,
        opacity: getComputedStyle(action).opacity,
        parentOpacity: getComputedStyle(node).opacity,
      })
      await new Promise(requestAnimationFrame)
    }
    return samples
  })
  expect(handoff.every((frame) => frame.old === 'hidden')).toBe(true)
  expect(handoff.every((frame) => frame.opacity === '1' && frame.parentOpacity === '1')).toBe(true)
  await expect
    .poll(() => header.evaluate((node) => Math.round(node.getBoundingClientRect().top)))
    .toBe(0)
  const box = (await header.boundingBox())!
  const action = (await header.locator('.temple-nav-enter a').boundingBox())!
  expect(Math.abs(action.y + action.height / 2 - box.y - box.height / 2)).toBeLessThan(1)
  await expect(button).toHaveText((await header.locator('.temple-nav-enter a').textContent()) ?? '')
  await expect(header.locator('.temple-nav-logo')).toHaveCSS('opacity', '1')
  await button.evaluate((node) => {
    const header = document.querySelector<HTMLElement>('.temple-top-navigation')!
    const top = (header.offsetHeight - (node as HTMLElement).offsetHeight) / 2 + 2
    scrollTo(0, scrollY + node.getBoundingClientRect().top - top)
  })
  await expect(header).not.toHaveAttribute('data-nav-visible', '')
  await expect(button).toBeVisible()
  await expect(hint).toBeVisible()
  await expect(header.locator('.temple-nav-enter')).toHaveCSS('visibility', 'hidden')
  const exit = await header.evaluate(async (node) => {
    const start = performance.now()
    for (;;) {
      await new Promise(requestAnimationFrame)
      const sample = {
        visibility: getComputedStyle(node).visibility,
        backdrop: Number(getComputedStyle(node, '::before').opacity),
        logo: Number(getComputedStyle(node.querySelector('.temple-nav-logo')!).opacity),
        headerLayer: Number(getComputedStyle(node).zIndex),
        invitationLayer: Number(getComputedStyle(document.querySelector('.poem-pairs')!).zIndex),
      }
      if (
        (sample.backdrop > 0 && sample.backdrop < 1 && sample.logo > 0 && sample.logo < 1) ||
        performance.now() - start > 1000
      )
        return sample
    }
  })
  expect(exit.visibility).toBe('visible')
  expect(exit.backdrop).toBeGreaterThan(0)
  expect(exit.backdrop).toBeLessThan(1)
  expect(exit.logo).toBeGreaterThan(0)
  expect(exit.logo).toBeLessThan(1)
  expect(exit.invitationLayer).toBeGreaterThan(exit.headerLayer)
  await expect(header).not.toBeVisible()
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the poem header keeps its full frame and inner-page treatment in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.emulateMedia({ colorScheme })
    await page.goto('/temple-of-sound/visit')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const treatment = () =>
      page.locator('.temple-top-navigation').evaluate((node) => {
        const style = getComputedStyle(node)
        return {
          shadow: style.boxShadow,
          borderWidth: style.borderBottomWidth,
          borderStyle: style.borderBottomStyle,
          borderColor: style.borderBottomColor,
        }
      })
    const inside = await treatment()
    if (colorScheme === 'light') {
      expect(inside.borderWidth).toBe('0px')
      expect(inside.shadow).not.toBe('none')
    }
    await page.goto('/temple-entry-poem')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await page
      .locator('.temple-entry-welcome a')
      .evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top + 120))
    const header = page.locator('.temple-top-navigation')
    await expect(header).toHaveAttribute('data-nav-hint-covered', '')
    await expect(header.locator('.temple-nav-logo')).toHaveCSS('opacity', '1')
    const frame = await header.evaluate((node) => {
      const style = getComputedStyle(node)
      const backdrop = getComputedStyle(node, '::before')
      const action = node.querySelector('.temple-nav-enter a')!.getBoundingClientRect()
      return {
        paintedBottom: node.getBoundingClientRect().top + parseFloat(backdrop.height),
        actionBottom: action.bottom,
        padding: parseFloat(style.paddingBottom),
      }
    })
    expect(frame.paintedBottom - frame.actionBottom).toBeGreaterThanOrEqual(frame.padding - 1)
    expect(await treatment()).toEqual(inside)
  })
}

for (const width of [390, 1440]) {
  test(`the manifesto hint passes behind the full header at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-entry-poem')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const button = page.locator('.temple-entry-welcome a')
    const hint = page.locator('.temple-entry-more')
    const header = page.locator('.temple-top-navigation')
    // A synthetic marker exposes any hole in the opaque header background.
    await hint.evaluate((node) => {
      node.style.backgroundColor = 'rgb(0, 255, 0)'
      node.style.color = 'rgb(0, 255, 0)'
      node.style.opacity = '1'
    })
    await button.evaluate((node) => {
      const header = document.querySelector<HTMLElement>('.temple-top-navigation')!
      const top = (header.offsetHeight - (node as HTMLElement).offsetHeight) / 2 - 1
      scrollTo(0, scrollY + node.getBoundingClientRect().top - top)
    })
    await expect(header).toHaveAttribute('data-nav-visible', '')
    await expect(header.locator('.temple-nav-logo')).toHaveCSS('opacity', '1')
    const bar = (await header.boundingBox())!
    const barBottom = bar.y + bar.height
    const before = (await hint.boundingBox())!
    const hintPixel = async (y: number) => {
      const screenshot = await page.screenshot({
        clip: { x: Math.ceil(before.x + before.width / 2), y: Math.ceil(y), width: 1, height: 1 },
      })
      return [...(await sharp(screenshot).removeAlpha().raw().toBuffer())]
    }
    const expectCovered = async () => {
      const [red, green, blue] = await hintPixel(barBottom - 3)
      expect(Math.abs(green - red)).toBeLessThan(15)
      expect(Math.abs(green - blue)).toBeLessThan(15)
    }
    const expectOutside = async () => {
      // The header's soft shadow can darken the visible marker slightly.
      const [red, green, blue] = await hintPixel(barBottom + 3)
      expect(red).toBeLessThan(10)
      expect(green).toBeGreaterThan(240)
      expect(blue).toBeLessThan(10)
    }
    const moveHint = (top: number) =>
      hint.evaluate(
        (node, top) => scrollTo(0, scrollY + node.getBoundingClientRect().top - top),
        top,
      )
    await moveHint(barBottom - before.height / 2)
    await expect(hint).toBeVisible()
    await expectCovered()
    await expectOutside()
    await moveHint(barBottom - before.height - 1)
    await expect(hint).not.toBeVisible()
    // Neither upward travel nor reverse scroll may expose it inside the bar.
    await moveHint(bar.y - before.height / 2)
    await expect(hint).not.toBeVisible()
    await moveHint(barBottom - before.height / 2)
    await expect(hint).toBeVisible()
    await expectCovered()
    await expectOutside()
  })
}

for (const width of [390, 1440]) {
  test(`Enter handoff keeps button geometry stable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => {
      const original = Element.prototype.animate
      Element.prototype.animate = function (keyframes, options) {
        const motion = original.call(this, keyframes, options)
        if (
          this.matches(
            '.temple-nav-enter a, .temple-entry-welcome a, .temple-nav-enter a > span, .temple-entry-welcome a > span',
          )
        ) {
          motion.pause()
          motion.currentTime = 0
        }
        return motion
      }
    })
    await page.goto('/temple-entry-poem')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const button = page.locator('.temple-entry-welcome a')
    const header = page.locator('.temple-top-navigation')
    const fixed = header.locator('.temple-nav-enter a')
    await button.evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top - 100))
    await expect(header).not.toHaveAttribute('data-nav-visible', '')
    const initial = (await button.boundingBox())!.width
    const initialLayout = await button.evaluate((node) => (node as HTMLElement).offsetWidth)
    const full = (await fixed.boundingBox())!.width
    const fullLayout = await fixed.evaluate((node) => (node as HTMLElement).offsetWidth)
    await button.evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top))
    await expect(header).toHaveAttribute('data-nav-visible', '')
    // Width changes rebuild the button's decoration through ResizeObserver.
    // Sample the real handoff at deterministic animation times, including reverse.
    const samples = await fixed.evaluate(async (node) => {
      const extra = node.querySelector<HTMLElement>('.temple-enter-label-extra')!
      const label = node.querySelector<HTMLElement>('span')!
      let resizes = 0
      const observer = new ResizeObserver(() => resizes++)
      observer.observe(node)
      const frames = []
      for (const time of [0, 70, 140, 210]) {
        for (const motion of node.getAnimations({ subtree: true })) {
          if (
            motion.effect instanceof KeyframeEffect &&
            [node, extra, label].includes(motion.effect.target as HTMLElement)
          )
            motion.currentTime = time
        }
        await new Promise(requestAnimationFrame)
        await new Promise(requestAnimationFrame)
        frames.push({
          width: node.getBoundingClientRect().width,
          layoutWidth: (node as HTMLElement).offsetWidth,
          labelWidth: label.getBoundingClientRect().width,
          extraWidth: extra.offsetWidth,
          opacity: Number(getComputedStyle(extra).opacity),
        })
      }
      observer.disconnect()
      return { frames, resizes }
    })
    expect(samples.frames.map((frame) => frame.layoutWidth)).toEqual(
      samples.frames.map(() => fullLayout),
    )
    expect(samples.frames[0].width).toBeCloseTo(initial, 1)
    expect(samples.frames[2].width).toBeGreaterThan(Math.min(initial, full))
    expect(samples.frames[2].width).toBeLessThan(Math.max(initial, full))
    for (const frame of samples.frames)
      expect(frame.labelWidth).toBeCloseTo(samples.frames[0].labelWidth, 1)
    expect(new Set(samples.frames.map((frame) => frame.extraWidth)).size).toBe(1)
    expect(samples.resizes).toBeLessThanOrEqual(1)
    expect(samples.frames[0].opacity).toBe(0)
    expect(samples.frames[1].opacity).toBeGreaterThan(0)
    expect(samples.frames[1].opacity).toBeLessThan(1)
    // Reverse mid-morph from its painted size, without rebuilding layout.
    await button.evaluate((node) => {
      const header = document.querySelector<HTMLElement>('.temple-top-navigation')!
      const top = (header.offsetHeight - (node as HTMLElement).offsetHeight) / 2 + 4
      scrollTo(0, scrollY + node.getBoundingClientRect().top - top)
    })
    await expect(header).not.toHaveAttribute('data-nav-visible', '')
    expect(await button.evaluate((node) => (node as HTMLElement).offsetWidth)).toBe(initialLayout)
    expect((await button.boundingBox())!.width).toBeCloseTo(samples.frames.at(-1)!.width, 1)
    expect(await fixed.evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0)
    await expect(button.locator('.temple-enter-label-extra')).toHaveCSS('max-width', '0px')
    // A second entry must not inherit a cancelled, partly transparent label.
    await button.evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top))
    await expect(header).toHaveAttribute('data-nav-visible', '')
    await fixed.evaluate((node) => {
      for (const motion of node.getAnimations({ subtree: true })) motion.finish()
    })
    await expect(fixed.locator('.temple-enter-label-extra')).toHaveCSS('opacity', '1')
    expect((await fixed.boundingBox())!.width).toBeCloseTo(full, 0)
    await expect(fixed).toHaveAttribute('href', '/temple-of-sound/visit')
  })
}

test('reduced motion switches Enter labels directly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-entry-poem')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const button = page.locator('.temple-entry-welcome a')
  const fixed = page.locator('.temple-nav-enter a')
  await button.evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top))
  await expect(page.locator('.temple-top-navigation')).toHaveAttribute('data-nav-visible', '')
  await expect(fixed).toHaveText('Enter the Temple of Sound')
  await expect(fixed.locator('.temple-enter-label-extra')).toHaveCSS('opacity', '1')
  expect(
    await fixed.evaluate(
      (node) =>
        node
          .getAnimations({ subtree: true })
          .filter(
            (motion) => !(motion instanceof CSSTransition) && !(motion instanceof CSSAnimation),
          ).length,
    ),
  ).toBe(0)
})

for (const width of [390, 1440]) {
  test(`the closing action fades into the remaining viewport space at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-entry-poem')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const chorus = page.locator('.final-refrain .refrain-composition')
    const stage = chorus.locator('.refrain-stage')
    const action = chorus.locator('.temple-entry-closing')
    const { start, runway } = await chorus.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      const stage = node.querySelector<HTMLElement>('.refrain-stage')!
      const height = document.querySelector<HTMLElement>('.temple-stage')!.offsetHeight
      const runway = parseFloat(getComputedStyle(node).getPropertyValue('--refrain-entry-runway'))
      return {
        start: Math.ceil(
          scrollY +
            rect.top -
            (height - stage.offsetHeight) / 2 +
            rect.height -
            stage.offsetHeight -
            runway -
            2,
        ),
        runway,
      }
    })
    await page.evaluate((y) => scrollTo(0, y), start + 2)
    await expect(chorus).toHaveAttribute('data-active', '3')
    const held = (await stage.boundingBox())!.y
    await page.evaluate((y) => scrollTo(0, y), start + runway * 0.2)
    await expect
      .poll(() => action.evaluate((node) => Number(getComputedStyle(node).opacity)))
      .toBeGreaterThan(0.1)
    expect(await action.evaluate((node) => Number(getComputedStyle(node).opacity))).toBeLessThan(
      0.9,
    )
    expect(Math.abs((await stage.boundingBox())!.y - held)).toBeLessThan(2)
    await page.evaluate((y) => scrollTo(0, y), start + runway * 0.5)
    await expect(action).toHaveCSS('opacity', '1')
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
    await expect(action).toHaveCSS('opacity', '1')
    await expect(chorus).toHaveAttribute('data-active', '3')
    expect(Math.abs((await stage.boundingBox())!.y - held)).toBeLessThan(2)
    await expect(action.getByRole('link')).toHaveText('Enter')
    const spacing = await stage.evaluate((node) => {
      const bounds = node.getBoundingClientRect()
      const tail = parseFloat(getComputedStyle(node).getPropertyValue('--refrain-tail-gap'))
      const action = node.querySelector('.temple-entry-closing')!.getBoundingClientRect()
      return {
        above: action.top - (bounds.bottom - tail),
        below: innerHeight - action.bottom,
      }
    })
    expect(Math.abs(spacing.above - spacing.below)).toBeLessThan(2)
  })
}

test('desktop practical progress flows through the decorative gaps without jumps', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Native ScrollTimeline keyframes are inspected in Chromium.',
  )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/temple-of-sound/visit')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const jumps = await page.locator('.temple-nav-progress span').evaluate((node) => {
    const frames = (node.getAnimations()[0].effect as KeyframeEffect).getKeyframes()
    return frames.slice(1).flatMap((frame, index) => {
      const before = frames[index]
      return frame.computedOffset === before.computedOffset && frame.transform !== before.transform
        ? [[before.transform, frame.transform]]
        : []
    })
  })
  expect(jumps).toEqual([])
})

for (const nativeTimeline of [true, false]) {
  test(`practical progress starts at Visit, excluding the manifesto return (${nativeTimeline ? 'native' : 'fallback'})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    if (!nativeTimeline)
      await page.addInitScript(() => {
        Object.defineProperty(window, 'ScrollTimeline', { value: undefined })
      })
    await page.goto('/temple-of-sound/visit')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const arrival = await page
      .locator('#facts')
      .evaluate(
        (node) =>
          scrollY +
          node.getBoundingClientRect().top -
          parseFloat(getComputedStyle(node).scrollMarginTop),
      )
    expect(arrival).toBeGreaterThan(100)
    const fill = page.locator('.temple-nav-progress span')
    const progress = () =>
      fill.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a)
    for (const top of [0, arrival / 2, arrival]) {
      await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), top)
      await expect.poll(progress).toBeCloseTo(0, 5)
    }
    await page.evaluate((top) => scrollTo({ top: top + 200, behavior: 'instant' }), arrival)
    await expect.poll(progress).toBeGreaterThan(0)
  })
}
