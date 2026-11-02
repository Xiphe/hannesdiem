// Check cached glyph baselines against settled native DOM using the synthetic application fixture.
// This catches WebKit caching pre-paint layout metrics, without authored content or generated media fixtures.
import assert from 'node:assert/strict'
import { chromium, webkit } from '@playwright/test'
const engine = process.env.ENGINE ?? 'webkit'
const browser = await { chromium, webkit }[engine].launch({ headless: true })
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    colorScheme: 'light',
  })
  await page.addInitScript(() => {
    window.__inkSamples = []
    const fill = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...rest) {
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
      return fill.call(this, text, x, y, ...rest)
    }
  })
  await page.goto(process.env.TEMPLE_URL ?? 'http://localhost:8791/temple-of-sound')
  await page.waitForSelector('.temple-artwork[data-state="ready"]')
  await page.waitForTimeout(200)
  const deltas = await page.evaluate(() =>
    [...document.querySelectorAll('.phrase-entry')].flatMap((p) => {
      const canvas = p.querySelector('canvas')
      const bounds = p.getBoundingClientRect()
      const top = bounds.top
      return [...p.querySelectorAll('.block-row-ink')].map((row) => {
        const anchor = row.querySelector('.block-baseline').getBoundingClientRect()
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
        const baseline = row.querySelector('.block-baseline').getBoundingClientRect().top - top
        return Math.abs(baseline - sample.y)
      })
    }),
  )
  assert.ok(deltas.length > 0)
  const maximum = Math.max(...deltas)
  assert.ok(maximum <= 0.75, `Cached/native baseline drift: ${maximum}px`)
  console.log(
    JSON.stringify({ engine, rows: deltas.length, maximumBaselineDrift: maximum, verdict: 'PASS' }),
  )
} finally {
  await browser.close()
}
