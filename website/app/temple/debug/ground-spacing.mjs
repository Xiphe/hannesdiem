// Synthetic regression for empty strips between compact-screen silhouettes.
// Run: node website/app/temple/debug/ground-spacing.mjs
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium, webkit } from '@playwright/test'
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
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch()
  try {
    for (const [width, height, length] of [
      [390, 710, 1300],
      [742, 1420, 2000],
    ]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
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
            const host = document.querySelector('#host'),
              planes = [...host.children]
            const pieces = ground.generateFragments('spacing-' + seed, 11)
            ground.provideGroundMaterial(host, { pieces, seed: 'spacing-' + seed })
            ground.paintGroundPieces(
              host,
              planes,
              planes.map(() => [{ start: 0, end: length }]),
            )
            const paths = [...host.querySelectorAll('svg > g > path')].map((p) => ({
              p,
              m: p.getScreenCTM().inverse(),
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
        assert(
          output.maxGap <= width * 0.5,
          `${engine.name()} ${width}px seed ${seed}: ${output.maxGap}px empty strip`,
        )
      }
      console.log(
        `${engine.name()} ${width}×${height}: 20 seeds pass; largest empty strip ${worstGap}px`,
      )
      await page.close()
    }
  } finally {
    await browser.close()
  }
}
