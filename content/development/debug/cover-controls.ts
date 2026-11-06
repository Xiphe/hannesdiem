// Synthetic browser regression harness; media and API data are deliberately stubbed.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
const root = 'content/development/cover-review/'
const html = await readFile(root + 'index.html', 'utf8')
const transport = await readFile(root + 'transport.js', 'utf8')
const pixel = await sharp({
  create: { width: 1200, height: 630, channels: 3, background: '#222222' },
})
  .jpeg()
  .toBuffer()
const uri = 'data:image/jpeg;base64,' + pixel.toString('base64')
const old = execFileSync('git', ['show', '3df85da:content/development/cover-review/app.js'], {
  encoding: 'utf8',
})
const current = await readFile(root + 'app.js', 'utf8')
const browser = await chromium.launch()
try {
  const results = []
  for (const [version, source] of [
    ['before', old],
    ['after', current],
    ['persisted-cover', current],
  ] as const) {
    const page = await browser.newPage()
    await page.addInitScript(() => {
      const times = new WeakMap<HTMLMediaElement, number>()
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        get(this: HTMLMediaElement) {
          return times.get(this) ?? 0
        },
        set(this: HTMLMediaElement, value: number) {
          times.set(this, value)
        },
      })
      Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
        get() {
          return 2
        },
      })
      HTMLMediaElement.prototype.canPlayType = () => 'probably'
      HTMLMediaElement.prototype.pause = () => {}
      HTMLMediaElement.prototype.load = () => {}
    })
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.hostname !== 'review.test') return route.abort()
      if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html })
      if (url.pathname === '/app.js')
        return route.fulfill({ contentType: 'text/javascript', body: source })
      if (url.pathname === '/transport.js')
        return route.fulfill({ contentType: 'text/javascript', body: transport })
      if (url.pathname === '/hls.mjs')
        return route.fulfill({
          contentType: 'text/javascript',
          body: 'export default class Hls {}',
        })
      if (url.pathname === '/api/videos')
        return route.fulfill({
          json: [
            {
              id: 'synthetic',
              title: 'Synthetic video',
              customerCode: 'fixture',
              videoId: 'abcdef',
              duration: 60,
              frameRate: 30,
              compositionVersion: 2,
              ...(version === 'persisted-cover'
                ? {
                    cover: {
                      src: 'https://example.invalid/synthetic-cover.jpg',
                      width: 300,
                      height: 900,
                      focalX: 30,
                      focalY: 20,
                      videoFrame: { videoId: 'abcdef', time: 12.5 },
                    },
                  }
                : {}),
            },
          ],
        })
      if (url.pathname === '/api/preview')
        return route.fulfill({ json: { share: uri, watch: uri } })
      if (url.pathname === '/api/frame')
        return route.fulfill({ contentType: 'image/jpeg', body: pixel })
      return route.fulfill({ status: 204 })
    })
    await page.goto('http://review.test/')
    await page.waitForFunction(
      () => document.querySelector('.results')!.getAttribute('aria-busy') === 'false',
    )
    if (version === 'persisted-cover') {
      assert.equal(Number(await page.locator('#time').inputValue()), 12.5)
      assert.equal(Number(await page.locator('#focal-x').inputValue()), 30)
      assert.equal(Number(await page.locator('#focal-y').inputValue()), 20)
      assert.match((await page.locator('#progress').textContent())!, /^1 of 1 saved/)
    }
    await page.evaluate(
      () => (document.querySelector<HTMLVideoElement>('#video')!.currentTime = 20.5),
    )
    await page.locator('#forward').click()
    const second = Number(await page.locator('#time').inputValue())
    if (version === 'before') assert.notEqual(second, 21.5)
    else {
      assert.equal(second, 21.5)
      await page.evaluate(
        () => (document.querySelector<HTMLVideoElement>('#video')!.currentTime = 20.5),
      )
      await page.locator('#forward-frame').click()
      assert.equal(Number(await page.locator('#time').inputValue()), 20.533333)
      await page.locator('#back-frame').click()
      assert.equal(Number(await page.locator('#time').inputValue()), 20.5)
    }
    results.push({ version, afterManualScrub: 20.5, nextSecond: second, correct: second === 21.5 })
    await page.close()
  }
  console.log(JSON.stringify(results))
} finally {
  await browser.close()
}
