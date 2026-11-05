import { expect, test as base, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

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
    ).toBe(false)
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
  const header = (await item.locator('.feed-corners').boundingBox())!
  expect((await item.locator('.feed-text > :first-child').boundingBox())!.y).toBeGreaterThan(
    header.y + header.height,
  )
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
  await arrive(page, 'middle')
  await expect(post(page, 'middle')).toHaveAttribute('data-playing', '')
  await post(page, 'middle')
    .locator('.feed-tap')
    .click({ position: { x: 100, y: 100 } })
  await post(page, 'middle').locator('[data-share]').click()
  await expect
    .poll(() => page.evaluate(() => (window as any).copiedFeedURL))
    .toContain(path('middle'))
  expect(ids.size).toBe(2)
  expect(await page.locator('iframe').count()).toBe(0)
})

test('unknown post URLs are real 404 responses', async ({ page }) => {
  expect((await page.goto(path('missing')))!.status()).toBe(404)
  expect((await page.goto('/temple-of-sound/watch/%E0%A4%A'))!.status()).toBe(404)
})

test('an incoming loading video never flashes its paused overlay', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    'https://customer-fixture.cloudflarestream.com/11111111111111111111111111111111/manifest/video.m3u8',
    async (route) => {
      await gate
      await route.fulfill({
        headers: { 'Access-Control-Allow-Origin': '*' },
        contentType: 'application/vnd.apple.mpegurl',
        body: await readFile(new URL('../../../tests/media/feed/video.m3u8', import.meta.url)),
      })
    },
  )
  try {
    await arrive(page, 'latest')
    await expect(post(page, 'latest')).toHaveAttribute('data-playing', '')
    await move(page, 'middle')
    await expect(post(page, 'middle').locator('.feed-caption')).not.toBeVisible()
  } finally {
    release()
  }
})

test('a native wheel gesture snaps to the next full-screen post', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await arrive(page, 'middle')
  await page.locator('.temple-feed').hover({ position: { x: 160, y: 180 } })
  await page.mouse.wheel(0, 650)
  await expect(page).toHaveURL(path('latest'))
  await expect
    .poll(async () => Math.abs((await post(page, 'latest').boundingBox())!.y))
    .toBeLessThan(1)
  await expect(post(page, 'latest')).toHaveAttribute('data-playing', '')
  await expect(page.locator('video')).toHaveCount(1)
})

