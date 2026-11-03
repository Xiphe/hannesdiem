import { expect, test } from '@playwright/test'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

type GroundFixture = typeof import('../app/temple/fragment-button/ground-pieces.ts') &
  typeof import('../app/temple/fragment-button/material.ts') &
  typeof import('../app/temple/fragment-button/fragment-generator.ts')

const bundle = await build({
  stdin: {
    contents: `
      export { paintGroundPieces } from './ground-pieces.ts'
      export { provideGroundMaterial } from './material.ts'
      export { generateFragments } from './fragment-generator.ts'
    `,
    resolveDir: fileURLToPath(new URL('../app/temple/fragment-button', import.meta.url)),
  },
  bundle: true,
  format: 'iife',
  globalName: 'groundFixture',
  write: false,
})

for (const width of [390, 1440]) {
  test(`ground defers collapsed layouts and resumes at ${width}px`, async ({ page }) => {
    await page.route('https://ground.test/', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><div id="host"><div></div><div></div><div></div></div>',
      }),
    )
    await page.goto('https://ground.test/')
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    const result = await page.evaluate((width) => {
      const ground = (window as unknown as Window & { groundFixture: GroundFixture }).groundFixture
      const host = document.querySelector<HTMLElement>('#host')!
      const planes = [...host.children] as HTMLElement[]
      const bands = planes.map(() => [{ start: 0, end: 5000 }])
      ground.provideGroundMaterial(host, {
        pieces: ground.generateFragments('collapsed-ground', 11),
        seed: 'collapsed-ground',
      })
      const createElementNS = document.createElementNS
      let allocations = 0
      // Fail before a regressed collapsed layout can allocate thousands of SVGs
      // and starve the renderer, including the DevTools DOM inspector.
      document.createElementNS = (() => {
        allocations++
        throw new Error('Collapsed ground started SVG allocation')
      }) as typeof document.createElementNS
      try {
        for (const collapsed of [0, 1]) {
          host.style.width = `${collapsed}px`
          ground.paintGroundPieces(host, planes, bands)
        }
      } finally {
        document.createElementNS = createElementNS
      }
      const collapsedPieces = host.querySelectorAll('.fragment-ground-piece').length
      host.style.width = `${width}px`
      ground.paintGroundPieces(host, planes, bands)
      const pieces = [...host.querySelectorAll('.fragment-ground-piece')]
      return {
        allocations,
        collapsedPieces,
        pieces: pieces.length,
        connected: pieces.every((piece) => piece.isConnected),
      }
    }, width)
    expect(result.allocations).toBe(0)
    expect(result.collapsedPieces).toBe(0)
    expect(result.pieces).toBeGreaterThan(0)
    expect(result.pieces).toBeLessThan(200)
    expect(result.connected).toBe(true)
  })
}
