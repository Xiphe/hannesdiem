// Synthetic regression for empty strips between compact-screen silhouettes.
// Run: node website/app/temple/debug/ground-spacing.ts
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium, webkit, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
const root = new URL('../../../..', import.meta.url).pathname
const result = await build({
  stdin: {
    contents: `export {paintGroundPieces} from './website/app/temple/fragment-button/ground-pieces.ts';export {provideGroundMaterial} from './website/app/temple/fragment-button/material.ts';export {generateFragments} from './website/app/temple/fragment-button/fragment-generator.ts'`,
    resolveDir: root,
  },
  bundle: true,
  format: 'iife',
  globalName: 'ground',
  write: false,
})

declare global {
  interface Window {
    ground: typeof import('../fragment-button/ground-pieces.ts') &
      typeof import('../fragment-button/material.ts') &
      typeof import('../fragment-button/fragment-generator.ts')
  }
}

export const groundViewports = [
  { width: 390, height: 710, length: 1300 },
  { width: 742, height: 1420, length: 2000 },
] as const

export async function checkGroundSpacing(
  page: Page,
  { width, height, length }: { width: number; height: number; length: number },
) {
  await page.setViewportSize({ width, height })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('https://spacing.test/', (r) =>
    r.fulfill({ contentType: 'text/html', body: '<!doctype html>' }),
  )
  await page.goto('https://spacing.test/')
  await page.setContent(
    `<style>${readFileSync(root + '/website/app/temple/fragment-button/style.css', 'utf8')} body{margin:0}#host{position:relative;width:${width}px;height:${length + 128}px}.fragment-ground-plane{inset:0;animation:none!important}</style><div id="host"><div class="fragment-ground-plane" data-layer="0"></div><div class="fragment-ground-plane" data-layer="1"></div><div class="fragment-ground-plane" data-layer="2"></div></div>`,
  )
  await page.addScriptTag({ content: result.outputFiles[0].text })
  let worstGap = 0
  for (let seed = 0; seed < 20; seed++) {
    const output = await page.evaluate(
      ({ seed, length }) => {
        const host = document.querySelector<HTMLElement>('#host')!,
          planes = [...host.children] as HTMLElement[]
        const pieces = window.ground.generateFragments('spacing-' + seed, 11)
        window.ground.provideGroundMaterial(host, { pieces, seed: 'spacing-' + seed })
        window.ground.paintGroundPieces(
          host,
          planes,
          planes.map(() => [{ start: 0, end: length }]),
        )
        const paths = [...host.querySelectorAll<SVGPathElement>('svg > g > path')].map((p) => ({
          p,
          m: p.getScreenCTM()!.inverse(),
          b: p.getBoundingClientRect(),
        }))
        let gap = 0,
          maxGap = 0
        for (let y = 70; y < length + 64; y += 12) {
          let visible = false
          for (let x = 6; x < innerWidth; x += 12)
            if (
              paths.some(
                ({ p, m, b }) =>
                  y >= b.top &&
                  y <= b.bottom &&
                  x >= b.left &&
                  x <= b.right &&
                  p.isPointInFill(new DOMPoint(x, y).matrixTransform(m)),
              )
            ) {
              visible = true
              break
            }
          gap = visible ? 0 : gap + 12
          maxGap = Math.max(maxGap, gap)
        }
        return { maxGap }
      },
      { seed, length },
    )
    worstGap = Math.max(worstGap, output.maxGap)
    assert(output.maxGap <= width * 0.5, `${width}px seed ${seed}: ${output.maxGap}px empty strip`)
  }
  return { worstGap, seeds: 20 }
}

if (import.meta.main) {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch()
    try {
      for (const viewport of groundViewports) {
        const page = await browser.newPage()
        try {
          console.log(
            JSON.stringify({
              engine: engine.name(),
              ...viewport,
              ...(await checkGroundSpacing(page, viewport)),
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
