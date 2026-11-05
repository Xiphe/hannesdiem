import { expect, test as base, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const test = base.extend({
  launchOptions: async ({ browserName }, use) => {
    await use(
      browserName === 'chromium' ? { args: ['--autoplay-policy=no-user-gesture-required'] } : {},
    )
  },
})
const path = (id: string) => `/temple-of-sound/watch/fixture-${id}`
const post = (page: Page, id: string) => page.locator(`[data-post-id="fixture-${id}"]`)
const audio = () => {
  const samples = 22050 * 12
  const wav = Buffer.alloc(44 + samples * 2)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(wav.length - 8, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(22050, 24)
  wav.writeUInt32LE(44100, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(samples * 2, 40)
  for (let frame = 0; frame < samples; frame++)
    wav.writeInt16LE(
      Math.round(Math.sin((frame / 22050) * 440 * Math.PI * 2) * 7000),
      44 + frame * 2,
    )
  return wav
}
test.beforeEach(async ({ context }) => {
  await context.route('https://customer-fixture.cloudflarestream.com/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1)!
    if (!/^(video\.m3u8|init\.mp4|segment-[0-5]\.m4s|thumbnail\.jpg)$/.test(name))
      return route.abort()
    if (name === 'thumbnail.jpg')
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="320"><rect width="180" height="320" fill="#5874a8"/></svg>',
      })
    return route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      contentType: name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp4',
      body: await readFile(new URL(`../../../tests/media/feed/${name}`, import.meta.url)),
    })
  })
  await context.route('**/fixture-media/audio.wav', (route) => {
    const bytes = audio()
    const range = route
      .request()
      .headers()
      .range?.match(/^bytes=(\d+)-(\d*)$/)
    const start = range ? Number(range[1]) : 0
    const end = range?.[2] ? Number(range[2]) : bytes.length - 1
    return route.fulfill({
      status: range ? 206 : 200,
      headers: {
        'Accept-Ranges': 'bytes',
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${bytes.length}` } : {}),
      },
      contentType: 'audio/wav',
      body: bytes.subarray(start, end + 1),
    })
  })
})

async function arrive(page: Page, id: string) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  expect((await page.goto(path(id)))!.status()).toBe(200)
  await expect(page.locator('.temple-feed')).toHaveAttribute('data-current-post', `fixture-${id}`)
  return errors
}
async function move(page: Page, id: string) {
  await post(page, id).evaluate((node) =>
    node.scrollIntoView({ block: 'start', behavior: 'instant' }),
  )
  await expect(page.locator('.temple-feed')).toHaveAttribute('data-current-post', `fixture-${id}`)
  await expect(page).toHaveURL(path(id))
}

for (const width of [390, 1440]) {
  test(`video is full screen, controls follow playback, and description scrolls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors = await arrive(page, 'latest')
    const item = post(page, 'latest')
    await expect(item).toHaveAttribute('data-playing', '')
    await expect(item.locator('[data-back]')).not.toBeVisible()
    await expect(item.locator('[data-share]')).not.toBeVisible()
    await expect(item.locator('.feed-caption')).not.toBeVisible()
    await item.locator('.feed-tap').click({ position: { x: 100, y: 180 } })
    await expect(item).not.toHaveAttribute('data-playing', '')
    await expect(item.locator('[data-back]')).toBeVisible()
    await expect(item.locator('[data-share]')).toBeVisible()
    await expect(item.locator('.feed-caption')).toBeVisible()
    const caption = item.locator('.feed-caption')
    const geometry = await caption.evaluate((node) => ({
      height: node.clientHeight,
      full: node.scrollHeight,
    }))
    expect(geometry.height).toBeLessThanOrEqual(360)
    expect(geometry.full).toBeGreaterThan(geometry.height)
    await caption.hover()
    await page.mouse.wheel(0, 400)
    await expect.poll(() => caption.evaluate((node) => node.scrollTop)).toBeGreaterThan(0)
    await expect(page).toHaveURL(path('latest'))
    await item.locator('.feed-tap').click({ position: { x: 100, y: 180 } })
    await expect(item).toHaveAttribute('data-playing', '')
    expect(
      await page.locator('.feed-player').evaluate((node) => (node as HTMLVideoElement).loop),
    ).toBe(true)
    expect(errors).toEqual([])
  })
}

test('blocked audible autoplay has a tap fallback and preserves the player across posts', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play
    let interacted = false
    document.addEventListener(
      'click',
      () => {
        interacted = true
      },
      true,
    )
    HTMLMediaElement.prototype.play = function () {
      if (!interacted && !this.muted)
        return Promise.reject(new DOMException('Synthetic autoplay block', 'NotAllowedError'))
      return original.call(this)
    }
  })
  await arrive(page, 'latest')
  const item = post(page, 'latest')
  await expect(item).toHaveAttribute('data-blocked', '')
  await expect(item.locator('.feed-start')).toBeVisible()
  await item.locator('.feed-start').click()
  await expect(item).toHaveAttribute('data-playing', '')
  await page.locator('.feed-player').evaluate((node) => {
    ;(window as any).originalFeedPlayer = node
  })
  const length = await page.evaluate(() => history.length)
  await move(page, 'middle')
  await expect(post(page, 'middle')).toHaveAttribute('data-playing', '')
  expect(
    await page
      .locator('.feed-player')
      .evaluate((node) => node === (window as any).originalFeedPlayer),
  ).toBe(true)
  expect(
    await page.locator('.feed-player').evaluate((node) => (node as HTMLVideoElement).muted),
  ).toBe(false)
  expect(await page.evaluate(() => history.length)).toBe(length)
  await expect(page).toHaveTitle('Synthetic middle • Hannes Diem')
})

