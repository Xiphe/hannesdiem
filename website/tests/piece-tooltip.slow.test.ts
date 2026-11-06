import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { chromium } from '@playwright/test'

// Independent, synthetic component fixture: no content tree or website build.
test('piece tooltips preserve inline content, placement, input modes and disposal', async () => {
  const result = await build({
    stdin: {
      contents: `
        import { createRoot } from 'remix/component'
        import { PieceTooltip } from './website/app/temple/piece-tooltip/view.tsx'
        const root = createRoot(document.querySelector('main'))
        root.render(<p>Before <PieceTooltip id="fixture-one" label="First note" content="A synthetic explanation for the first fixture." /> between <PieceTooltip id="fixture-two" label="Second note" content="A different synthetic explanation for the second fixture." /> after.</p>)
        root.flush()
        window.fixtureRoot = root
      `,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    jsxImportSource: 'remix/component',
  })
  const css = await readFile('website/app/temple/piece-tooltip/style.css', 'utf8')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setContent(
      `<style>${css} main { margin: 240px auto; width: 600px; }</style><main></main>`,
    )
    await page.addScriptTag({ type: 'module', content: result.outputFiles[0].text })
    const first = page.getByRole('button', { name: 'First note' })
    const second = page.getByRole('button', { name: 'Second note' })
    await first.waitFor()
    assert.equal(await page.locator('main > p').count(), 1)
    assert.deepEqual(
      await page.locator('linearGradient').evaluateAll((nodes) => nodes.map((node) => node.id)),
      ['fixture-one-material', 'fixture-two-material'],
    )
    await first.hover()
    assert.equal(await first.getAttribute('aria-expanded'), 'true')
    const tip = page.locator('#fixture-one')
    assert.equal(await tip.getAttribute('data-placement'), 'bottom')
    const anchor = (await first.boundingBox())!
    const box = (await tip.boundingBox())!
    assert.ok(Math.abs(box.x + box.width / 2 - anchor.x - anchor.width / 2) < 1)
    await tip.hover()
    await page.waitForTimeout(180)
    assert.equal(await first.getAttribute('aria-expanded'), 'true')
    await page.mouse.move(1, 1)
    await page.waitForTimeout(180)
    assert.equal(await first.getAttribute('aria-expanded'), 'false')
    await page.keyboard.press('Tab')
    await first.focus()
    assert.equal(await first.getAttribute('aria-expanded'), 'true')
    await page.keyboard.press('Escape')
    assert.equal(await first.getAttribute('aria-expanded'), 'false')
    await second.click()
    assert.equal(await second.getAttribute('aria-expanded'), 'true')
    assert.equal(await first.getAttribute('aria-expanded'), 'false')
    await page.mouse.click(1, 1)
    assert.equal(await second.getAttribute('aria-expanded'), 'false')
    await page.setViewportSize({ width: 390, height: 700 })
    await page.locator('main').evaluate((node) => {
      node.style.width = 'auto'
      node.style.margin = '640px 12px 0'
    })
    await first.click()
    assert.equal(await tip.getAttribute('data-placement'), 'top')
    const narrow = (await tip.boundingBox())!
    assert.ok(narrow.x >= 12 && narrow.x + narrow.width <= 378)
    const disposed = await page.evaluate(() => {
      const trigger = document.querySelector<HTMLButtonElement>('.piece-tooltip-trigger')!
      const tooltip = document.querySelector<HTMLElement>('#fixture-one')!
      ;(window as unknown as { fixtureRoot: { dispose(): void } }).fixtureRoot.dispose()
      trigger.click()
      return {
        expanded: trigger.getAttribute('aria-expanded'),
        open: tooltip.matches(':popover-open'),
      }
    })
    assert.deepEqual(disposed, { expanded: 'false', open: false })
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})