test('returning to a previously paused post does not fade out stale controls', async ({ page }) => {
  await arrive(page, 'middle')
  const item = post(page, 'middle')
  await expect(item).toHaveAttribute('data-playing', '')
  await item.locator('.feed-tap').click({ position: { x: 100, y: 100 } })
  await expect(item.locator('.feed-caption')).toBeVisible()
  await move(page, 'latest')
  await expect(post(page, 'latest')).toHaveAttribute('data-playing', '')
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    'https://customer-fixture.cloudflarestream.com/11111111111111111111111111111111/manifest/video.m3u8',
    async (route) => {
      await gate
      await route.fulfill({
        headers: { 'Access-Control-Allow-Origin': '*' },
        contentType: 'application/vnd.apple.mpegurl',
        body: await readFile(new URL('../../../tests/media/feed/video.m3u8', import.meta.url)),
      })
    },
  )
  try {
    await move(page, 'middle')
    expect(
      await item.locator('.feed-details').evaluate((node) => getComputedStyle(node).opacity),
    ).toBe('0')
  } finally {
    release()
  }
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

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`paused controls share a bottom panel in ${viewport.width}px layout`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await arrive(page, 'latest')
    const item = post(page, 'latest')
    await expect(item).toHaveAttribute('data-playing', '')
    await item.locator('.feed-tap').click({ position: { x: 100, y: 150 } })
    await expect(item.locator('[data-back]')).toBeVisible()
    await expect(item.locator('.feed-panel')).not.toHaveAttribute('data-animating', '')
    const layout = await item.evaluate((node) => {
      const panel = node.querySelector('.feed-panel')!.getBoundingClientRect()
      const title = node.querySelector('.feed-title')!
      const transport = node.querySelector('.feed-transport')!.getBoundingClientRect()
      const caption = node.querySelector('.feed-caption')!
      const summary = node.querySelector('.feed-summary')!.getBoundingClientRect()
      const chevron = node.querySelector('.feed-disclosure')!.getBoundingClientRect()
      const icon = node.querySelector('.feed-disclosure svg')!.getBoundingClientRect()
      const back = node.querySelector('[data-back]')!.getBoundingClientRect()
      const share = node.querySelector('[data-share]')!.getBoundingClientRect()
      return {
        bottom: panel.bottom,
        height: panel.height,
        paddingBelowTransport: summary.bottom - transport.bottom,
        chevronBelowTrack: chevron.top - (transport.top + transport.height / 2),
        chevronBottom: chevron.bottom,
        summaryBottom: summary.bottom,
        icon: { width: icon.width, height: icon.height },
        titleBottom: title.getBoundingClientRect().bottom,
        titleTop: title.getBoundingClientRect().top,
        titleCenter: title.getBoundingClientRect().x + title.getBoundingClientRect().width / 2,
        transport: transport.top,
        first: caption.firstElementChild?.tagName,
        descriptionGap: getComputedStyle(
          caption.querySelector('.feed-description')!.firstElementChild!,
        ).marginTop,
        title: parseFloat(getComputedStyle(title).fontSize),
        back: { x: back.x, y: back.y },
        share: { right: share.right, y: share.y },
      }
    })
    expect(layout.bottom).toBeCloseTo(viewport.height, 0)
    expect(layout.height).toBeLessThanOrEqual(viewport.height * 0.4 + 1)
    expect(layout.paddingBelowTransport).toBe(8)
    expect(layout.chevronBelowTrack).toBeGreaterThanOrEqual(0)
    expect(layout.chevronBottom).toBeLessThanOrEqual(layout.summaryBottom + 10)
    expect(layout.icon.width).toBeGreaterThan(layout.icon.height * 2)
    expect(layout.titleBottom).toBeLessThanOrEqual(layout.transport)
    expect(layout.titleTop).toBeLessThan(48)
    expect(layout.titleCenter).toBeCloseTo(viewport.width / 2)
    expect(layout.first).toBe('TIME')
    expect(layout.descriptionGap).toBe('6px')
    expect(layout.title).toBeLessThanOrEqual(26)
    expect(layout.back.x).toBeLessThan(24)
    expect(layout.back.y).toBeLessThan(24)
    expect(layout.share.right).toBeGreaterThan(viewport.width - 24)
    expect(layout.share.y).toBeLessThan(24)
    await expect(item.locator('[data-back]')).toHaveText('')
    await expect(item.locator('[data-share]')).toHaveText('')
  })
}

test('cursor movement reveals UI in one second and fades it over three after four inactive seconds', async ({
  page,
}) => {
  await arrive(page, 'latest')
  const item = post(page, 'latest')
  await expect(item).toHaveAttribute('data-playing', '')
  await expect(item.locator('.feed-transport')).not.toBeVisible()
  await page.clock.install()
  await item.locator('.feed-tap').hover({ position: { x: 100, y: 100 } })
  await expect(item.locator('.feed-transport')).toBeVisible()
  await expect(item.locator('.feed-summary')).toHaveCSS('transition-duration', '1s, 0s')
  await expect(item).toHaveAttribute('data-playing', '')
  await page.clock.fastForward(3_000)
  await expect(page.locator('.temple-feed')).toHaveAttribute('data-transport-peek', '')
  await item.locator('.feed-tap').hover({ position: { x: 120, y: 100 } })
  await page.clock.fastForward(3_000)
  await expect(page.locator('.temple-feed')).toHaveAttribute('data-transport-peek', '')
  await page.clock.fastForward(1_100)
  await expect(page.locator('.temple-feed')).not.toHaveAttribute('data-transport-peek', '')
  await expect(item.locator('.feed-summary')).toHaveCSS('transition-duration', '3s, 0s')
  await expect(item.locator('.feed-transport')).not.toBeVisible()
})