test('orientation changes cover matching video and contain opposite video', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await arrive(page, 'latest')
  await expect(page.locator('.feed-player')).toHaveCSS('object-fit', 'cover')
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.locator('.feed-player')).toHaveCSS('object-fit', 'contain')
  await move(page, 'middle')
  await expect(page.locator('.feed-player')).toHaveCSS('object-fit', 'cover')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.feed-player')).toHaveCSS('object-fit', 'contain')
  const bounds = await page.locator('.temple-feed').boundingBox()
  expect(bounds).toMatchObject({ x: 0, y: 0, width: 390, height: 844 })
})

test('audio has a real waveform, visible controls, seeking, and no loop', async ({ page }) => {
  const errors = await arrive(page, 'audio')
  const item = post(page, 'audio')
  await expect(item.locator('.feed-waveform rect')).toHaveCount(72)
  await expect(item.locator('.feed-audio-toggle')).toBeVisible()
  await expect(item.locator('[data-share]')).toBeVisible()
  await expect
    .poll(() =>
      page.locator('.feed-player').evaluate((node) => (node as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0)
  expect(
    await page.locator('.feed-player').evaluate((node) => (node as HTMLVideoElement).loop),
  ).toBe(false)
  await item.locator('.feed-audio-toggle').click()
  await expect(item).not.toHaveAttribute('data-playing', '')
  await item.locator('.feed-seek').fill('75')
  await expect
    .poll(() =>
      page.locator('.feed-player').evaluate((node) => (node as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(8)
  await item.locator('.feed-audio-toggle').click()
  await expect(item).toHaveAttribute('data-playing', '')
  expect(errors).toEqual([])
})

test('text scrolls through its full length before snapping to the next piece', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await arrive(page, 'text')
  const item = post(page, 'text')
  const height = (await item.boundingBox())!.height
  expect(height).toBeGreaterThan(844 * 3)
  await item.locator('.feed-text').hover({ position: { x: 100, y: 100 } })
  await page.mouse.wheel(0, 600)
  await expect.poll(async () => (await item.boundingBox())!.y).toBeLessThan(-100)
  await expect(page).toHaveURL(path('text'))
  await expect(item.locator('[data-back]')).toBeVisible()
  await move(page, 'oldest')
  await expect(post(page, 'oldest')).toHaveAttribute('data-playing', '')
})

test('feed return reads entry memory, never sets it, and identifies the current post', async ({
  page,
}) => {
  await arrive(page, 'text')
  await expect(post(page, 'text').locator('[data-back]')).toHaveAttribute(
    'href',
    '/temple-of-sound',
  )
  expect(await page.evaluate(() => localStorage.getItem('hannesdiem.temple.entered'))).toBeNull()
  await page.evaluate(() => localStorage.setItem('hannesdiem.temple.entered', 'true'))
  await move(page, 'oldest')
  await post(page, 'oldest')
    .locator('.feed-tap')
    .click({ position: { x: 100, y: 100 } })
  await expect(post(page, 'oldest').locator('[data-back]')).toHaveAttribute(
    'href',
    '/temple-of-sound/watch#fixture-oldest',
  )
  await post(page, 'oldest').locator('[data-back]').click()
  await expect(page).toHaveURL('/temple-of-sound/watch#fixture-oldest')
  const cover = page.locator('#fixture-oldest')
  await expect(cover).toBeInViewport()
  await expect
    .poll(async () => {
      const box = (await cover.boundingBox())!
      return Math.abs(box.x + box.width / 2 - 640)
    })
    .toBeLessThan(2)
})

test('sharing copies the current deep link and swiping preloads only its neighbor', async ({
  page,
  context,
}) => {
  const ids = new Set<string>()
  page.on('request', (request) => {
    const match = request.url().match(/customer-fixture\.cloudflarestream\.com\/([^/]+)\/manifest/)
    if (match) ids.add(match[1])
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          ;(window as any).copiedFeedURL = value
        },
      },
    })
  })
  await arrive(page, 'latest')
  await expect(post(page, 'latest')).toHaveAttribute('data-playing', '')
  await post(page, 'latest')
    .locator('.feed-tap')
    .click({ position: { x: 100, y: 100 } })
  await post(page, 'latest').locator('[data-share]').click()
  await expect
    .poll(() => page.evaluate(() => (window as any).copiedFeedURL))
    .toContain(path('latest'))
  expect(ids.size).toBe(2)
  expect(await page.locator('iframe').count()).toBe(0)
})

