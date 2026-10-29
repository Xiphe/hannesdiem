// Application behaviour checks for the Codrops-inspired highlight reveal.
import assert from 'node:assert/strict'
import { chromium, webkit } from '@playwright/test'

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch({
    headless: true,
    ...(name === 'chromium' ? { args: ['--no-sandbox'] } : {}),
  })
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(process.env.TEMPLE_URL ?? 'http://localhost:8790/temple-of-sound')
    await page.waitForSelector('body[data-scene-ready]')
    const highlight = page.locator('[data-highlight-state]').first()
    await page.waitForFunction(
      () => document.querySelector('[data-highlight-state]').dataset.highlightState === 'pending',
    )
    const originalHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    async function enter() {
      await highlight.evaluate((element) =>
        scrollTo(0, scrollY + element.getBoundingClientRect().top - innerHeight * 0.65),
      )
      await page.waitForFunction(
        () => document.querySelector('[data-highlight-state]').dataset.highlightState === 'playing',
      )
    }
    await enter()
    const playing = await highlight.evaluate((element) => {
      const canvases = [...element.closest('p').querySelectorAll('.copy-highlight-glyph')]
      const animations = canvases.flatMap((canvas) => canvas.getAnimations())
      for (const animation of animations) {
        animation.pause()
        animation.currentTime = 180
      }
      return {
        glyphs: canvases.length,
        delays: animations.map((a) => a.effect.getTiming().delay),
        durations: animations.map((a) => a.effect.getTiming().duration),
        opacities: canvases.map((c) => getComputedStyle(c).opacity),
        filters: canvases.map((c) => getComputedStyle(c).filter),
      }
    })
    assert.ok(playing.glyphs > 1)
    assert.equal(new Set(playing.delays).size, playing.glyphs)
    assert.ok(playing.durations.every((duration) => duration === 250))
    assert.ok(playing.opacities.some((opacity) => Number(opacity) > 0 && Number(opacity) < 1))
    assert.ok(playing.opacities.some((opacity) => Number(opacity) === 0))
    assert.ok(playing.filters.some((filter) => filter.includes('blur(')))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390)
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), originalHeight)
    await highlight.evaluate((element) =>
      element
        .closest('p')
        .querySelectorAll('.copy-highlight-glyph')
        .forEach((canvas) => canvas.getAnimations().forEach((animation) => animation.play())),
    )
    await page.waitForFunction(
      () => document.querySelector('[data-highlight-state]').dataset.highlightState === 'settled',
    )
    assert.equal(
      await highlight.evaluate(
        (element) => element.closest('p').querySelectorAll('.copy-highlight-glyph').length,
      ),
      0,
    )
    // Returning above the entrance resets it, without reversing or intercepting scroll.
    await page.evaluate(() => scrollTo(0, 0))
    await page.waitForFunction(
      () => document.querySelector('[data-highlight-state]').dataset.highlightState === 'pending',
    )
    await enter()
    await page.setViewportSize({ width: 320, height: 740 })
    await page.waitForFunction(() => document.querySelector('.verse-copy > p canvas').width === 560)
    await page.waitForFunction(
      () => document.querySelector('[data-highlight-state]').dataset.highlightState === 'settled',
    )
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320)
    // Reduced motion immediately resolves an active reveal and clears its layers.
    await page.evaluate(() => scrollTo(0, 0))
    await page.waitForFunction(
      () => document.querySelector('[data-highlight-state]').dataset.highlightState === 'pending',
    )
    await enter()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForFunction(() =>
      [...document.querySelectorAll('[data-highlight-state]')].every(
        (element) => element.dataset.highlightState === 'settled',
      ),
    )
    assert.equal(await page.locator('.copy-highlight-glyph').count(), 0)
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
    assert.equal(await page.locator('[data-highlight-state]').count(), 0)
    assert.equal(await page.locator('.copy-highlight-glyph').count(), 0)
    assert.deepEqual(errors, [])
    console.log(
      JSON.stringify({
        browser: name,
        randomBlurReveal: true,
        noLayoutShift: true,
        replay: true,
        resize: true,
        reducedMotion: true,
        disposal: true,
        verdict: 'PASS',
      }),
    )
  } finally {
    await browser.close()
  }
}
