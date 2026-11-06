// Local browser performance diagnostic; not a content test or CI check.
import { chromium, webkit } from '@playwright/test'

declare global {
  interface Window {
    __repetitionReads: number
    __drawTimes: number[]
  }
}

const engine = process.env.ENGINE ?? 'chromium'
if (engine !== 'chromium' && engine !== 'webkit') throw new Error('Unknown browser engine')
const browser = await { chromium, webkit }[engine].launch({ headless: true })
try {
  const page = await browser.newPage({
    viewport: {
      width: Number(process.env.WIDTH || 960),
      height: Number(process.env.HEIGHT || 540),
    },
    deviceScaleFactor: Number(process.env.DPR ?? 1),
    isMobile: process.env.MOBILE === 'true',
    hasTouch: process.env.MOBILE === 'true',
  })
  const cpu = Number(process.env.CPU ?? 1)
  if (cpu !== 1) {
    if (engine !== 'chromium') throw new Error('CPU throttling requires Chromium')
    const session = await page.context().newCDPSession(page)
    await session.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  }
  await page.addInitScript((fallback) => {
    if (fallback) Reflect.deleteProperty(window, 'ViewTimeline')
    window.__repetitionReads = 0
    const rect = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      if (this.matches('.repetition-track')) window.__repetitionReads++
      return rect.call(this)
    }
    let seed = 14519
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0
      return (seed >>> 0) / 4294967296
    }
    window.__drawTimes = []
    let draws = 0
    const clear = CanvasRenderingContext2D.prototype.clearRect
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.matches('.temple-escapes')) draws++
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
  }, process.env.NATIVE_TIMELINES === 'false')
  await page.goto(process.env.TEMPLE_URL ?? 'http://localhost:8791/temple-of-sound')
  await page.waitForSelector('.temple-opening[data-ready]')
  await page.waitForTimeout(300)
  const result = await page.evaluate(async (repetition) => {
    const tracks = [...document.querySelectorAll('.repetition-track')]
    if (repetition && !tracks.length) throw new Error('The fixture needs repetition tracks')
    const start = repetition ? scrollY + tracks[0].getBoundingClientRect().top - innerHeight / 2 : 0
    const end = repetition ? scrollY + tracks.at(-1)!.getBoundingClientRect().bottom : 2960
    scrollTo(0, start)
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    window.__drawTimes = []
    window.__repetitionReads = 0
    const gaps: number[] = []
    let previous: number | undefined,
      frame = 0
    await new Promise<void>((resolve) =>
      requestAnimationFrame(function drive(now) {
        if (previous !== undefined) gaps.push(now - previous)
        previous = now
        scrollTo(0, start + ((end - start) * frame) / 74)
        if (++frame < 75) requestAnimationFrame(drive)
        else resolve()
      }),
    )
    const percentile = (values: number[], quantile: number) => {
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
      ...(repetition ? { repetitionLayoutReads: window.__repetitionReads } : {}),
    }
  }, process.env.REPETITION === 'true')
  // Isolate app main-thread work. Headless software raster/compositing also costs
  // time: frame intervals are reported separately, never called a 60fps guarantee.
  const appPass = result.drawP95 <= 16.7
  const framePass = result.frameP95 <= 25
  console.log(
    JSON.stringify(
      {
        engine,
        cpu,
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
