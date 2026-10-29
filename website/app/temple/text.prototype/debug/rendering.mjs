import assert from 'node:assert/strict'
// Browser regression checks against the local Temple workbench; no content assertions.
import { chromium } from '@playwright/test'
import sharp from 'sharp'
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const report = {}
try {
  const startup = await browser.newPage({ viewport: { width: 960, height: 540 } })
  const gates = new Map()
  for (const [name, pattern] of [
    ['script', '**/context.js'],
    ['fonts', '**/fonts/*'],
    ['image', '**/forest.webp'],
  ]) {
    let release
    const pending = new Promise((resolve) => (release = resolve))
    gates.set(name, release)
    await startup.route(pattern, async (route) => {
      await pending
      await route.continue()
    })
  }
  await startup.goto(process.env.TEMPLE_URL ?? 'http://localhost:8790/temple-of-sound', {
    waitUntil: 'commit',
  })
  await startup.waitForSelector('.temple-opening', { state: 'attached' })
  const cdp = await startup.context().newCDPSession(startup)
  async function black(label) {
    await startup.waitForTimeout(100)
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
    const { data, info } = await sharp(Buffer.from(shot.data, 'base64'))
      .raw()
      .toBuffer({ resolveWithObject: true })
    let nonblack = 0
    for (let i = 0; i < data.length; i += info.channels)
      if (Math.max(data[i], data[i + 1], data[i + 2]) > 10) nonblack++
    assert.equal(nonblack, 0, label)
    return nonblack
  }
  await startup.waitForFunction(() => document.styleSheets.length >= 3)
  report.beforeScript = await black('script pending')
  gates.get('script')()
  report.beforeFonts = await black('fonts and image pending')
  gates.get('fonts')()
  await startup.waitForFunction(() => document.fonts.status === 'loaded')
  report.beforeImage = await black('image pending')
  gates.get('image')()
  await startup.waitForSelector('body[data-scene-ready]')
  assert.equal(
    await startup.locator('.temple-page').evaluate((e) => getComputedStyle(e).visibility),
    'visible',
  )
  report.revealed = true
  await startup.close()
  const staticPage = await browser.newPage({ javaScriptEnabled: false, colorScheme: 'light' })
  await staticPage.goto(process.env.TEMPLE_URL ?? 'http://localhost:8790/temple-of-sound')
  assert.equal(
    await staticPage.locator('.temple-page').evaluate((e) => getComputedStyle(e).visibility),
    'visible',
  )
  assert.equal(
    await staticPage.evaluate(() => getComputedStyle(document.body).backgroundColor),
    'rgb(247, 236, 223)',
  )
  assert.equal(
    await staticPage
      .locator('.verse-copy')
      .first()
      .evaluate((e) => getComputedStyle(e).color),
    'rgb(17, 18, 11)',
  )
  report.noScriptLightReadable = true
  await staticPage.close()

  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => {
    window.__encodes = 0
    window.__cloudPaints = 0
    const encode = HTMLCanvasElement.prototype.toDataURL
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      window.__encodes++
      return encode.apply(this, args)
    }
    const put = CanvasRenderingContext2D.prototype.putImageData
    CanvasRenderingContext2D.prototype.putImageData = function (...args) {
      if (this.canvas.width === 128) window.__cloudPaints++
      return put.apply(this, args)
    }
  })
  await page.goto(process.env.TEMPLE_URL ?? 'http://localhost:8790/temple-of-sound')
  await page.waitForSelector('body[data-scene-ready]')
  await page.evaluate(() => scrollTo(0, innerHeight - 40))
  await page.waitForSelector('.verse-copy > p[data-copy-cloud]')
  await page.waitForTimeout(150)
  await page.locator('[data-copy-variance]').evaluate((e) => {
    e.value = '0'
    e.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(100)
  const paragraph = page.locator('.verse-copy > p').first()
  const clip = await paragraph.boundingBox()
  const canvasShot = await page.screenshot({ clip })
  const saved = await paragraph.evaluate((p) => {
    const ready = p.hasAttribute('data-copy-cloud')
    p.removeAttribute('data-copy-cloud')
    p.querySelector('canvas').style.visibility = 'hidden'
    return ready
  })
  const nativeShot = await page.screenshot({ clip })
  await paragraph.evaluate((p, ready) => {
    if (ready) p.dataset.copyCloud = ''
    p.querySelector('canvas').style.removeProperty('visibility')
  }, saved)
  const a = await sharp(canvasShot).raw().toBuffer(),
    b = await sharp(nativeShot).raw().toBuffer()
  let ink = 0,
    different = 0
  for (let i = 0; i < a.length; i += 3) {
    if (Math.max(a[i], b[i]) > 20) {
      ink++
      if (
        Math.max(
          Math.abs(a[i] - b[i]),
          Math.abs(a[i + 1] - b[i + 1]),
          Math.abs(a[i + 2] - b[i + 2]),
        ) > 48
      )
        different++
    }
  }
  report.nativeInkDifference = different / ink
  assert.ok(
    report.nativeInkDifference < 0.08,
    `native glyph mismatch ${report.nativeInkDifference}`,
  )
  report.selectable = await paragraph.evaluate((p) => {
    const r = document.createRange()
    r.selectNodeContents(p)
    const s = getSelection()
    s.removeAllRanges()
    s.addRange(r)
    const text = s.toString()
    s.removeAllRanges()
    return text.replace(/\s/g, '') === p.textContent.replace(/\s/g, '')
  })
  assert.equal(report.selectable, true)
  const frozen = await page.evaluate(() => window.__cloudPaints)
  await page.waitForTimeout(300)
  assert.equal(await page.evaluate(() => window.__cloudPaints), frozen)
  report.reducedMotionFrozen = true
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('[data-copy-variance]').evaluate((e) => {
    e.value = '50'
    e.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(150)
  report.animation = await page.evaluate(async () => {
    let styleMutations = 0
    const observer = new MutationObserver((entries) => {
      styleMutations += entries.filter((e) =>
        e.target.matches('.verse-copy>p,.block-row,.block-row-ink'),
      ).length
    })
    observer.observe(document.querySelector('.first-pair'), {
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    })
    const before = window.__cloudPaints
    await new Promise((resolve) => setTimeout(resolve, 550))
    observer.disconnect()
    return {
      cloudPaints: window.__cloudPaints - before,
      pngEncodes: window.__encodes,
      styleMutations,
    }
  })
  assert.ok(report.animation.cloudPaints >= 3)
  assert.equal(report.animation.pngEncodes, 0)
  assert.equal(report.animation.styleMutations, 0)
  await page.locator('[data-copy-speed]').evaluate((e) => {
    e.value = '0'
    e.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(100)
  const stopped = await page.evaluate(() => window.__cloudPaints)
  await page.waitForTimeout(300)
  assert.equal(await page.evaluate(() => window.__cloudPaints), stopped)
  report.zeroSpeedFrozen = true
  report.gaps = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.verse-copy:first-child .block-row')].map((e) =>
      e.getBoundingClientRect(),
    )
    return rows.slice(1).map((r, i) => Math.round(r.top - rows[i].bottom))
  })
  assert.ok(report.gaps.every((gap) => gap === 16 || gap === 48))
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390)
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForSelector('.verse-coda p[data-copy-cloud]')
  report.offscreenEntry = true
  await page.setViewportSize({ width: 320, height: 740 })
  await page.evaluate(() => scrollTo(0, innerHeight - 40))
  await page.waitForFunction(() => {
    const p = document.querySelector('.verse-copy > p')
    return p.querySelector('canvas').width === Math.ceil(p.clientWidth * 2)
  })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320)
  report.resize = true
  // Move every paragraph out of view without changing the scene's own layout.
  await page.evaluate(() => {
    const spacer = document.createElement('div')
    spacer.id = 'test-spacer'
    spacer.style.height = '200vh'
    document.body.append(spacer)
    scrollTo(0, document.documentElement.scrollHeight)
  })
  await page.waitForTimeout(200)
  await page.locator('[data-copy-speed]').evaluate((e) => {
    e.value = '30'
    e.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const offscreen = await page.evaluate(() => window.__cloudPaints)
  await page.waitForTimeout(300)
  assert.equal(await page.evaluate(() => window.__cloudPaints), offscreen)
  report.offscreenFrozen = true
  await page.evaluate(() => document.querySelector('#test-spacer').remove())
  await page.evaluate(() => scrollTo(0, innerHeight - 40))
  report.themes = []
  for (const [scheme, background, base] of [
    ['light', 'rgb(247, 236, 223)', '#11120b'],
    ['dark', 'rgb(0, 0, 0)', '#d2d0c8'],
  ]) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    await page.waitForFunction(
      (base) => document.querySelector('[data-copy-color]').value === base,
      base,
    )
    await page.waitForTimeout(100)
    assert.equal(
      await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
      background,
    )
    const brightness = await paragraph.evaluate((p) => {
      const canvas = p.querySelector('canvas')
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
      let sum = 0,
        count = 0
      for (let at = 0; at < pixels.length; at += 4)
        if (pixels[at + 3] > 200) {
          sum += (pixels[at] + pixels[at + 1] + pixels[at + 2]) / 3
          count++
        }
      return sum / count
    })
    assert.ok(scheme === 'light' ? brightness < 100 : brightness > 150)
    report.themes.push(scheme)
  }
  const iconPath = await page.locator('link[rel="icon"]').getAttribute('href')
  const icon = await page.request.get(new URL(iconPath, page.url()).href)
  assert.equal(icon.status(), 200)
  assert.match(icon.headers()['content-type'], /image\/svg\+xml/)
  assert.match(await icon.text(), /prefers-color-scheme: dark/)
  report.themedFavicon = true
  await page.emulateMedia({ forcedColors: 'active' })
  assert.equal(
    await paragraph.evaluate((p) => getComputedStyle(p.querySelector('canvas')).display),
    'none',
  )
  assert.notEqual(await paragraph.evaluate((p) => getComputedStyle(p).color), 'rgba(0, 0, 0, 0)')
  report.forcedColorsFallback = true
  await page.emulateMedia({ forcedColors: 'none', media: 'print' })
  assert.equal(
    await paragraph.evaluate((p) => getComputedStyle(p.querySelector('canvas')).display),
    'none',
  )
  report.printFallback = true
  assert.equal(await paragraph.evaluate((p) => getComputedStyle(p).color), 'rgb(0, 0, 0)')
  await page.emulateMedia({ media: 'screen' })
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  assert.equal(await page.locator('.copy-cloud-canvas').count(), 0)
  assert.equal(await page.locator('[data-copy-cloud]').count(), 0)
  report.disposed = true
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ ...report, verdict: 'PASS' }, null, 2))
} finally {
  await browser.close()
}
