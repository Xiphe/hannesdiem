// Check cached glyph baselines against settled native DOM using the synthetic application fixture.
// This catches WebKit caching pre-paint layout metrics, without authored content or generated media fixtures.
import assert from 'node:assert/strict'
import { chromium, webkit, type Page } from '@playwright/test'

declare global {
  interface Window {
    __inkSamples: {
      text: string
      x: number
      y: number
      width: number
      height: number
    }[]
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
    window.__inkSamples = []
    const fill = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      const transform = this.getTransform()
      const baseline =
        (transform.b * x + transform.d * y + transform.f) / Math.hypot(transform.a, transform.b)
      window.__inkSamples.push({
        text,
        x: (transform.a * x + transform.c * y + transform.e) / Math.hypot(transform.a, transform.b),
        y: baseline,
        width: this.canvas.width,
        height: this.canvas.height,
      })
      return maxWidth === undefined
        ? fill.call(this, text, x, y)
        : fill.call(this, text, x, y, maxWidth)
    }
  })
  await page.goto(url)
  await page.waitForSelector('.temple-artwork[data-state="ready"]')
  await page.waitForTimeout(200)
  const deltas = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.phrase-entry')].flatMap((p) => {
      const canvas = p.querySelector<HTMLCanvasElement>('canvas')!
      const bounds = p.getBoundingClientRect()
      const top = bounds.top
      return [...p.querySelectorAll<HTMLElement>('.block-row-ink')].map((row) => {
        const anchor = row.querySelector<HTMLElement>('.block-baseline')!.getBoundingClientRect()
        const x =
          (row.dataset.inkAngle !== undefined ? anchor.left : row.getBoundingClientRect().left) -
          bounds.left
        // Repeated letters share text and canvas dimensions; match their
        // baseline origins too, rather than selecting the last same letter.
        const sample = window.__inkSamples.findLast(
          (s) =>
            s.text === row.textContent &&
            s.width === canvas.width &&
            s.height === canvas.height &&
            Math.abs(s.x - x) < 0.75,
        )
        if (!sample) return Infinity
        const baseline =
          row.querySelector<HTMLElement>('.block-baseline')!.getBoundingClientRect().top - top
        return Math.abs(baseline - sample.y)
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