test('scrubbing holds its position and returns to the previous playback state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await arrive(page, 'latest')
  const item = post(page, 'latest')
  await expect(item).toHaveAttribute('data-playing', '')
  await item.locator('.feed-tap').hover({ position: { x: 100, y: 100 } })
  const seek = item.locator('.feed-video-seek')
  await expect(seek).toBeEnabled()
  const playingBox = (await seek.boundingBox())!
  await page.mouse.move(playingBox.x + playingBox.width * 0.2, playingBox.y + playingBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(playingBox.x + playingBox.width * 0.7, playingBox.y + playingBox.height / 2)
  await expect(item.locator('.feed-caption')).not.toBeVisible()
  expect((await seek.boundingBox())!.y).toBeCloseTo(playingBox.y)
  expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.paused)).toBe(true)
  await page.mouse.up()
  await expect(item).toHaveAttribute('data-playing', '')
  await seek.click({ position: { x: 20, y: 16 } })
  await expect(item).toHaveAttribute('data-playing', '')
  await expect(item.locator('.feed-caption')).not.toBeVisible()
  await item.locator('.feed-tap').click({ position: { x: 100, y: 100 } })
  await expect(item.locator('.feed-caption')).toBeVisible()
  await expect.poll(async () => (await seek.boundingBox())!.y).toBeLessThan(playingBox.y - 20)
  await seek.fill('35')
  await seek.focus()
  await page.keyboard.press('ArrowRight')
  await expect(seek).toHaveCSS('outline-style', 'none')
  await expect(item.locator('.feed-caption')).toBeVisible()
  expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.paused)).toBe(true)
})

test('desktop volume defaults to full, remembers adjustments, and shares one mute control', async ({
  page,
}) => {
  await arrive(page, 'latest')
  const item = post(page, 'latest')
  await expect(item).toHaveAttribute('data-playing', '')
  expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.volume)).toBe(1)
  await expect(item.locator('[data-sound]')).toHaveText('')
  await item.locator('.feed-tap').hover({ position: { x: 100, y: 100 } })
  await expect(item.locator('[data-volume]')).not.toBeVisible()
  await item.locator('[data-sound]').hover()
  await expect(item.locator('[data-volume]')).toBeVisible()
  const volume = item.locator('[data-volume]')
  await expect
    .poll(() =>
      item.locator('.feed-volume-popover').evaluate((node) => node.getAnimations().length),
    )
    .toBe(0)
  await item.locator('.feed-tap').hover({ position: { x: 100, y: 100 } })
  await expect(volume).not.toBeVisible()
  await item.locator('[data-sound]').hover()
  await expect(volume).toBeVisible()
  await expect
    .poll(() =>
      item.locator('.feed-volume-popover').evaluate((node) => node.getAnimations().length),
    )
    .toBe(0)
  const volumeBox = (await volume.boundingBox())!
  const soundBox = (await item.locator('[data-sound]').boundingBox())!
  const popoverBox = (await item.locator('.feed-volume-popover').boundingBox())!
  expect(volumeBox.height).toBeGreaterThan(volumeBox.width * 2)
  expect(volumeBox.x + volumeBox.width / 2).toBeCloseTo(soundBox.x + soundBox.width / 2)
  expect(popoverBox.y + popoverBox.height).toBeCloseTo(soundBox.y)
  await volume.click({ position: { x: volumeBox.width / 2, y: volumeBox.height * 0.15 } })
  expect(
    await page.locator('video').evaluate((video: HTMLVideoElement) => video.volume),
  ).toBeGreaterThan(0.7)
  await volume.click({ position: { x: volumeBox.width / 2, y: volumeBox.height * 0.85 } })
  expect(
    await page.locator('video').evaluate((video: HTMLVideoElement) => video.volume),
  ).toBeLessThan(0.3)
  await item.locator('[data-volume]').fill('37')
  expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.volume)).toBeCloseTo(
    0.37,
  )
  expect(
    Number(await page.evaluate(() => localStorage.getItem('hannesdiem.temple.volume'))),
  ).toBeCloseTo(0.37)
  await item.locator('[data-sound]').click()
  await expect(item.locator('[data-sound]')).toHaveAttribute('aria-label', 'Unmute sound')
  expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.muted)).toBe(true)
  await item.locator('[data-sound]').click()
  await expect(item.locator('[data-sound]')).toHaveAttribute('aria-label', 'Mute sound')
  await move(page, 'middle')
  await expect(post(page, 'middle')).toHaveAttribute('data-playing', '')
  expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.volume)).toBeCloseTo(
    0.37,
  )
  await page.reload()
  await expect(page.locator('.temple-feed')).toHaveAttribute('data-current-post', 'fixture-middle')
  expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.volume)).toBeCloseTo(
    0.37,
  )
})

