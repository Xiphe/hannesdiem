// Check cached glyph baselines against settled native DOM using the synthetic application fixture.
// This catches WebKit caching pre-paint layout metrics, without authored content or generated media fixtures.
import assert from 'node:assert/strict'
import { chromium, webkit, type Page } from '@playwright/test'

type InkSample = { text: string; x: number; y: number }
type InkMask = { samples: InkSample[]; width: number; height: number }

declare global {
  interface Window {
    __inkSamples: WeakMap<HTMLCanvasElement, InkSample[]>
    __inkMasks: WeakMap<HTMLCanvasElement, InkMask>
  }
}

export const inkViewport = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce' as const,
  colorScheme: 'light' as const,
}

export async function checkInkBaselines(page: Page, url: string) {
  await page.addInitScript(() => {
    window.__inkSamples = new WeakMap()
    window.__inkMasks = new WeakMap()
    const setTransform = CanvasRenderingContext2D.prototype.setTransform
    CanvasRenderingContext2D.prototype.setTransform = function (...args: unknown[]) {
      // A layout rebuild starts a fresh mask; keep earlier draw generations out.
      window.__inkSamples.delete(this.canvas)
      return Reflect.apply(setTransform, this, args)
    }
    const fill = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      const transform = this.getTransform()
      let samples = window.__inkSamples.get(this.canvas)
      if (!samples) window.__inkSamples.set(this.canvas, (samples = []))
      samples.push({
        text,
        x: transform.a * x + transform.c * y + transform.e,
        y: transform.b * x + transform.d * y + transform.f,
      })
      return maxWidth === undefined
        ? fill.call(this, text, x, y)
        : fill.call(this, text, x, y, maxWidth)
    }
    const drawImage = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (...args: unknown[]) {
      const [source] = args
      if (
        this.canvas.classList.contains('copy-cloud-canvas') &&
        this.globalCompositeOperation === 'copy' &&
        source instanceof HTMLCanvasElement
      ) {
        const samples = window.__inkSamples.get(source)
        if (samples)
          window.__inkMasks.set(this.canvas, {
            samples,
            width: source.width,
            height: source.height,
          })
      }
      return Reflect.apply(drawImage, this, args)
    }
  })
  await page.goto(url)
  await page.waitForSelector('.temple-artwork[data-state="ready"]')
  await page.waitForTimeout(200)
  // Offscreen masks are painted lazily. Observe their real drawImage source,
  // rather than guessing ownership from text or equal canvas dimensions.
  for (const phrase of await page.locator('.phrase-entry').all()) {
    await phrase.scrollIntoViewIfNeeded()
    await page.waitForFunction(
      (element) => window.__inkMasks.has(element!.querySelector<HTMLCanvasElement>('canvas')!),
      await phrase.elementHandle(),
    )
  }
  const deltas = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.phrase-entry')].flatMap((p) => {
      const canvas = p.querySelector<HTMLCanvasElement>('canvas')!
      const mask = window.__inkMasks.get(canvas)!
      const bounds = p.getBoundingClientRect()
      const top = bounds.top
      const rows = [...p.querySelectorAll<HTMLElement>('.block-row-ink')]
      if (mask.samples.length !== rows.length) throw new Error('Cached/native row count differs')
      return rows.map((row, index) => {
        // colourCopy fills rows in DOM order, including repeated letters/lines.
        // Neither the text nor the expected baseline chooses a sample.
        const sample = mask.samples[index]
        if (sample.text !== row.textContent) throw new Error('Cached/native row text differs')
        const anchor = row.querySelector<HTMLElement>('.block-baseline')!.getBoundingClientRect()
        const x =
          (row.dataset.inkAngle !== undefined ? anchor.left : row.getBoundingClientRect().left) -
          bounds.left
        if (Math.abs((sample.x * bounds.width) / mask.width - x) > 0.75)
          throw new Error('Cached/native horizontal origin differs')
        const baseline =
          row.querySelector<HTMLElement>('.block-baseline')!.getBoundingClientRect().top - top
        return Math.abs(baseline - (sample.y * bounds.height) / mask.height)
      })
    }),
  )
  assert.ok(deltas.length > 0)
  const maximum = Math.max(...deltas)
  assert.ok(maximum <= 0.75, `Cached/native baseline drift: ${maximum}px`)
  return { rows: deltas.length, maximumBaselineDrift: maximum, verdict: 'PASS' }
}

if (import.meta.main) {
  const engine = process.env.ENGINE ?? 'webkit'
  if (engine !== 'chromium' && engine !== 'webkit') throw new Error('Unknown browser engine')
  const browser = await { chromium, webkit }[engine].launch({ headless: true })
  try {
    const page = await browser.newPage(inkViewport)
    console.log(
      JSON.stringify({
        engine,
        ...(await checkInkBaselines(
          page,
          process.env.TEMPLE_URL ?? 'http://localhost:8791/temple-of-sound',
        )),
      }),
    )
  } finally {
    await browser.close()
  }
}
