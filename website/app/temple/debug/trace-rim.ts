// Synthetic pixel regression for rounded trace joins; no content/server required.
// Also checks continuous corner travel on a real seeded oblique fragment.
// Run: node website/app/temple/debug/trace-rim.ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium, webkit, type Page } from '@playwright/test'
import { build } from 'esbuild'
import sharp from 'sharp'
import { generateFragments } from '../fragment-button/fragment-generator.ts'

const bundle = await build({
  entryPoints: [new URL('../fragment-button/ground-signal.ts', import.meta.url).pathname],
  bundle: true,
  format: 'iife',
  globalName: 'signalModule',
  write: false,
})
const css = readFileSync(new URL('../fragment-button/style.css', import.meta.url), 'utf8')

declare global {
  interface Window {
    signalModule: typeof import('../fragment-button/ground-signal.ts')
    traceAbort: AbortController
  }
}

export async function checkTraceRim(page: Page, scheme: 'light' | 'dark') {
  // A secure synthetic origin supplies crypto.randomUUID without a server.
  await page.route('https://trace.test/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }),
  )
  await page.goto('https://trace.test/')
  await page.setContent(`<style>${css}
  html { color-scheme: ${scheme}; }
  body { margin: 0; background: black; }
  #host { position: relative; width: 800px; height: 640px; }
  svg { position: absolute; left: 60px; top: 60px; width: 680px; height: 520px; }
  </style><div id="host" data-state="ready" data-layer="0">
  <svg class="fragment-ground-piece" data-ground-index="0" viewBox="-2 -2 34 26">
  <g><path d="M0 0H30V22H0Z" fill="#0c0d0c" stroke="#0c0d0c"
  stroke-width="1.8" stroke-linejoin="round"/></g></svg></div>`)
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  await page.evaluate((piece) => {
    const host = document.querySelector<HTMLElement>('#host')!
    const path = host.querySelector<SVGPathElement>('path')!
    window.traceAbort = new AbortController()
    window.signalModule.mountGroundSignal(
      host,
      [{ ...piece, d: path.getAttribute('d')! }],
      [path],
      'corner-fixture',
      window.traceAbort.signal,
    )
  }, generateFragments('trace-rectangle', 1)[0])
  await page.locator('.fragment-ground-signal').waitFor({ timeout: 3000 })
  await page.evaluate(() => {
    const trace = document.querySelector<SVGSVGElement>('.fragment-ground-signal')!
    for (const animation of trace.getAnimations({ subtree: true })) {
      animation.pause()
      animation.currentTime =
        (animation as CSSAnimation).animationName === 'fragment-signal-fade'
          ? 0
          : Number(animation.effect!.getComputedTiming().duration)
    }
    trace.style.animation = 'none'
    trace.style.opacity = '1'
    trace.querySelector<SVGPathElement>('.fragment-signal-tip')!.style.display = 'none'
  })
  const { data, info } = await sharp(await page.screenshot())
    .raw()
    .toBuffer({ resolveWithObject: true })
  await page.locator('.fragment-ground-signal').evaluate((node: SVGSVGElement) => {
    node.style.display = 'none'
  })
  const baseline = await sharp(await page.screenshot())
    .raw()
    .toBuffer()
  const peak = { straight: 0, corner: 0 }
  // Compare the same narrow rim on the top segment and its rounded join.
  // Allow normal pixel-coverage variation at these very low opacities.
  // The former cutout mask amplifies the light-ink corner by40%.
  for (let y = 70; y < 115; y++) {
    for (let x = 70; x < 500; x++) {
      const area = x > 300 ? 'straight' : x < 115 ? 'corner' : null
      if (!area) continue
      const at = (y * info.width + x) * info.channels
      const difference = [0, 1, 2].reduce(
        (sum, channel) => sum + data[at + channel] - baseline[at + channel],
        0,
      )
      peak[area] = Math.max(peak[area], difference)
    }
  }
  let litColumns = 0
  for (let x = 150; x < 650; x++) {
    let light = 0
    for (let y = 78; y < 85; y++) {
      const at = (y * info.width + x) * info.channels
      light = Math.max(
        light,
        ...[0, 1, 2].map((channel) => data[at + channel] - baseline[at + channel]),
      )
    }
    if (light > 0) litColumns++
  }
  assert(litColumns >= 475, 'A completed trail must be continuous, not repeated short dashes')
  assert(peak.straight > 0, 'The trace must actually be visible')
  assert(peak.corner <= peak.straight * 1.2, 'Rounded joins must not amplify the trace')
  const heads: { direction: string; runs: number; width: number }[] = []
  for (const [direction, progress] of [
    ['forward', 0.2],
    ['reverse', 0.8],
  ] as const) {
    await page.locator('.fragment-ground-signal').evaluate(
      (trace: SVGSVGElement, phase) => {
        trace.style.display = ''
        trace.dataset.direction = phase.direction
        trace.querySelector<SVGPathElement>('.fragment-signal-trail')!.style.display = 'none'
        const tip = trace.querySelector<SVGPathElement>('.fragment-signal-tip')!
        tip.style.display = ''
        getComputedStyle(tip).strokeDashoffset
        const animation = tip.getAnimations()[0]
        animation.pause()
        animation.currentTime =
          Number(animation.effect!.getComputedTiming().duration) * phase.progress
      },
      { direction, progress },
    )
    const pixels = await sharp(await page.screenshot())
      .raw()
      .toBuffer()
    let runs = 0,
      lit = 0,
      previous = false
    for (let x = 110; x < 690; x++) {
      let visible = false
      for (let y = 78; y < 85; y++) {
        const at = (y * info.width + x) * info.channels
        if ([0, 1, 2].some((channel) => pixels[at + channel] > baseline[at + channel]))
          visible = true
      }
      if (visible) {
        lit++
        if (!previous) runs++
      }
      previous = visible
    }
    heads.push({ direction, runs, width: lit })
    assert(
      runs === 1 && lit > 30,
      'The moving head must be one continuous segment in either direction',
    )
  }
  await page.evaluate(() => window.traceAbort.abort())
  // The former rectangle pixel check missed the actual fault: a thick
  // stroke joining sharp vertices is not a route around its rounded rim.
  await page.evaluate((piece) => {
    const host = document.querySelector<HTMLElement>('#host')!
    const tile = host.querySelector<SVGSVGElement>('svg')!
    tile.setAttribute('viewBox', '-16 -12 32 16')
    tile.style.height = '340px'
    const path = tile.querySelector<SVGPathElement>('path')!
    path.setAttribute('d', piece.d!)
    window.traceAbort = new AbortController()
    window.signalModule.mountGroundSignal(
      host,
      [piece],
      [path],
      'corner-fixture',
      window.traceAbort.signal,
    )
  }, generateFragments('trace-corner-shape', 8)[1])
  await page.locator('.fragment-ground-signal').waitFor({ timeout: 3000 })
  const turn = await page.locator('.fragment-signal-tip').evaluate((path: SVGPathElement) => {
    const length = path.getTotalLength()
    const count = 2048
    const points = Array.from({ length: count }, (_, i) =>
      path.getPointAtLength((i * length) / count),
    )
    let largest = 0
    for (let i = 0; i < count; i++) {
      const a = points[(i + count - 1) % count],
        p = points[i],
        b = points[(i + 1) % count]
      const u = { x: p.x - a.x, y: p.y - a.y },
        v = { x: b.x - p.x, y: b.y - p.y }
      largest = Math.max(
        largest,
        (Math.abs(Math.atan2(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y)) * 180) / Math.PI,
      )
    }
    return largest
  })
  assert(turn < 15, 'Trace must travel around the rounded corner, not jump a sharp vertex')
  await page.evaluate(() => window.traceAbort.abort())
  return { litColumns, peak, heads, largestTurn: turn }
}

if (import.meta.main) {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch()
    try {
      for (const scheme of ['light', 'dark'] as const) {
        const page = await browser.newPage({ viewport: { width: 800, height: 640 } })
        try {
          console.log(
            JSON.stringify({
              engine: engine.name(),
              scheme,
              ...(await checkTraceRim(page, scheme)),
            }),
          )
        } finally {
          await page.close()
        }
      }
    } finally {
      await browser.close()
    }
  }
}