test.describe('touch-only playback', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })
  test('scrolling leaves transport hidden and does not restart its interaction timer', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('hannesdiem.temple.volume', '0.2'))
    await arrive(page, 'latest')
    await expect(post(page, 'latest')).toHaveAttribute('data-playing', '')
    expect(await page.locator('video').evaluate((node: HTMLVideoElement) => node.volume)).toBe(1)
    await expect(post(page, 'latest').locator('[data-volume]')).not.toBeVisible()
    await page
      .locator('.temple-feed')
      .dispatchEvent('pointermove', { pointerType: 'touch', clientX: 180, clientY: 200 })
    await move(page, 'middle')
    await expect(post(page, 'middle')).toHaveAttribute('data-playing', '')
    await expect(post(page, 'middle').locator('.feed-transport')).not.toBeVisible()
    await page.touchscreen.tap(100, 150)
    await expect(post(page, 'middle').locator('.feed-caption')).toBeVisible()
    await page.clock.install()
    await page.touchscreen.tap(100, 150)
    await expect(post(page, 'middle')).toHaveAttribute('data-playing', '')
    await page.clock.fastForward(2_000)
    await move(page, 'latest')
    await expect(page.locator('.temple-feed')).toHaveAttribute('data-transport-peek', '')
    await page.clock.fastForward(2_100)
    await expect(page.locator('.temple-feed')).not.toHaveAttribute('data-transport-peek', '')
  })
})

test('a scrub drag keeps the same cursor when leaving the track', async ({ page }) => {
  await arrive(page, 'latest')
  const item = post(page, 'latest')
  await expect(item).toHaveAttribute('data-playing', '')
  await item.locator('.feed-tap').hover({ position: { x: 100, y: 100 } })
  const seek = item.locator('.feed-video-seek')
  await expect(seek).toBeEnabled()
  const box = (await seek.boundingBox())!
  const y = box.y + box.height / 2
  const x = box.x + box.width / 2
  await page.mouse.move(x, y)
  const cursor = await page.evaluate(
    ({ x, y }) => getComputedStyle(document.elementFromPoint(x, y)!).cursor,
    { x, y },
  )
  await page.mouse.down()
  await page.mouse.move(3, y)
  const outside = await page.evaluate(
    (y) => getComputedStyle(document.elementFromPoint(3, y)!).cursor,
    y,
  )
  await page.mouse.up()
  expect(outside).toBe(cursor)
})

