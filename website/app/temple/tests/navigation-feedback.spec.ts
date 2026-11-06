import { expect, test } from '@playwright/test'

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
  await expect(hint).toBeVisible()
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

for (const width of [390, 1440]) {
  test(`the manifesto hint scrolls behind the sticky action before staying hidden at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-entry-poem')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const button = page.locator('.temple-entry-welcome a')
    const hint = page.locator('.temple-entry-more')
    const header = page.locator('.temple-top-navigation')
    const fixed = header.locator('.temple-nav-enter a')
    await button.evaluate((node) => {
      const header = document.querySelector<HTMLElement>('.temple-top-navigation')!
      const top = (header.offsetHeight - (node as HTMLElement).offsetHeight) / 2 - 1
      scrollTo(0, scrollY + node.getBoundingClientRect().top - top)
    })
    await expect(header).toHaveAttribute('data-nav-visible', '')
    await expect(header.locator('.temple-nav-logo')).toHaveCSS('opacity', '1')
    await expect(hint).toBeVisible()
    const action = (await fixed.boundingBox())!
    const actionBottom = action.y + action.height
    const before = (await hint.boundingBox())!
    expect(before.y).toBeGreaterThan(actionBottom)
    // Even after its fade finishes, the backdrop must leave the hint below the button clear.
    const backdropBottom = await header.evaluate((node) => {
      const style = getComputedStyle(node, '::before')
      return node.getBoundingClientRect().top + parseFloat(style.top) + parseFloat(style.height)
    })
    expect(backdropBottom).toBeCloseTo(actionBottom, 0)
    expect(backdropBottom).toBeLessThan(before.y)
    const moveHint = (top: number) =>
      hint.evaluate(
        (node, top) => scrollTo(0, scrollY + node.getBoundingClientRect().top - top),
        top,
      )
    await moveHint(actionBottom - before.height / 2)
    await expect(header).not.toHaveAttribute('data-nav-hint-covered', '')
    await expect(hint).toBeVisible()
    const overlapping = (await hint.boundingBox())!
    expect(overlapping.y).toBeLessThan(actionBottom)
    expect(overlapping.y + overlapping.height).toBeGreaterThan(actionBottom)
    await moveHint(actionBottom - before.height - 1)
    await expect(hint).not.toBeVisible()
    // Passing above the action must not expose the hint again.
    await moveHint(action.y - before.height / 2)
    await expect(hint).not.toBeVisible()
    await moveHint(actionBottom - before.height / 2)
    await expect(hint).toBeVisible()
    await moveHint(before.y)
    await expect(hint).toBeVisible()
  })
}

for (const width of [390, 1440]) {
  test(`Enter expands its label in the sticky header and reverses smoothly at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => {
      const original = Element.prototype.animate
      Element.prototype.animate = function (keyframes, options) {
        const motion = original.call(this, keyframes, options)
        if (
          this.matches('.temple-nav-enter a, .temple-entry-welcome a, .temple-enter-label-extra')
        ) {
          motion.pause()
          motion.currentTime = 210
        }
        return motion
      }
    })
    await page.goto('/temple-entry-poem')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await expect(page.locator('.temple-entry-greeting')).toHaveCount(0)
    const button = page.locator('.temple-entry-welcome a')
    const header = page.locator('.temple-top-navigation')
    const fixed = header.locator('.temple-nav-enter a')
    await button.evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top - 100))
    await expect(header).not.toHaveAttribute('data-nav-visible', '')
    await expect(button.locator('span').first()).toHaveText('Enter')
    await expect(button.locator('.temple-enter-label-extra')).toHaveCSS('max-width', '0px')
    const initial = (await button.boundingBox())!.width
    const full = (await fixed.boundingBox())!.width
    const padding = await button.evaluate((node) =>
      parseFloat(getComputedStyle(node).paddingInlineStart),
    )
    expect(padding).toBeGreaterThanOrEqual(64)
    await button.evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top))
    await expect(header).toHaveAttribute('data-nav-visible', '')
    const opening = await fixed.evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      opacity: Number(getComputedStyle(node.querySelector('.temple-enter-label-extra')!).opacity),
    }))
    expect(opening.width).toBeGreaterThan(Math.min(initial, full))
    expect(opening.width).toBeLessThan(Math.max(initial, full))
    expect(opening.opacity).toBeGreaterThan(0)
    expect(opening.opacity).toBeLessThan(1)
    // Reverse before the first handoff finishes; the new motion starts from its painted width.
    await button.evaluate((node) => {
      const header = document.querySelector<HTMLElement>('.temple-top-navigation')!
      const top = (header.offsetHeight - (node as HTMLElement).offsetHeight) / 2 + 4
      scrollTo(0, scrollY + node.getBoundingClientRect().top - top)
    })
    await expect(header).not.toHaveAttribute('data-nav-visible', '')
    const returning = (await button.boundingBox())!.width
    expect(returning).toBeGreaterThan(Math.min(initial, opening.width))
    expect(returning).toBeLessThan(Math.max(initial, opening.width))
    expect(await fixed.evaluate((node) => node.getAnimations().length)).toBe(0)
    await page.evaluate(() => {
      for (const motion of document.getAnimations()) {
        const target = (motion.effect as KeyframeEffect)?.target
        if (
          target instanceof Element &&
          target.matches('.temple-nav-enter a, .temple-entry-welcome a, .temple-enter-label-extra')
        )
          motion.finish()
      }
    })
    await expect(button.locator('.temple-enter-label-extra')).toHaveCSS('max-width', '0px')
    expect((await button.boundingBox())!.width).toBeCloseTo(initial, 0)
    await expect(button).toHaveAttribute('href', '/temple-of-sound/visit')
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
