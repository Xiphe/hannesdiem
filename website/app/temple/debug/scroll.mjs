// Local browser performance diagnostic; not a content test or CI check.
import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({
    viewport: {
      width: Number(process.env.WIDTH || 960),
      height: Number(process.env.HEIGHT || 540),
    },
    deviceScaleFactor: 1,
  })
  await page.addInitScript(() => {
    let seed = 14519
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0
      return (seed >>> 0) / 4294967296
    }
    window.__drawTimes = []
    let draws = 0
    const clear = CanvasRenderingContext2D.prototype.clearRect
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.matches('.temple-stage > canvas')) draws++
      return clear.apply(this, args)
    }
    const raf = requestAnimationFrame
    window.requestAnimationFrame = (callback) =>
      raf((now) => {
        const start = performance.now()
        const before = draws
        callback(now)
        // Follow real scene paints, including minified production callbacks.
        if (draws > before) window.__drawTimes.push(performance.now() - start)
      })
  })
  await page.goto(process.env.TEMPLE_URL ?? 'http://localhost:8790/temple-of-sound')
  await page.waitForSelector('.temple-opening[data-ready]')
  await page.waitForTimeout(300)
  const result = await page.evaluate(async () => {
    window.__drawTimes = []
    const gaps = []
    let previous,
      frame = 0
    await new Promise((resolve) =>
      requestAnimationFrame(function drive(now) {
        if (previous !== undefined) gaps.push(now - previous)
        previous = now
        scrollTo(0, frame * 40)
        if (++frame < 75) requestAnimationFrame(drive)
        else resolve()
      }),
    )
    const percentile = (values, quantile) => {
      const sorted = values.slice().sort((a, b) => a - b)
      return Math.round(sorted[Math.floor((sorted.length - 1) * quantile)] * 10) / 10
    }
    return {
      drawP95: percentile(window.__drawTimes, 0.95),
      drawMax: percentile(window.__drawTimes, 1),
      frameP50: percentile(gaps, 0.5),
      frameP95: percentile(gaps, 0.95),
      framesOver25ms: gaps.filter((gap) => gap > 25).length,
      frames: gaps.length,
    }
  })
  // Isolate app main-thread work. Headless software raster/compositing also costs
  // time: frame intervals are reported separately, never called a 60fps guarantee.
  const appPass = result.drawP95 <= 16.7
  const framePass = result.frameP95 <= 25
  console.log(
    JSON.stringify(
      {
        ...result,
        mainThreadBudget: appPass ? 'PASS' : 'FAIL',
        frameBudget: framePass ? 'PASS' : 'FAIL',
      },
      null,
      2,
    ),
  )
  process.exitCode = appPass && framePass ? 0 : 1
} finally {
  await browser.close()
}