test('description opens from its chevron and drag without interrupting playback', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await arrive(page, 'latest')
  const item = post(page, 'latest')
  await expect(item).toHaveAttribute('data-playing', '')
  await item.locator('.feed-tap').hover({ position: { x: 100, y: 100 } })
  const toggle = item.locator('[data-details-toggle]')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(item.locator('.feed-caption')).toBeVisible()
  await expect(item).toHaveAttribute('data-playing', '')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(item.locator('.feed-caption')).not.toBeVisible()
  const box = (await toggle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y - 90, { steps: 8 })
  await page.mouse.up()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(item.locator('.feed-caption')).toBeVisible()
  await expect(item).toHaveAttribute('data-playing', '')
  await expect(page).toHaveURL(path('latest'))
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).toHaveCSS('outline-style', 'none')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('video completion offers replay and the next video, skipping other post types', async ({
  page,
}) => {
  await arrive(page, 'oldest')
  const item = post(page, 'oldest')
  await expect(item).toHaveAttribute('data-playing', '')
  await page.locator('video').evaluate((video: HTMLVideoElement) => {
    video.currentTime = video.duration - 0.15
  })
  await expect(item.locator('[data-replay]')).toBeVisible()
  await expect(item.locator('[data-next]')).toBeVisible()
  await item.locator('[data-replay]').click()
  await expect(item).toHaveAttribute('data-playing', '')
  await expect(item.locator('[data-replay]')).not.toBeVisible()
  expect(
    await page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime),
  ).toBeLessThan(3)
  await page.locator('video').evaluate((video: HTMLVideoElement) => {
    video.currentTime = video.duration - 0.15
  })
  await expect(item.locator('[data-next]')).toBeVisible()
  await item.locator('[data-next]').click()
  await expect(page).toHaveURL(path('middle'))
  await expect(post(page, 'middle')).toHaveAttribute('data-playing', '')
  await page.locator('video').evaluate((video: HTMLVideoElement) => {
    video.currentTime = video.duration - 0.15
  })
  await expect(post(page, 'middle').locator('[data-replay]')).toBeVisible()
  await post(page, 'middle').locator('[data-next]').click()
  await expect(page).toHaveURL(path('latest'))
  await expect(post(page, 'latest')).toHaveAttribute('data-playing', '')
  await page.locator('video').evaluate((video: HTMLVideoElement) => {
    video.currentTime = video.duration - 0.15
  })
  await expect(post(page, 'latest').locator('[data-replay]')).toBeVisible()
  await expect(post(page, 'latest').locator('[data-next]')).not.toBeVisible()
})

test('background visibility does not pause media and system controls reflect the current post', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const handlers = new Map<string, MediaSessionActionHandler | null>()
    Object.assign(window, { mediaHandlers: handlers })
    navigator.mediaSession.setActionHandler = (action, handler) => {
      handlers.set(action, handler)
    }
  })
  await arrive(page, 'latest')
  await expect(post(page, 'latest')).toHaveAttribute('data-playing', '')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(await page.locator('video').evaluate((video: HTMLVideoElement) => video.paused)).toBe(
    false,
  )
  expect(await page.evaluate(() => navigator.mediaSession.metadata?.title)).toBe('Synthetic latest')
  await page.evaluate(() => (window as any).mediaHandlers.get('pause')({ action: 'pause' }))
  await expect(post(page, 'latest')).not.toHaveAttribute('data-playing', '')
  await page.evaluate(() => (window as any).mediaHandlers.get('play')({ action: 'play' }))
  await expect(post(page, 'latest')).toHaveAttribute('data-playing', '')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await move(page, 'middle')
  await expect(post(page, 'middle')).toHaveAttribute('data-playing', '')
  expect(await page.evaluate(() => navigator.mediaSession.metadata?.title)).toBe('Synthetic middle')
})

