import { expect, test } from '@playwright/test'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'

type GroundFixture = typeof import('../app/temple/fragments/ground-pieces.ts') &
  typeof import('../app/temple/fragments/material.ts') &
  typeof import('../../contracts/temple/fragments.ts') &
  typeof import('../app/temple/fragments/ground.ts')

const bundle = await build({
  stdin: {
    contents: `
      export { paintGroundPieces } from './ground-pieces.ts'
      export { provideGroundMaterial } from './material.ts'
      export { generateFragments } from '../../../../contracts/temple/fragments.ts'
      export { mountFragmentGround } from './ground.ts'
    `,
    resolveDir: fileURLToPath(new URL('../app/temple/fragments', import.meta.url)),
  },
  bundle: true,
  format: 'iife',
  globalName: 'groundFixture',
  write: false,
})

const groundStyle = await readFile(
  new URL('../app/temple/fragments/style.css', import.meta.url),
  'utf8',
)

for (const width of [390, 1440]) {
  test(`ground keeps painted layers bounded while seeking a long document at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.route('https://ground.test/', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><style>body{margin:0}${groundStyle}
        .fragment-ground-plane{animation:none!important}</style>
        <div style="height:80px"></div>
        <div id="host" class="temple-artwork" style="height:50000px">
          <div class="temple-stage" style="height:844px"></div>
        </div><div style="height:1000px"></div>`,
      }),
    )
    await page.goto('https://ground.test/')
    test.skip(
      await page.evaluate(() => typeof ScrollTimeline === 'undefined'),
      'Native scroll timelines unavailable',
    )
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.evaluate(() => {
      const fixture = (window as unknown as Window & { groundFixture: GroundFixture }).groundFixture
      const host = document.querySelector<HTMLElement>('#host')!
      fixture.provideGroundMaterial(host, {
        pieces: fixture.generateFragments('viewport-ground', 11),
        seed: 'viewport-ground',
      })
      const abort = new AbortController()
      Object.assign(window, { groundAbort: abort })
      fixture.mountFragmentGround(host, [], abort.signal)
    })
    const planes = page.locator('.fragment-ground-plane')
    await expect(planes).toHaveCount(3)
    // The old implementation animated three complete document-length planes.
    // Bound both the paint surfaces and attached SVGs independently of page length.
    await expect
      .poll(() =>
        planes.evaluateAll((nodes) => Math.max(...nodes.map((node) => node.clientHeight))),
      )
      .toBeLessThanOrEqual(844 + 128)
    const snapshots = new Map<number, string[]>()
    for (const position of [2000, 18000, 40000, 18000, 2000]) {
      await page.evaluate(async (position) => {
        scrollTo({ top: position, behavior: 'instant' })
        // Settle the membership frame and native timeline sampling after seeking.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        )
      }, position)
      await expect.poll(() => page.locator('.fragment-ground-piece').count()).toBeGreaterThan(0)
      await expect
        .poll(() =>
          page.locator('.fragment-ground-piece').evaluateAll((nodes) =>
            nodes.some((node) => {
              const r = node.getBoundingClientRect()
              return r.bottom > 0 && r.top < innerHeight
            }),
          ),
        )
        .toBe(true)
      const snapshot = await page.locator('.fragment-ground-piece').evaluateAll((nodes) =>
        nodes.map((node) => {
          const r = node.getBoundingClientRect()
          return `${node.querySelector('linearGradient')!.id}:${r.top.toFixed(1)}`
        }),
      )
      expect(snapshot.length).toBeLessThan(60)
      if (snapshots.has(position)) expect(snapshot).toEqual(snapshots.get(position))
      snapshots.set(position, snapshot)
    }
    const selected = await page.locator('.fragment-ground-piece').evaluateAll((nodes) => {
      const node = nodes.find((node) => {
        const r = node.getBoundingClientRect()
        return r.top > 100 && r.top < innerHeight - 100
      })!
      return {
        id: node.querySelector('linearGradient')!.id,
        top: node.getBoundingClientRect().top,
        depth: [-0.12, -0.26, -0.42][Number((node.parentElement as HTMLElement).dataset.layer)],
      }
    })
    await page.evaluate(() => scrollBy({ top: 50, behavior: 'instant' }))
    await expect
      .poll(() =>
        page
          .locator(`.fragment-ground-piece:has(#${selected.id})`)
          .evaluate((node) => node.getBoundingClientRect().top),
      )
      .toBeCloseTo(selected.top + 50 * (selected.depth - 1), 0)
    await page.setViewportSize({ width, height: 700 })
    await expect
      .poll(() =>
        planes.evaluateAll((nodes) => Math.max(...nodes.map((node) => node.clientHeight))),
      )
      .toBeLessThanOrEqual(700 + 128)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(documentHeight)
    const stopped = await page.evaluate(() => {
      const animations = [...document.querySelectorAll('.fragment-ground-piece')].flatMap((node) =>
        node.getAnimations(),
      )
      ;(window as unknown as { groundAbort: AbortController }).groundAbort.abort()
      return (
        animations.length > 0 && animations.every((animation) => animation.playState === 'idle')
      )
    })
    expect(stopped).toBe(true)
    await expect(page.locator('.fragment-ground')).toHaveCount(0)
  })
}

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