test('unknown post URLs are real 404 responses', async ({ page }) => {
  expect((await page.goto(path('missing')))!.status()).toBe(404)
  expect((await page.goto('/temple-of-sound/watch/%E0%A4%A'))!.status()).toBe(404)
})

test('a native wheel gesture snaps to the next full-screen post', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await arrive(page, 'latest')
  await page.locator('.temple-feed').hover({ position: { x: 160, y: 180 } })
  await page.mouse.wheel(0, 650)
  await expect(page).toHaveURL(path('middle'))
  await expect
    .poll(async () => Math.abs((await post(page, 'middle').boundingBox())!.y))
    .toBeLessThan(1)
  await expect(post(page, 'middle')).toHaveAttribute('data-playing', '')
  await expect(page.locator('video')).toHaveCount(1)
})

test('a shared post retains its native player and rich description without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    await context.route('https://customer-fixture.cloudflarestream.com/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Synthetic native player</title>',
      }),
    )
    const page = await context.newPage()
    expect((await page.goto(path('middle')))!.status()).toBe(200)
    await expect(page.locator('.feed-fallback h1')).toHaveText('Synthetic middle')
    await expect(page.locator('.feed-fallback iframe')).toBeVisible()
    await expect(page.locator('.feed-fallback strong')).toHaveText('independent')
    await expect(page.locator('.temple-feed')).not.toBeVisible()
  } finally {
    await context.close()
  }
})