test('description state changes animate while dragging follows the pointer directly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await arrive(page, 'latest')
  const item = post(page, 'latest')
  await expect(item).toHaveAttribute('data-playing', '')
  const panel = item.locator('.feed-panel')
  const movement = await item.evaluate((article) => {
    article.querySelector<HTMLButtonElement>('.feed-tap')!.click()
    const panel = article.querySelector<HTMLElement>('.feed-panel')!
    const animation = panel.getAnimations()[0]
    if (!animation) return undefined
    animation.pause()
    animation.currentTime = 110
    const middle = new DOMMatrixReadOnly(getComputedStyle(panel).transform).m42
    const open = Number(getComputedStyle(panel).getPropertyValue('--feed-drawer-open'))
    const height = article.querySelector('.feed-details')!.getBoundingClientRect().height
    const chevron = article.querySelector('.feed-disclosure')!
    const chevronY = new DOMMatrixReadOnly(getComputedStyle(chevron).transform).m42
    const chevronPhase = new DOMMatrixReadOnly(
      getComputedStyle(chevron.querySelector('path')!).transform,
    ).m22
    animation.finish()
    return { middle, open, height, chevronY, chevronPhase }
  })
  expect(movement).toBeDefined()
  expect(movement!.open).toBeGreaterThan(0)
  expect(movement!.open).toBeLessThan(1)
  expect(movement!.middle).toBeCloseTo((1 - movement!.open) * movement!.height, 2)
  expect(movement!.chevronY).toBeCloseTo(10 * movement!.open, 2)
  expect(movement!.chevronPhase).toBeCloseTo(2 * movement!.open - 1, 2)
  await expect(panel).not.toHaveAttribute('data-animating', '')
  const closing = await item.evaluate((article) => {
    article.querySelector<HTMLButtonElement>('[data-details-toggle]')!.click()
    const animation = article.querySelector('.feed-panel')!.getAnimations()[0]
    if (!animation) return false
    animation.finish()
    return true
  })
  expect(closing).toBe(true)
  await expect(panel).not.toHaveAttribute('data-animating', '')
  const toggle = item.locator('[data-details-toggle]')
  const box = (await toggle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y - 70, { steps: 6 })
  await expect(panel).toHaveAttribute('data-dragging', '')
  expect(await panel.evaluate((node) => node.getAnimations().length)).toBe(0)
  const dragged = await panel.evaluate((node) => {
    const open = Number(getComputedStyle(node).getPropertyValue('--feed-drawer-open'))
    const chevron = node.querySelector('.feed-disclosure')!
    return {
      open,
      y: new DOMMatrixReadOnly(getComputedStyle(chevron).transform).m42,
      phase: new DOMMatrixReadOnly(getComputedStyle(chevron.querySelector('path')!).transform).m22,
    }
  })
  expect(dragged.open).toBeGreaterThan(0)
  expect(dragged.open).toBeLessThan(1)
  expect(dragged.y).toBeCloseTo(10 * dragged.open, 2)
  expect(dragged.phase).toBeCloseTo(2 * dragged.open - 1, 2)
  await page.mouse.up()
  expect(await panel.evaluate((node) => node.getAnimations().length)).toBe(0)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page).toHaveURL(path('latest'))
})

test('reduced motion opens the description without a panel animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await arrive(page, 'latest')
  const item = post(page, 'latest')
  await expect(item).toHaveAttribute('data-playing', '')
  await item.locator('.feed-tap').click({ position: { x: 100, y: 100 } })
  await expect(item.locator('.feed-caption')).toBeVisible()
  expect(await item.locator('.feed-panel').evaluate((node) => node.getAnimations().length)).toBe(0)
})

test('stream order runs toward newer posts and surface Space does not outline the screen', async ({
  page,
}) => {
  await arrive(page, 'middle')
  const item = post(page, 'middle')
  await expect(item).toHaveAttribute('data-playing', '')
  expect(
    await page
      .locator('.feed-post')
      .evaluateAll((posts) => posts.map((post) => (post as HTMLElement).dataset.postId)),
  ).toEqual(['fixture-oldest', 'fixture-text', 'fixture-audio', 'fixture-middle', 'fixture-latest'])
  await item.locator('.feed-tap').hover({ position: { x: 100, y: 100 } })
  const button = item.locator('.feed-playback-toggle')
  await expect(button).toHaveAttribute('aria-label', 'Pause Synthetic middle')
  const playBox = (await button.boundingBox())!
  expect(playBox.x + playBox.width).toBeLessThan(
    (await item.locator('.feed-video-seek').boundingBox())!.x,
  )
  await button.click()
  await expect(item).not.toHaveAttribute('data-playing', '')
  await expect(button).toHaveAttribute('aria-label', 'Play Synthetic middle')
  await button.click()
  await expect(item).toHaveAttribute('data-playing', '')
  await page.locator('.temple-feed').focus()
  await page.keyboard.press('Space')
  await expect(item).not.toHaveAttribute('data-playing', '')
  await expect(page.locator('.temple-feed')).toHaveCSS('outline-style', 'none')
  await page.keyboard.press('Space')
  await expect(item).toHaveAttribute('data-playing', '')
  await item.locator('.feed-tap').focus()
  await page.keyboard.press('Space')
  await expect(item).not.toHaveAttribute('data-playing', '')
  await expect(item.locator('.feed-tap')).toHaveCSS('outline-style', 'none')
})

