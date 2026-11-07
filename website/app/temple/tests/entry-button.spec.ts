import { expect, test } from '@playwright/test'
import { build } from 'esbuild'

// Only particles reach beyond the trace's seven-pixel halo. Inspect the
// decorative canvas itself, independent of the synthetic page's background.
function exteriorPixels(button: HTMLElement) {
  const canvas = button.querySelector<HTMLCanvasElement>('.temple-enter-effects')!
  const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  const ratio = canvas.width / parseFloat(canvas.style.width)
  const left = parseFloat(canvas.style.left) + 1
  const top = parseFloat(canvas.style.top) + 1
  let count = 0
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 4) continue
    const x = ((i / 4) % canvas.width) / ratio + left
    const y = Math.floor(i / 4 / canvas.width) / ratio + top
    const dx = Math.max(-x, 0, x - button.offsetWidth)
    const dy = Math.max(-y, 0, y - button.offsetHeight)
    if (Math.hypot(dx, dy) > 8) count++
  }
  return count
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`native entry buttons use the accepted ${colorScheme} material and hover-only glimmers`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/temple-entry-poem')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await expect(page.locator('#button-study-controls')).toHaveCount(0)
    const button = page.locator('.temple-entry-welcome .temple-enter-button')
    await expect(button.locator('.temple-enter-effects')).toHaveCount(1)
    await expect(page.locator('.temple-nav-enter .temple-enter-effects')).toHaveCount(1)
    await expect(page.locator('.temple-entry-closing .temple-enter-effects')).toHaveCount(1)
    await button.evaluate((node) =>
      scrollTo(0, scrollY + node.getBoundingClientRect().top - innerHeight * 0.4),
    )
    await page.mouse.move(5, 5)
    const initial = (await button.boundingBox())!
    if (colorScheme === 'light') {
      await expect(button).toHaveCSS('background-color', 'rgb(255, 255, 255)')
      await expect(button).toHaveCSS('border-top-color', 'rgb(240, 238, 241)')
    } else {
      await expect(button).toHaveCSS('background-image', /rgb\(37, 33, 27\)/)
      await expect(button).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
    }
    await expect(button).toHaveCSS('border-top-width', '1px')
    await page.mouse.move(initial.x + initial.width / 2, initial.y - 40)
    await expect
      .poll(() =>
        button.evaluate((node) =>
          parseFloat(node.style.getPropertyValue('--temple-enter-shine-opacity')),
        ),
      )
      .toBeGreaterThan(0)
    expect(
      await button.evaluate((node) =>
        parseFloat(node.style.getPropertyValue('--temple-enter-shine-opacity')),
      ),
    ).toBeLessThanOrEqual(0.05)
    expect(await button.evaluate(exteriorPixels)).toBe(0)
    await button.hover()
    await expect.poll(() => button.evaluate(exteriorPixels)).toBeGreaterThan(0)
    expect(await button.boundingBox()).toEqual(initial)
    await page.mouse.move(5, 5)
    await expect.poll(() => button.evaluate(exteriorPixels), { timeout: 5000 }).toBe(0)
    await page.keyboard.press('Tab')
    await expect(button).toBeFocused()
    await expect(button).toHaveCSS('outline-style', 'solid')
    await expect.poll(() => button.evaluate(exteriorPixels)).toBeGreaterThan(0)
    await expect(button).toHaveAttribute('href', '/temple-of-sound/watch')
  })

  test(`reduced motion freezes ${colorScheme} button artwork and switches appearance live`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/temple-entry-poem')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const button = page.locator('.temple-entry-welcome .temple-enter-button')
    await button.evaluate((node) =>
      scrollTo(0, scrollY + node.getBoundingClientRect().top - innerHeight * 0.4),
    )
    await button.hover()
    await page.waitForTimeout(1500)
    expect(
      await button.evaluate((node) =>
        parseFloat(node.style.getPropertyValue('--temple-enter-shine-opacity')),
      ),
    ).toBeGreaterThan(0.2)
    expect(await button.evaluate(exteriorPixels)).toBe(0)
    const frame = () =>
      button.locator('canvas').evaluate((node) => (node as HTMLCanvasElement).toDataURL())
    const before = await frame()
    await page.waitForTimeout(250)
    expect(await frame()).toBe(before)
    await page.emulateMedia({ colorScheme: colorScheme === 'light' ? 'dark' : 'light' })
    if (colorScheme === 'dark')
      await expect(button).toHaveCSS('border-top-color', 'rgb(240, 238, 241)')
    else await expect(button).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
    await expect(button.locator('canvas')).toHaveCount(1)
  })
}

test('the Opening lifecycle releases entry canvases, observers and input handlers', async ({
  page,
}) => {
  const bundle = await build({
    entryPoints: [new URL('../entry-button/enhance.ts', import.meta.url).pathname],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'EntryArtworkTest',
  })
  await page.goto('/temple-entry-poem')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  await page.evaluate(() => {
    const host = document.createElement('div')
    host.id = 'entry-lifecycle-probe'
    host.className = 'fact-action'
    host.style.cssText = 'position:fixed;top:100px;left:24px;z-index:100'
    host.innerHTML = '<a class="temple-enter-button" href="#probe">Synthetic lifecycle</a>'
    document.body.appendChild(host)
    const controller = new AbortController()
    Reflect.get(window, 'EntryArtworkTest').mountEntryButtons(host, controller.signal)
    Reflect.set(window, 'disposeEntryProbe', () => controller.abort())
    Reflect.set(window, 'entryProbeCanvas', host.querySelector('canvas'))
  })
  const probe = page.locator('#entry-lifecycle-probe a')
  await expect
    .poll(() => probe.locator('canvas').evaluate((node) => (node as HTMLCanvasElement).width))
    .toBeGreaterThan(0)
  await probe.hover()
  await expect.poll(() => probe.evaluate(exteriorPixels)).toBeGreaterThan(0)
  await page.evaluate(() => Reflect.get(window, 'disposeEntryProbe')())
  await expect(probe.locator('canvas')).toHaveCount(0)
  await page.mouse.move(50, 110)
  await page.evaluate(() => dispatchEvent(new Event('resize')))
  await page.waitForTimeout(100)
  expect(
    await page.evaluate(() => {
      const canvas = Reflect.get(window, 'entryProbeCanvas') as HTMLCanvasElement
      return { connected: canvas.isConnected, width: canvas.width, height: canvas.height }
    }),
  ).toEqual({ connected: false, width: 0, height: 0 })
  expect(
    await probe.evaluate((node) => node.style.getPropertyValue('--temple-enter-shine-opacity')),
  ).toBe('')
})

test('entry actions keep the selected base and native navigation without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'light' })
  try {
    const page = await context.newPage()
    await page.goto('/temple-entry-poem')
    const button = page.locator('.temple-entry-welcome .temple-enter-button')
    await expect(button).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(button).toHaveCSS('border-top-color', 'rgb(240, 238, 241)')
    await expect(button.locator('canvas')).toHaveCount(0)
    await button.click()
    await expect(page).toHaveURL(/\/temple-of-sound\/watch$/)
  } finally {
    await context.close()
  }
})