test('bottom dimming remains in place midway through the drawer closing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await arrive(page, 'latest')
  const item = post(page, 'latest')
  await expect(item).toHaveAttribute('data-playing', '')
  const collapsed = await item.locator('.feed-bottom-shade').boundingBox()
  expect(collapsed!.height).toBeLessThan(844 * 0.2)
  expect(collapsed!.y + collapsed!.height).toBeCloseTo(844, 1)
  await page.clock.install()
  await item.locator('.feed-tap').click({ position: { x: 100, y: 150 } })
  await expect(item.locator('.feed-panel')).not.toHaveAttribute('data-animating', '')
  await page.clock.fastForward(10_100)
  await expect(page.locator('.temple-feed')).not.toHaveAttribute('data-transport-peek', '')
  await expect(item.locator('.feed-bottom-shade')).toHaveCSS('opacity', '1')
  await item.evaluate((article) => {
    article.querySelector<HTMLButtonElement>('[data-details-toggle]')!.click()
    for (const animation of article.getAnimations({ subtree: true })) {
      animation.pause()
      animation.currentTime = 150
    }
  })
  const midway = (await item.locator('.feed-bottom-shade').boundingBox())!
  expect(midway.y + midway.height).toBeCloseTo(844, 1)
  const pixel = await sharp(await page.screenshot())
    .extract({ left: 2, top: 842, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer()
  expect(Math.max(...pixel)).toBeLessThan(35)
})

test('an upward scrubber gesture pulls the drawer without seeking or pausing', async ({
  page,
  context,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await arrive(page, 'latest')
  const item = post(page, 'latest')
  await expect(item).toHaveAttribute('data-playing', '')
  await item.locator('.feed-tap').hover({ position: { x: 100, y: 150 } })
  const seek = item.locator('.feed-video-seek')
  await expect(seek).toBeEnabled()
  const box = (await seek.boundingBox())!
  const before = await page
    .locator('video')
    .evaluate((video: HTMLVideoElement) => video.currentTime)
  const x = box.x + box.width * 0.85,
    y = box.y + box.height / 2
  const touch = browserName === 'chromium' ? await context.newCDPSession(page) : undefined
  if (touch) {
    await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
  }
  expect(await page.locator('video').evaluate((video: HTMLVideoElement) => video.paused)).toBe(
    false,
  )
  if (touch) {
    for (let step = 1; step <= 8; step++)
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + step / 4, y: y - step * 10 }],
      })
  } else await page.mouse.move(x + 2, y - 80, { steps: 8 })
  await expect(item.locator('.feed-panel')).toHaveAttribute('data-dragging', '')
  await expect(page.locator('.temple-feed')).not.toHaveAttribute('data-range-dragging')
  if (touch) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } else await page.mouse.up()
  await expect(item.locator('[data-details-toggle]')).toHaveAttribute('aria-expanded', 'true')
  await expect(item).toHaveAttribute('data-playing', '')
  expect(
    await page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime),
  ).toBeLessThan(before + 2)
  await expect(page).toHaveURL(path('latest'))
  if (touch) {
    await item
      .locator('[data-details-toggle]')
      .evaluate((button: HTMLButtonElement) => button.click())
    await expect(item.locator('.feed-panel')).not.toHaveAttribute('data-animating', '')
    const next = (await seek.boundingBox())!
    const start = { x: next.x + next.width * 0.2, y: next.y + next.height / 2 }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    for (let step = 1; step <= 5; step++)
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: start.x + next.width * step * 0.1, y: start.y }],
      })
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(item).toHaveAttribute('data-playing', '')
    await expect(item.locator('.feed-caption')).not.toBeVisible()
    expect(
      await page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime),
    ).toBeGreaterThan(6)
    await touch.detach()
  }
})
