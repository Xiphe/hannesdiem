import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import type { HighlightState, RuntimeHighlight } from '../app/electrocute/contract.ts'

async function openHighlight(page: Page, touch = false) {
  const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
  await expect(seek).toBeEnabled()
  await seek.focus()
  await seek.press('Shift+Tab')
  await page.keyboard.press('Tab')
  if (touch) await page.getByRole('button', { name: 'Set highlight', exact: true }).tap()
  else await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Highlight editor' })).not.toHaveAttribute(
    'data-motion',
  )
}

test.beforeEach(async ({ page }) => {
  await page.route('**/fixture-media/electrocute.mp4', async (route) => {
    const clip = await readFile(new URL('./media/electrocute.mp4', import.meta.url))
    const range = route
      .request()
      .headers()
      .range?.match(/^bytes=(\d+)-(\d*)$/)
    const start = range ? Number(range[1]) : 0
    const end = range?.[2] ? Math.min(Number(range[2]), clip.length - 1) : clip.length - 1
    const body = clip.subarray(start, end + 1)
    return route.fulfill({
      status: range ? 206 : 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Length': String(body.length),
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${clip.length}` } : {}),
      },
      body,
    })
  })
})

test('archive reverses chronology without loading any recordings', async ({ page }) => {
  let mediaRequests = 0
  page.on('request', (request) => {
    if (request.url().endsWith('.mp4')) mediaRequests++
  })
  await page.goto('/electrocute')
  await expect(page.getByRole('heading', { name: 'ElectroCute', exact: true })).toBeVisible()
  await expect(page.locator('.ec-session-title').first()).toHaveText('Test session 01')
  await page.getByRole('button', { name: 'Reverse session order' }).click()
  await expect(page.locator('.ec-session-title').first()).toHaveText('Test session 04')
  await page.getByRole('button', { name: 'Reverse session order' }).click()
  await expect(page.locator('.ec-session-title').first()).toHaveText('Test session 01')
  expect(mediaRequests).toBe(0)
})

test('highlight links override stored progress, while unmarked session links restore it', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'hannesdiem.electrocute.progress.v1',
      JSON.stringify({
        positions: { 'test-session-1': 45 },
        latest: 'test-session-1',
      }),
    ),
  )
  await page.goto('/electrocute/test-session-1?highlight=test-highlight-b')
  await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toBeEnabled()
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeCloseTo(26, 0)
  await page.goto('/electrocute/test-session-1')
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeCloseTo(45, 0)
})

test('progress stays separate for each session and the last heard session is pinned', async ({
  page,
}) => {
  for (const [id, position] of [
    ['test-session-1', 20],
    ['test-session-2', 38],
  ] as const) {
    await page.goto(`/electrocute/${id}`)
    await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toBeEnabled()
    await page.locator('video').evaluate(async (video, time) => {
      const media = video as HTMLVideoElement
      media.muted = true
      await media.play()
      media.currentTime = time
    }, position)
    await expect
      .poll(() =>
        page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime),
      )
      .toBeGreaterThanOrEqual(position)
    await page.locator('video').evaluate((video) => (video as HTMLVideoElement).pause())
    await expect
      .poll(async () =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem('hannesdiem.electrocute.progress.v1')!).latest,
        ),
      )
      .toBe(id)
  }
  await page.goto('/electrocute')
  await expect(page.locator('.ec-resume')).toContainText('Test session 02')
  await page.getByRole('button', { name: 'Reverse session order' }).click()
  await expect(page.locator('.ec-resume')).toContainText('Test session 02')
  await page.getByRole('link', { name: 'Continue', exact: true }).click()
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeGreaterThanOrEqual(38)
  await page.goto('/electrocute/test-session-1')
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeGreaterThanOrEqual(20)
})

async function setRange(page: Page, start: number, end: number) {
  const left = page.getByRole('slider', { name: 'Highlight start', exact: true })
  const right = page.getByRole('slider', { name: 'Highlight end', exact: true })
  await right.press('End')
  await left.press('Home')
  for (let second = 0; second < start; second++) await left.press('ArrowRight')
  await right.press('Home')
  // The synthetic source is 5 fps: Home leaves a one-frame minimum.
  for (let frame = 0; frame < 4; frame++) await right.press('Shift+ArrowRight')
  for (let second = start + 1; second < end; second++) await right.press('ArrowRight')
  // Geometry-based drag checks begin after the keyboard reframe has settled.
  const margin = Math.max(2, (end - start) * 0.12)
  await expect
    .poll(async () =>
      Number(
        await page
          .getByRole('slider', { name: 'Passage position', exact: true })
          .getAttribute('max'),
      ),
    )
    .toBeCloseTo(Math.min(96, end + margin), 6)
}

for (const viewport of [
  { width: 1440, height: 700 },
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`the top-aligned player fits the image without a black band at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/electrocute/test-session-1')
    await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toBeEnabled()
    await expect(page.locator('video')).toHaveCSS('object-fit', 'contain')
    await expect(
      page.getByRole('region', { name: 'ElectroCute archive' }).getByRole('heading'),
    ).toHaveCount(0)
    await expect(page.locator('video')).toHaveCSS('object-position', '50% 0%')
    const ratio = await page.locator('video').evaluate((node) => {
      const video = node as HTMLVideoElement
      return video.videoWidth / video.videoHeight
    })
    const imageHeight = Math.min(viewport.height, viewport.width / ratio)
    for (const selector of ['.ec-player', '.ec-stage', 'video']) {
      const box = (await page.locator(selector).boundingBox())!
      expect(box.x).toBe(0)
      expect(box.y).toBe(0)
      expect(box.width).toBe(viewport.width)
      expect(box.height).toBeCloseTo(imageHeight, 1)
    }
    const transport = (await page.locator('.ec-transport').boundingBox())!
    expect(transport.y + transport.height).toBeCloseTo(imageHeight, 1)
    await expect(page.getByRole('region', { name: 'ElectroCute archive' })).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    )
    const badge = (await page.locator('.ec-play-badge').boundingBox())!
    expect(badge.y + badge.height / 2).toBeCloseTo(imageHeight / 2, 1)

    await expect(page.getByRole('complementary')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0)
    await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'All sessions' })).toHaveCount(0)
    const footer = page.getByRole('contentinfo')
    expect((await footer.boundingBox())!.y).toBe(viewport.height)
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeInViewport()
  })
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`the highlights drawer resizes playback beside its list at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/electrocute/test-session-1')
    await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toBeEnabled()
    const trigger = page.getByRole('button', { name: 'Show highlights', exact: true })
    const drawer = page.getByRole('complementary', { name: 'Highlights', exact: true })
    const video = page.locator('video')
    const before = (await video.boundingBox())!
    await expect(drawer).toBeHidden()
    await trigger.click()
    await expect(drawer).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(drawer.getByRole('button', { name: 'Close highlights' })).toBeFocused()
    const sidebarWidth = Math.min(360, viewport.width * 0.42)
    await expect
      .poll(async () => (await video.boundingBox())!.width)
      .toBeCloseTo(before.width - sidebarWidth, 1)
    const image = (await video.boundingBox())!
    const sidebar = (await drawer.boundingBox())!
    expect(sidebar.x).toBeCloseTo(image.x + image.width, 1)
    expect(sidebar.y).toBe(image.y)
    expect(sidebar.height).toBeCloseTo(image.height, 1)
    expect(image.height).toBeLessThan(before.height)
    const controls = (await page.locator('.ec-transport').boundingBox())!
    expect(controls.x + controls.width).toBeLessThanOrEqual(sidebar.x)
    await drawer.getByRole('link', { name: /Test highlight B/ }).click()
    await expect
      .poll(() => video.evaluate((node) => (node as HTMLVideoElement).currentTime))
      .toBeGreaterThanOrEqual(26)
    await expect(drawer.getByRole('link', { name: /Test highlight B/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(drawer).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect.poll(async () => (await video.boundingBox())!.width).toBeCloseTo(before.width, 1)
    await trigger.press('Enter')
    await expect(drawer).toBeVisible()
    await drawer.getByRole('button', { name: 'Close highlights' }).click()
    await expect(drawer).toBeHidden()
    await trigger.click()
    await page.locator('.ec-video-tap').click({ position: { x: 20, y: 10 } })
    await expect(drawer).toBeVisible()
    await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click()
    await expect
      .poll(() =>
        page.locator('.ec-player').evaluate((node) => document.fullscreenElement === node),
      )
      .toBe(true)
    await expect(drawer).toBeVisible()
    const fullVideo = (await video.boundingBox())!
    expect(fullVideo.x + fullVideo.width).toBeLessThanOrEqual((await drawer.boundingBox())!.x)
    await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click()
    await drawer.getByRole('button', { name: 'Close highlights' }).click()
    await expect(drawer).toBeHidden()
  })
}

test('range editing clamps bounds, previews the passage and persists only a local draft', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  const video = page.locator('video')
  await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toBeEnabled()
  await video.evaluate((video) => {
    ;(video as HTMLVideoElement).currentTime = 20
  })
  await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toHaveValue(
    '20',
  )
  await openHighlight(page)
  const start = page.getByRole('slider', { name: 'Highlight start', exact: true })
  const end = page.getByRole('slider', { name: 'Highlight end', exact: true })
  await expect(start).toHaveAttribute('aria-valuenow', '20')
  await expect(end).toHaveAttribute('aria-valuenow', '80')
  await start.press('End')
  await start.press('ArrowRight')
  expect(Number(await start.getAttribute('aria-valuenow'))).toBeLessThan(80)
  await setRange(page, 10, 12)
  await page.getByRole('button', { name: /^(Preview|Restart) passage$/ }).click()
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).paused), { timeout: 8000 })
    .toBe(true)
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeCloseTo(12, 0)
  await page.getByRole('button', { name: 'Name highlight', exact: true }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Synthetic saved passage')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Draft saved on this device.')
  await page.reload()
  const draft = page.getByRole('button', { name: /Synthetic saved passage, 0:10 to 0:12/ })
  await expect(draft).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Highlights' })).toHaveCount(0)
  await draft.click()
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime))
    .toBeGreaterThanOrEqual(10)
  await page.getByRole('button', { name: /Test highlight B, 0:26 to 0:58/ }).click()
  await video.evaluate((video) => {
    ;(video as HTMLVideoElement).currentTime = 59
  })
  await expect.poll(() => video.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(false)
})

test('paused Play stays visible over the transport and highlights sit below an accurately placed playhead', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
  await expect(seek).toBeEnabled()
  const badge = page.locator('.ec-play-badge')
  await page.mouse.move(0, 0)
  await expect(badge).toHaveCSS('opacity', '1')
  await page.locator('.ec-transport').hover()
  await expect(badge).toHaveCSS('opacity', '1')
  await badge.hover()
  await expect(badge).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.55)')
  await expect(badge.locator('svg')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -2, 0)')
  await page.mouse.move(0, 0)
  await expect(badge).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.36)')
  await page.locator('video').evaluate((video) => {
    ;(video as HTMLVideoElement).currentTime = 20
  })
  await expect(seek).toHaveValue('20')
  const bar = (await seek.boundingBox())!
  const marker = (await page
    .getByRole('button', { name: /Test highlight A, 0:12 to 0:32/ })
    .boundingBox())!
  const head = (await page.locator('.ec-main-playhead').boundingBox())!
  expect(marker.x).toBeCloseTo(bar.x + 5 + (12 / 96) * (bar.width - 10), 1)
  expect(marker.width).toBeCloseTo((20 / 96) * (bar.width - 10), 1)
  expect(head.x + head.width / 2).toBeCloseTo(bar.x + 5 + (20 / 96) * (bar.width - 10), 1)
  const wrap = page.locator('.ec-seek-wrap')
  const box = (await wrap.boundingBox())!
  const pixels = await sharp(await wrap.screenshot())
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const color = (offset: number) => {
    const x = Math.round(head.x + head.width / 2 - box.x + offset)
    const y = Math.round(head.y + head.height / 2 - box.y)
    const index = (y * pixels.info.width + x) * pixels.info.channels
    return [...pixels.data.subarray(index, index + 3)]
  }
  expect(color(0)).toEqual([255, 248, 251])
  const pink = color(-8)
  expect(pink[0]).toBeGreaterThan(220)
  expect(pink[1]).toBeLessThan(180)
  expect(pink[2]).toBeGreaterThan(170)
})

test('the inline transport plays, seeks, controls sound and opens timeline highlights', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toHaveCount(0)
  const play = await page.getByRole('button', { name: 'Play', exact: true }).boundingBox()
  const bar = await page
    .getByRole('slider', { name: 'Playback position', exact: true })
    .boundingBox()
  const sound = await page.getByRole('button', { name: 'Mute sound', exact: true }).boundingBox()
  expect(play!.x + play!.width).toBeLessThanOrEqual(bar!.x)
  expect(bar!.x + bar!.width).toBeLessThanOrEqual(sound!.x)
  expect(Math.abs(play!.y + play!.height / 2 - bar!.y - bar!.height / 2)).toBeLessThan(1)
  expect(Math.abs(sound!.y + sound!.height / 2 - bar!.y - bar!.height / 2)).toBeLessThan(1)
  const stage = await page.locator('.ec-stage').boundingBox()
  const fullscreen = await page
    .getByRole('button', { name: 'Enter fullscreen', exact: true })
    .boundingBox()
  expect(fullscreen!.y - stage!.y).toBeLessThanOrEqual(16)
  expect(stage!.x + stage!.width - fullscreen!.x - fullscreen!.width).toBeLessThanOrEqual(16)
  await page.locator('.ec-volume-control').hover()
  expect(
    await page
      .getByRole('button', { name: 'Mute sound', exact: true })
      .evaluate((button) => getComputedStyle(button).backgroundColor),
  ).toBe('rgba(0, 0, 0, 0)')
  const volume = page.getByRole('slider', { name: 'Volume', exact: true })
  await expect(volume).toBeVisible()
  expect(await volume.evaluate((input) => getComputedStyle(input).writingMode)).toBe('vertical-lr')
  await volume.press('Home')
  await volume.press('ArrowUp')
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).volume))
    .toBeCloseTo(0.01, 2)
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click()
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).muted))
    .toBe(true)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Test highlight C, 1:10 to 1:30/ }).click()
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeGreaterThanOrEqual(70)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
  await seek.focus()
  await seek.press('Home')
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeLessThan(1)
  await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click()
  await expect
    .poll(() =>
      page.locator('.ec-player').evaluate((player) => document.fullscreenElement === player),
    )
    .toBe(true)
  await openHighlight(page)
  await expect(
    page.locator('.ec-player').getByRole('dialog', { name: 'Highlight editor' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click()
})

test('the seek popover expands into trimming, then replaces its controls with the name step', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
  const time = page.getByRole('dialog', { name: 'Playback tools' })
  await expect(seek).toBeEnabled()
  await expect(time).toBeHidden()
  await seek.focus()
  await expect(time).toContainText('/ 1:36')
  const original = await seek.boundingBox()
  await openHighlight(page)
  const editor = page.getByRole('dialog', { name: 'Highlight editor' })
  await expect(editor).toBeVisible()
  await expect(editor.locator('.ec-time-label')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveCount(0)
  expect(await seek.boundingBox()).toEqual(original)
  const popup = await editor.boundingBox()
  const row = await page.locator('.ec-transport-row').boundingBox()
  expect(popup!.x).toBeLessThan(row!.x)
  expect(popup!.x + popup!.width).toBeGreaterThan(row!.x + row!.width)
  expect(popup!.y + popup!.height).toBeLessThan(original!.y)
  await expect(editor.getByRole('slider', { name: 'Passage position' })).toBeVisible()
  await expect(editor.locator('.ec-time-ruler')).toBeVisible()
  await expect(page.locator('.ec-seek-wrap > .ec-main-trim .ec-time-ruler')).toHaveCount(0)
  await expect(editor.locator('.ec-passage-duration')).toHaveText('1:00')
  const arrow = await editor.locator('.ec-range-arrow').boundingBox()
  const selection = await page
    .locator('.ec-seek-wrap > .ec-main-trim .ec-trim-selection')
    .boundingBox()
  expect(arrow!.height).toBe(5)
  expect(Math.abs(arrow!.x + 5 - selection!.x)).toBeLessThan(1)
  expect(Math.abs(arrow!.width - 10 - selection!.width)).toBeLessThan(1)
  expect(popup!.height).toBeLessThan(50)
  expect(
    (await editor.getByRole('button', { name: 'Name highlight', exact: true }).boundingBox())!
      .height,
  ).toBe(32)
  const cancel = await editor.getByRole('button', { name: 'Cancel', exact: true }).boundingBox()
  const save = await editor
    .getByRole('button', { name: 'Name highlight', exact: true })
    .boundingBox()
  expect(popup!.x + popup!.width - cancel!.x - cancel!.width).toBeGreaterThanOrEqual(8)
  expect(cancel!.x - save!.x - save!.width).toBeGreaterThanOrEqual(8)
  const mainPlay = await page.getByRole('button', { name: 'Play', exact: true }).boundingBox()
  const passagePlay = await editor
    .getByRole('button', { name: 'Preview passage', exact: true })
    .boundingBox()
  const sound = page.locator('.ec-volume-control > button')
  const speaker = await sound.boundingBox()
  expect(mainPlay!.x).toBeCloseTo(row!.x, 1)
  expect(speaker!.x + speaker!.width).toBeCloseTo(row!.x + row!.width, 1)
  expect(passagePlay!.x + passagePlay!.width / 2).toBeCloseTo(mainPlay!.x + mainPlay!.width / 2, 1)
  expect(cancel!.x + cancel!.width / 2).toBeCloseTo(speaker!.x + speaker!.width / 2, 1)
  await sound.hover()
  const volume = page.getByRole('slider', { name: 'Volume', exact: true })
  await expect(volume).toBeVisible()
  // The popup overlaps the editor; hit testing must reach Volume, not the editor beneath it.
  expect(
    await volume.evaluate((node) => {
      const volume = node.getBoundingClientRect()
      const editor = document
        .querySelector('.ec-time-tooltip[data-editing]')!
        .getBoundingClientRect()
      const x = volume.x + volume.width / 2
      const top = Math.max(volume.top, editor.top)
      const bottom = Math.min(volume.bottom, editor.bottom)
      return bottom > top && document.elementFromPoint(x, (top + bottom) / 2) === node
    }),
  ).toBe(true)
  const closeIcon = await editor
    .getByRole('button', { name: 'Cancel', exact: true })
    .locator('svg')
    .boundingBox()
  expect(
    Math.abs(closeIcon!.x + closeIcon!.width / 2 - cancel!.x - cancel!.width / 2),
  ).toBeLessThan(1)
  expect(
    Math.abs(closeIcon!.y + closeIcon!.height / 2 - cancel!.y - cancel!.height / 2),
  ).toBeLessThan(1)
  const saveButton = editor.getByRole('button', { name: 'Name highlight', exact: true })
  const saveColor = await saveButton.evaluate((button) => getComputedStyle(button).color)
  await saveButton.hover()
  expect(await saveButton.evaluate((button) => getComputedStyle(button).color)).toBe(saveColor)
  expect(await saveButton.boundingBox()).toEqual(save)
  await expect(page.locator('.ec-range-link, .ec-trim-adjust')).toHaveCount(0)
  await editor.getByRole('button', { name: 'Name highlight', exact: true }).click()
  const title = editor.getByRole('textbox', { name: 'Title', exact: true })
  await expect(title).toBeFocused()
  await expect(editor.getByRole('slider')).toHaveCount(0)
  await expect(editor.locator('.ec-trim-adjust')).toHaveCount(0)
  await expect(editor.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled()
  expect(await seek.boundingBox()).toEqual(original)
  await title.fill('Synthetic title kept while trimming')
  expect(await title.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none')
  await editor.getByRole('button', { name: 'Back to selection', exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Passage start', exact: true })).toBeFocused()
  await expect(editor.getByRole('slider', { name: 'Passage position' })).toBeVisible()
  await editor.getByRole('button', { name: 'Name highlight', exact: true }).click()
  await expect(title).toHaveValue('Synthetic title kept while trimming')
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(editor).toHaveCount(0)
  await expect(seek).toBeFocused()
})

test('tooltip motion expands the clock and slides naming forward and back without focus outlines', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options)
      animation.pause()
      return animation
    }
  })
  await page.goto('/electrocute/test-session-1')
  const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
  await expect(seek).toBeEnabled()
  await seek.focus()
  const clock = page.getByRole('dialog', { name: 'Playback tools' })
  const compact = await clock.boundingBox()
  await clock.getByRole('button', { name: 'Set highlight' }).click()
  const editor = page.getByRole('dialog', { name: 'Highlight editor' })
  await expect(editor).toHaveAttribute('data-motion', 'clock-range')
  await expect.poll(() => editor.evaluate((node) => node.getAnimations().length)).toBeGreaterThan(0)
  const sizes = await editor.evaluate((node) => {
    const animation = node.getAnimations()[0]
    animation.currentTime = 0
    const first = node.getBoundingClientRect().width
    animation.currentTime = 160
    return { first, middle: node.getBoundingClientRect().width }
  })
  const row = await page.locator('.ec-transport-row').boundingBox()
  expect(sizes.first).toBeCloseTo(compact!.width, 0)
  expect(sizes.middle).toBeGreaterThan(sizes.first)
  expect(sizes.middle).toBeLessThan(row!.width)
  const finish = () =>
    page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()))
  await finish()
  await expect(editor).not.toHaveAttribute('data-motion')
  const actionPositions = () =>
    editor.locator('.ec-clip-actions button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const { x, y, width, height } = button.getBoundingClientRect()
        return { x, y, width, height }
      }),
    )
  const fixedActions = await actionPositions()
  await editor.getByRole('button', { name: 'Name highlight' }).click()
  await expect(editor).toHaveAttribute('data-motion', 'range-name')
  await expect
    .poll(() => editor.locator('.ec-panel-current').evaluate((node) => node.getAnimations().length))
    .toBeGreaterThan(0)
  expect(await actionPositions()).toEqual(fixedActions)
  const slide = await editor.locator('.ec-panel-current').evaluate((node) => {
    const animation = node.getAnimations()[0]
    const duration = animation.effect!.getTiming().duration
    animation.currentTime = 180
    return duration
  })
  expect(slide).toBe(360)
  expect(await actionPositions()).toEqual(fixedActions)
  const directions = () =>
    editor.evaluate((node) => {
      const first = (selector: string) =>
        (node.querySelector(selector)!.getAnimations()[0].effect as KeyframeEffect).getKeyframes()
      const incoming = first('.ec-panel-current')
      const outgoing = first('.ec-panel-outgoing')
      return {
        enter: incoming[0].transform,
        exit: outgoing.at(-1)!.transform,
        inert: (node.querySelector('.ec-panel-outgoing') as HTMLElement).inert,
      }
    })
  expect(await directions()).toEqual({
    enter: 'translateX(100%)',
    exit: 'translateX(-100%)',
    inert: true,
  })
  await finish()
  await expect(editor).not.toHaveAttribute('data-motion')
  expect(await actionPositions()).toEqual(fixedActions)
  const title = editor.getByRole('textbox', { name: 'Title' })
  await expect(title).toBeFocused()
  await title.pressSequentially('Synthetic motion title')
  expect(await title.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('none')
  await editor.getByRole('button', { name: 'Back to selection' }).click()
  await expect(editor).toHaveAttribute('data-motion', 'name-range')
  await expect
    .poll(() => editor.locator('.ec-panel-current').evaluate((node) => node.getAnimations().length))
    .toBeGreaterThan(0)
  expect(await actionPositions()).toEqual(fixedActions)
  await editor.locator('.ec-panel-current').evaluate((node) => {
    node.getAnimations()[0].currentTime = 140
  })
  expect(await actionPositions()).toEqual(fixedActions)
  expect(await directions()).toEqual({
    enter: 'translateX(-100%)',
    exit: 'translateX(100%)',
    inert: true,
  })
  await finish()
  await expect(editor).not.toHaveAttribute('data-motion')
  await expect(editor.getByRole('slider', { name: 'Passage start', exact: true })).toBeFocused()
  await editor.getByRole('button', { name: 'Name highlight' }).click()
  await expect(editor).toHaveAttribute('data-motion', 'range-name')
  await page.keyboard.press('Escape')
  await expect(editor).toHaveCount(0)
  await expect(seek).toBeFocused()
  await seek.press('ArrowRight')
  await expect(page.getByRole('dialog', { name: 'Playback tools' })).toBeVisible()
  // Activate the separate star while the clock is visible, without moving the pointer away first.
  const playheadStar = page.getByRole('button', { name: 'Highlight at playhead', exact: true })
  await playheadStar.dispatchEvent('pointerdown', { pointerType: 'mouse' })
  await playheadStar.dispatchEvent('click')
  await expect(editor).toHaveAttribute('data-motion', 'clock-range')
  await expect.poll(() => editor.evaluate((node) => node.getAnimations().length)).toBeGreaterThan(0)
  await finish()
  await expect(editor).not.toHaveAttribute('data-motion')
  await page.keyboard.press('Escape')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openHighlight(page)
  await expect(editor).not.toHaveAttribute('data-motion')
  expect(
    await editor.evaluate(
      (node) =>
        node
          .getAnimations({ subtree: true })
          .filter((animation) => animation.constructor === Animation).length,
    ),
  ).toBe(0)
  await editor.getByRole('button', { name: 'Name highlight' }).click()
  await expect(title).toBeFocused()
  await title.pressSequentially('Reduced motion')
  expect(await title.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('none')
  expect(
    await editor.evaluate(
      (node) =>
        node
          .getAnimations({ subtree: true })
          .filter((animation) => animation.constructor === Animation).length,
    ),
  ).toBe(0)
  await title.press('Enter')
  await expect(page.getByRole('status')).toHaveText('Draft saved on this device.')
  await expect(editor).toHaveCount(0)
})

test('the compact tooltip closes when the mouse leaves a focused transport or dismissed editor', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
  const popup = page.getByRole('dialog', { name: 'Playback tools' })
  await expect(seek).toBeEnabled()
  const box = (await seek.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + 9)
  await expect(popup).toBeVisible()
  await page.mouse.move(0, 0)
  expect(
    await page.locator('.ec-time-tooltip').evaluate((node) => getComputedStyle(node).visibility),
  ).toBe('hidden')
  await expect(popup).toBeHidden()
  await expect(seek).toBeFocused()
  await openHighlight(page)
  await page.mouse.move(0, 0)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Highlight editor' })).toHaveCount(0)
  await expect(popup).toBeHidden()
  await expect(seek).toBeFocused()
  await seek.press('ArrowRight')
  await expect(popup).toBeVisible()
  await page.mouse.move(1, 1)
  await expect(popup).toBeHidden()
})

test('the star popover keeps the whole seek hit area interactive up to its body', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
  await expect(seek).toBeEnabled()
  const box = await seek.boundingBox()
  if (!box) throw Error('Missing playback bar')
  const popup = page.getByRole('dialog', { name: 'Playback tools' })
  for (const fraction of [0, 0.01, 0.5, 0.99, 1]) {
    const x = box.x + 5 + fraction * (box.width - 10),
      y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await expect(popup).toBeVisible()
    const arrow = await popup.evaluate((node) => {
      const r = node.getBoundingClientRect()
      return r.x + parseFloat(getComputedStyle(node, '::before').left)
    })
    expect(Math.abs(arrow - x)).toBeLessThan(2)
    const tip = await popup.boundingBox()
    // Keep the arrow's base clear of both rounded corners at either timeline end.
    expect(arrow - tip!.x).toBeGreaterThanOrEqual(12)
    expect(tip!.x + tip!.width - arrow).toBeGreaterThanOrEqual(12)
  }
  await page.mouse.move(box.x + 5, box.y + box.height / 2)
  const edgeAction = popup.getByRole('button', { name: 'Set highlight', exact: true })
  const edge = await edgeAction.boundingBox()
  if (!edge) throw Error('Missing clamped action')
  const original = await popup.locator('.ec-time-label').textContent()
  const edgePopup = await popup.boundingBox()
  if (!edgePopup) throw Error('Missing clamped popover')
  for (let step = 1; step <= 8; step++) {
    await page.mouse.move(
      box.x + 5,
      box.y +
        box.height / 2 +
        ((edgePopup.y + edgePopup.height / 2 - box.y - box.height / 2) * step) / 8,
    )
    await page.waitForTimeout(40)
  }
  await page.mouse.move(edge.x + edge.width / 2, edge.y + edge.height / 2, { steps: 8 })
  await expect(popup).toBeVisible()
  await expect(popup.locator('.ec-time-label')).toHaveText(original!)
  await expect(edgeAction).toHaveText('')
  await expect(edgeAction.locator('svg')).toBeVisible()
  expect(edge.width).toBeGreaterThanOrEqual(28)
  expect(edge.height).toBeGreaterThanOrEqual(28)
  // The strip below the popover (including its arrow) belongs to the native range.
  const gapY = box.y + 9
  for (const fraction of [0.25, 0.5]) {
    const gapX = box.x + 5 + fraction * (box.width - 10)
    await page.mouse.move(gapX, gapY)
    await expect(popup).toContainText(fraction === 0.25 ? '0:24' : '0:48')
    expect(
      await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.className, {
        x: gapX,
        y: gapY,
      }),
    ).toBe('ec-seek')
  }
  await page.mouse.click(box.x + 5 + 0.25 * (box.width - 10), gapY)
  await expect(seek).toHaveValue('24')
  await seek.press('Home')
  const x = box.x + 5 + 0.5 * (box.width - 10),
    y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await expect(popup).toContainText('0:48')
  const action = popup.getByRole('button', { name: 'Set highlight', exact: true })
  const target = await action.boundingBox()
  if (!target) throw Error('Missing highlight action')
  await page.mouse.move(x, target.y + target.height / 2, { steps: 8 })
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 })
  await expect(action).toBeVisible()
  await expect(popup).toContainText('0:48')
  await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2)
  await expect(page.getByRole('slider', { name: 'Highlight start', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '48',
  )
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeLessThan(1)
  await page.keyboard.press('Escape')
  await seek.press('Tab')
  const keyboardAction = page.getByRole('button', { name: 'Highlight at playhead', exact: true })
  await expect(keyboardAction).toBeFocused()
  await keyboardAction.press('Enter')
  await expect(page.getByRole('slider', { name: 'Highlight start', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '0',
  )
})

test('failed device storage keeps the unsaved form available', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage unavailable', 'SecurityError')
    }
  })
  await page.goto('/electrocute/test-session-1')
  await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toBeEnabled()
  await openHighlight(page)
  await page.getByRole('button', { name: 'Name highlight', exact: true }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Unsaved test passage')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Highlight editor' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Could not save')
})

test('main playback bar owns trimming with selected edges, second and frame controls', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toBeEnabled()
  await page.locator('video').evaluate((video) => {
    ;(video as HTMLVideoElement).currentTime = 20
  })
  await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toHaveValue(
    '20',
  )
  await openHighlight(page)
  const player = page.locator('.ec-player')
  await expect(player.locator('.ec-seek-wrap > .ec-main-trim .ec-trim-rail')).toHaveCount(1)
  await expect(
    player.getByRole('dialog', { name: 'Highlight editor' }).getByRole('slider'),
  ).toHaveCount(3)
  await expect(
    player.getByRole('dialog', { name: 'Highlight editor' }).locator('.ec-trim-edge'),
  ).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toHaveCount(0)
  const rail = await player.locator('.ec-seek-wrap > .ec-main-trim .ec-trim-rail').boundingBox()
  if (!rail) throw new Error('Missing trim timeline')
  const start = player.getByRole('slider', { name: 'Highlight start', exact: true })
  const end = player.getByRole('slider', { name: 'Highlight end', exact: true })
  async function drag(target: typeof start, seconds: number) {
    await target.scrollIntoViewIfNeeded()
    const box = await target.boundingBox()
    if (!box) throw new Error('Missing trim handle')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      box.x + box.width / 2 + (seconds / 96) * rail!.width,
      box.y + box.height / 2,
      { steps: 6 },
    )
    await page.mouse.up()
  }
  await drag(start, 10)
  await expect(start).toHaveAttribute('aria-valuenow', '30')
  await drag(end, -10)
  await expect(end).toHaveAttribute('aria-valuenow', '70')
  await start.click()
  const selection = await player
    .locator('.ec-seek-wrap > .ec-main-trim .ec-trim-selection')
    .boundingBox()
  const playback = await page
    .getByRole('slider', { name: 'Playback position', exact: true })
    .boundingBox()
  expect(
    Math.abs(selection!.y + selection!.height / 2 - playback!.y - playback!.height / 2),
  ).toBeLessThan(1)
  await expect(player.locator('.ec-trim-adjust')).toHaveCount(0)
  const passageStart = page.getByRole('slider', { name: 'Passage start', exact: true })
  const passageEnd = page.getByRole('slider', { name: 'Passage end', exact: true })
  await passageStart.press('ArrowRight')
  await expect(start).toHaveAttribute('aria-valuenow', '31')
  await start.press('ArrowRight')
  await expect(passageStart).toHaveAttribute('aria-valuenow', '32')
  await passageStart.press('Shift+ArrowLeft')
  await expect(start).toHaveAttribute('aria-valuenow', '31.8')
  await passageEnd.press('ArrowLeft')
  await expect(end).toHaveAttribute('aria-valuenow', '69')
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeCloseTo(20, 0)
  await page.keyboard.press('Escape')
  await expect(player.getByRole('dialog', { name: 'Highlight editor' })).toHaveCount(0)
  await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toBeFocused()
})

test('the upper passage grips drag either boundary and mirror the main timeline', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  await openHighlight(page)
  await setRange(page, 20, 60)
  const seek = page.getByRole('slider', { name: 'Passage position', exact: true })
  const upper = page.getByRole('slider', { name: 'Passage end', exact: true })
  const lower = page.getByRole('slider', { name: 'Highlight end', exact: true })
  const span = Number(await seek.getAttribute('max')) - Number(await seek.getAttribute('min'))
  const rail = await page.locator('.ec-passage-trim .ec-trim-rail').boundingBox()
  const box = await upper.boundingBox()
  const grip = await upper.locator('span').boundingBox()
  if (!box || !rail || !grip) throw Error('Missing passage trim surface')
  expect(box.width).toBeGreaterThanOrEqual(47)
  expect(grip.x - box.x).toBeGreaterThan(20)
  await page.mouse.move(grip.x + grip.width / 2 - 12, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    grip.x + grip.width / 2 - 12 - (5 / span) * rail.width,
    box.y + box.height / 2,
    {
      steps: 6,
    },
  )
  await page.mouse.up()
  await expect(upper).toHaveAttribute('aria-valuenow', '55')
  await expect(upper.locator('span')).toHaveCSS('background-color', 'rgb(253, 94, 224)')
  await expect(lower.locator('span')).toHaveCSS('background-color', 'rgb(253, 94, 224)')
  await expect(lower).toHaveAttribute('aria-valuenow', '55')
  await upper.press('Shift+ArrowRight')
  await expect(lower).toHaveAttribute('aria-valuenow', '55.2')
  const start = page.getByRole('slider', { name: 'Passage start', exact: true })
  await start.press('ArrowLeft')
  await expect(page.getByRole('slider', { name: 'Highlight start', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '19',
  )
  await lower.press('Home')
  for (const surface of ['', 'Passage ']) {
    const left = await page
      .getByRole('slider', { name: surface ? 'Passage start' : 'Highlight start', exact: true })
      .boundingBox()
    const right = await page
      .getByRole('slider', { name: surface ? 'Passage end' : 'Highlight end', exact: true })
      .boundingBox()
    expect(left!.x + left!.width).toBeLessThanOrEqual(right!.x + 0.1)
  }
})

test('double-clicking range ends seeks the start or final five seconds without starting paused video', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  await openHighlight(page)
  await setRange(page, 20, 60)
  const video = page.locator('video')
  for (const [name, seconds] of [
    ['Passage end', 55],
    ['Highlight start', 20],
  ] as const) {
    await page.getByRole('slider', { name, exact: true }).dblclick()
    await expect
      .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime))
      .toBeCloseTo(seconds, 1)
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true)
  }
  await setRange(page, 20, 22)
  await page.getByRole('slider', { name: 'Highlight end', exact: true }).dblclick()
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime))
    .toBeCloseTo(20, 1)
})

test('releasing an outward passage drag eases into its new zoom over about one second', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  await openHighlight(page)
  await setRange(page, 20, 60)
  const seek = page.getByRole('slider', { name: 'Passage position', exact: true })
  const before = Number(await seek.getAttribute('max'))
  const span = before - Number(await seek.getAttribute('min'))
  const ruler = page.locator('.ec-passage-trim .ec-time-ruler')
  await expect(ruler.locator('.ec-time-tick').first()).toBeAttached()
  const ticks = ruler.locator('.ec-time-tick')
  const timestamp = await ticks.nth(Math.floor((await ticks.count()) / 2)).getAttribute('data-time')
  const timeMark = ruler.locator(`[data-time="${timestamp}"]`)
  const markBefore = await timeMark.boundingBox()
  const rail = await page.locator('.ec-passage-trim .ec-trim-rail').boundingBox()
  const end = page.getByRole('slider', { name: 'Passage end', exact: true })
  const grip = await end.locator('span').boundingBox()
  if (!rail || !grip) throw Error('Missing passage grip')
  const x = grip.x + grip.width / 2,
    y = grip.y + grip.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + (3 / span) * rail.width, y, { steps: 6 })
  await expect(end).toHaveAttribute('aria-valuenow', '63')
  expect(Number(await seek.getAttribute('max'))).toBe(before)
  await page.mouse.up()
  await expect
    .poll(async () => Number(await seek.getAttribute('max')))
    .toBeGreaterThan(before + 0.1)
  expect(Number(await seek.getAttribute('max'))).toBeLessThan(68.16)
  await expect
    .poll(async () => Number(await seek.getAttribute('max')), { timeout: 2000 })
    .toBeCloseTo(68.16, 3)
  await expect(end).toHaveAttribute('aria-valuenow', '63')
  // A fixed timestamp reframes with the ruler, while the edit stays put.
  const markAfter = await timeMark.boundingBox()
  expect(Math.abs(markAfter!.x - markBefore!.x)).toBeGreaterThan(1)
})

test('passage playback follows the visible window including context outside the selection', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  await openHighlight(page)
  await setRange(page, 20, 21)
  const video = page.locator('video')
  const passage = page.getByRole('slider', { name: 'Passage position', exact: true })
  for (const position of [19.9, 20, 20.49, 21, 21.1]) {
    await video.evaluate((el, time) => {
      ;(el as HTMLVideoElement).currentTime = time
      el.dispatchEvent(new Event('timeupdate'))
    }, position)
    await expect
      .poll(() => passage.evaluate((el) => (el as HTMLInputElement).valueAsNumber))
      .toBeCloseTo(position, 6)
    await expect(passage).not.toHaveAttribute('data-outside')
    const alignment = await passage.evaluate((el) => {
      const input = el as HTMLInputElement
      const width = input.getBoundingClientRect().width
      const parent = document.createElement('div')
      parent.style.cssText = `position:fixed;width:${width}px;pointer-events:none`
      const probe = document.createElement('div')
      probe.style.width = getComputedStyle(input).getPropertyValue('--progress')
      parent.appendChild(probe)
      document.body.appendChild(parent)
      const fill = probe.getBoundingClientRect().width
      parent.remove()
      const fraction =
        (input.valueAsNumber - Number(input.min)) / (Number(input.max) - Number(input.min))
      return { fill, thumb: 5 + fraction * (width - 10) }
    })
    expect(Math.abs(alignment.fill - alignment.thumb)).toBeLessThan(0.1)
  }
  for (const [position, state] of [
    [17.9, 'before'],
    [23.1, 'after'],
  ] as const) {
    await video.evaluate((el, time) => {
      ;(el as HTMLVideoElement).currentTime = time
      el.dispatchEvent(new Event('timeupdate'))
    }, position)
    await expect(passage).toHaveAttribute('data-outside', state)
    const { data, info } = await sharp(await passage.screenshot())
      .raw()
      .toBuffer({ resolveWithObject: true })
    for (const fraction of [0.1, 0.5, 0.9]) {
      const i =
        (Math.floor(info.height / 2) * info.width + Math.floor(info.width * fraction)) *
        info.channels
      if (state === 'after') expect(data[i]).toBeGreaterThan(230)
      else expect(data[i]).toBeLessThan(180)
    }
  }
})

test('trim focus follows the grip and clears keyboard styling on pointer input', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  await openHighlight(page)
  await setRange(page, 20, 60)
  for (const surface of ['Passage', 'Highlight']) {
    const start = page.getByRole('slider', { name: `${surface} start`, exact: true })
    const end = page.getByRole('slider', { name: `${surface} end`, exact: true })
    const grip = start.locator('span')
    await start.press('ArrowRight')
    await start.click()
    await expect(start).toBeFocused()
    expect(await start.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none')
    expect(await grip.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none')
    expect(await grip.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none')
    const hit = await start.boundingBox()
    const visible = await grip.boundingBox()
    expect(hit!.width).toBeGreaterThan(visible!.width + 20)
    await page.mouse.move(visible!.x - 12, visible!.y + visible!.height / 2)
    await page.mouse.down()
    expect(await grip.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none')
    await page.mouse.up()
    expect(await grip.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none')
    await start.press('Tab')
    await expect(end).toBeFocused()
    expect(await end.locator('span').evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe(
      'none',
    )
    expect(await end.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none')
    expect(await end.locator('span').evaluate((el) => getComputedStyle(el).outlineColor)).toBe(
      'rgb(253, 94, 224)',
    )
    expect(await end.locator('span').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
      'solid',
    )
  }
})

test('a fast outward drag past the passage rail keeps its zoom until release', async ({ page }) => {
  await page.clock.install({ time: new Date('2020-01-01T00:00:00Z') })
  await page.goto('/electrocute/test-session-1')
  await openHighlight(page)
  await setRange(page, 20, 61)
  await page.clock.pauseAt(new Date('2020-01-01T00:01:00Z'))
  const seek = page.getByRole('slider', { name: 'Passage position', exact: true })
  const before = Number(await seek.getAttribute('max'))
  const end = page.getByRole('slider', { name: 'Passage end', exact: true })
  const rail = await page.locator('.ec-passage-trim .ec-trim-rail').boundingBox()
  const grip = await end.locator('span').boundingBox()
  if (!rail || !grip) throw Error('Missing passage grip')
  const y = grip.y + grip.height / 2
  await page.mouse.move(grip.x + grip.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(rail.x + rail.width + 40, y)
  const selectedEnd = Number(await end.getAttribute('aria-valuenow'))
  expect(selectedEnd).toBeGreaterThan(61)
  expect(Number(await seek.getAttribute('max'))).toBe(before)
  await page.mouse.up()
  expect(Number(await seek.getAttribute('max'))).toBe(before)
  await page.clock.runFor(100)
  const target = Math.min(96, selectedEnd + Math.max(2, (selectedEnd - 20) * 0.12))
  expect(Number(await seek.getAttribute('max'))).toBeGreaterThan(before)
  expect(Number(await seek.getAttribute('max'))).toBeLessThan(target)
  await page.clock.runFor(1000)
  await expect.poll(async () => Number(await seek.getAttribute('max'))).toBeCloseTo(target, 6)
  await expect(end).toHaveAttribute('aria-valuenow', String(selectedEnd))
})

test('keyboard trimming briefly reframes from the current zoom and respects reduced motion', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2020-01-01T00:00:00Z') })
  await page.goto('/electrocute/test-session-1')
  await openHighlight(page)
  await setRange(page, 20, 60)
  await page.clock.pauseAt(new Date('2020-01-01T00:01:00Z'))
  const seek = page.getByRole('slider', { name: 'Passage position', exact: true })
  const end = page.getByRole('slider', { name: 'Passage end', exact: true })
  const before = Number(await seek.getAttribute('max'))
  await end.press('ArrowRight')
  await expect(end).toHaveAttribute('aria-valuenow', '61')
  expect(Number(await seek.getAttribute('max'))).toBeCloseTo(before, 6)
  await page.clock.runFor(80)
  const midway = Number(await seek.getAttribute('max'))
  expect(midway).toBeGreaterThan(before)
  expect(midway).toBeLessThan(65.92)
  await end.press('ArrowRight')
  await expect(end).toHaveAttribute('aria-valuenow', '62')
  expect(Number(await seek.getAttribute('max'))).toBeCloseTo(midway, 6)
  await page.clock.runFor(300)
  await expect.poll(async () => Number(await seek.getAttribute('max'))).toBeCloseTo(67.04, 6)
  const lowerEnd = page.getByRole('slider', { name: 'Highlight end', exact: true })
  await lowerEnd.press('Shift+ArrowRight')
  await expect(end).toHaveAttribute('aria-valuenow', '62.2')
  expect(Number(await seek.getAttribute('max'))).toBeCloseTo(67.04, 6)
  await page.clock.runFor(300)
  await expect.poll(async () => Number(await seek.getAttribute('max'))).toBeCloseTo(67.264, 6)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await lowerEnd.press('ArrowRight')
  await expect(end).toHaveAttribute('aria-valuenow', '63.2')
  expect(Number(await seek.getAttribute('max'))).toBeCloseTo(68.384, 6)
})

test('the transport star uses the current playhead instead of the hovered time', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
  await expect(seek).toBeEnabled()
  await page.locator('video').evaluate((v) => {
    ;(v as HTMLVideoElement).currentTime = 20
  })
  await expect(seek).toHaveValue('20')
  const box = await seek.boundingBox()
  if (!box) throw Error('Missing playback bar')
  await page.mouse.move(box.x + 5 + 0.5 * (box.width - 10), box.y + box.height / 2)
  const popup = page.getByRole('dialog', { name: 'Playback tools' })
  await expect(popup).toContainText('0:48')
  const star = page.getByRole('button', { name: 'Highlight at playhead', exact: true })
  const starBox = await star.boundingBox()
  const volume = await page.locator('.ec-volume-control').boundingBox()
  expect(starBox!.x + starBox!.width).toBeLessThan(volume!.x)
  await star.click()
  await expect(page.getByRole('slider', { name: 'Highlight start', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '20',
  )
  await expect(star).toBeDisabled()
})

test('Space toggles video across the page and keeps text entry and buttons safe', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  const video = page.locator('video')
  await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toBeEnabled()
  await video.evaluate((video) => {
    ;(video as HTMLVideoElement).muted = true
  })
  await page.locator('body').evaluate((node) => {
    node.tabIndex = -1
    node.focus()
  })
  await page.keyboard.down('Space')
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(false)
  await page.keyboard.down('Space')
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(false)
  await page.keyboard.up('Space')
  await page.keyboard.press('Space')
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true)
  await openHighlight(page)
  const start = page.getByRole('slider', { name: 'Passage start', exact: true })
  const before = await start.getAttribute('aria-valuenow')
  await start.focus()
  await page.keyboard.press('Space')
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(false)
  await page.keyboard.press('Space')
  await expect(start).toHaveAttribute('aria-valuenow', before!)
  const name = page.getByRole('button', { name: 'Name highlight', exact: true })
  await name.focus()
  await page.keyboard.press('Space')
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(false)
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveCount(0)
  await page.keyboard.press('Space')
  await name.click()
  const title = page.getByRole('textbox', { name: 'Title', exact: true })
  await title.fill('Synthetic')
  await title.press('Space')
  await expect(title).toHaveValue('Synthetic ')
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true)
})

test('passage Play resumes a paused point inside the selection and restarts when playing or outside', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  await openHighlight(page)
  await setRange(page, 10, 20)
  const video = page.locator('video')
  const play = page.getByRole('button', { name: /^(Preview|Restart) passage$/ })
  await video.evaluate((video) => {
    const v = video as HTMLVideoElement
    v.muted = true
    v.pause()
    v.currentTime = 15
  })
  await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toHaveValue(
    '15',
  )
  await play.click()
  await expect(page.getByRole('button', { name: 'Restart passage', exact: true })).toBeVisible()
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime))
    .toBeGreaterThanOrEqual(15)
  await play.click()
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime))
    .toBeLessThan(11)
  await video.evaluate((video) => {
    const v = video as HTMLVideoElement
    v.pause()
    v.currentTime = 5
  })
  await play.click()
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime))
    .toBeGreaterThanOrEqual(10)
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime))
    .toBeLessThan(11)
  await video.evaluate((video) => {
    const v = video as HTMLVideoElement
    v.pause()
    v.currentTime = 20
  })
  await play.click()
  await expect
    .poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime))
    .toBeLessThan(11)
})

test('the star tooltip stays on one line for long session clocks', async ({ page }) => {
  await page.goto('/electrocute/test-session-1')
  const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
  await expect(seek).toBeEnabled()
  await page.locator('video').evaluate((video) => {
    Object.defineProperty(video, 'duration', { configurable: true, value: 12345 })
    video.dispatchEvent(new Event('loadedmetadata'))
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 10234 })
    video.dispatchEvent(new Event('timeupdate'))
  })
  await seek.focus()
  const popup = page.getByRole('dialog', { name: 'Playback tools' })
  await expect(popup).toContainText('2:50:34 / 3:25:45')
  const label = await popup.locator('.ec-time-label').boundingBox()
  const star = await popup.getByRole('button', { name: 'Set highlight', exact: true }).boundingBox()
  expect(Math.abs(label!.y + label!.height / 2 - star!.y - star!.height / 2)).toBeLessThan(1)
  expect(star!.x + star!.width).toBeLessThanOrEqual(label!.x)
})

test('main playback keeps running while trimming; passage preview starts over and seeks within its bounds', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  const video = page.locator('video')
  await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toBeEnabled()
  await video.evaluate(async (video) => {
    const v = video as HTMLVideoElement
    v.muted = true
    v.currentTime = 20
    await v.play()
  })
  await openHighlight(page)
  await expect.poll(() => video.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(false)
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeGreaterThan(20.2)
  const end = page.getByRole('slider', { name: 'Highlight end', exact: true })
  await end.press('ArrowLeft')
  await expect.poll(() => video.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(false)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await setRange(page, 10, 12)
  await page.getByRole('button', { name: /^(Preview|Restart) passage$/ }).click()
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeLessThan(11)
  const passage = page.getByRole('slider', { name: 'Passage position', exact: true })
  await passage.press('End')
  await expect.poll(() => video.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true)
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeCloseTo(12, 1)
  await page.getByRole('button', { name: /^(Preview|Restart) passage$/ }).click()
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeLessThan(11)
})

test('logged-out stars offer inline login and resume highlighting at the chosen time', async ({
  page,
}) => {
  let authenticated = false
  let submissions = 0
  const state = () => ({
    ready: true,
    csrfToken: 'synthetic-csrf',
    ...(authenticated ? { email: 'listener@example.org' } : {}),
  })
  await page.route('**/electrocute-api/test-session-1', (route) =>
    route.fulfill({ json: { ...state(), artist: false, highlights: [] } }),
  )
  await page.route('**/login', async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({
        json: state(),
        headers: { 'X-Hdm-Preview-Email': '/__preview/email' },
      })
    const form = await new Response(new Uint8Array(route.request().postDataBuffer()!), {
      headers: route.request().headers(),
    }).formData()
    expect(form.get('email')).toBe('listener@example.org')
    expect(form.get('_csrf')).toBe(submissions === 2 ? 'rotated-csrf' : 'synthetic-csrf')
    submissions++
    if (submissions === 1)
      return route.fulfill({
        status: 503,
        json: { type: 'error', message: 'Synthetic login failure.' },
      })
    if (submissions === 2)
      return route.fulfill({
        json: {
          type: 'success',
          nameRequired: true,
          message: 'Please enter your name.',
          csrfToken: 'rotated-csrf',
        },
      })
    expect(form.get('name')).toBe('Fixture listener')
    return route.fulfill({ json: { type: 'success', message: 'Synthetic confirmation sent.' } })
  })
  await page.goto('/fixture-public-highlights')
  const video = page.locator('video')
  const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
  const star = page.getByRole('button', { name: 'Highlight at playhead', exact: true })
  const login = page.getByRole('dialog', { name: 'Log in to set highlights' })
  await expect(seek).toBeEnabled()
  await expect(star).toBeVisible()
  const rail = (await seek.boundingBox())!
  await page.mouse.move(rail.x + 12, rail.y + rail.height / 2)
  await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
  await expect(login).toBeVisible()
  await login.getByRole('button', { name: 'Close login' }).click()
  await expect(login).toBeHidden()
  await video.evaluate((node) => {
    ;(node as HTMLVideoElement).currentTime = 20
  })
  await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).currentTime)).toBe(20)
  await star.click()
  const email = login.getByRole('textbox', { name: 'Email address' })
  await expect(email).toBeFocused()
  await email.fill('listener@example.org')
  await email.press('Space')
  expect(await video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(true)
  await email.fill('listener@example.org')
  await login.getByRole('button', { name: 'Get Login Link', exact: true }).click()
  await expect(login.getByRole('alert')).toContainText('Synthetic login failure.')
  await login.getByRole('button', { name: 'Get Login Link', exact: true }).click()
  await login.getByRole('textbox', { name: 'Name', exact: true }).fill('Fixture listener')
  await login.getByRole('button', { name: 'Get Login Link', exact: true }).click()
  await expect(login.getByRole('status')).toHaveText('Synthetic confirmation sent.')
  await expect(login.getByRole('link', { name: 'Open preview inbox' })).toHaveAttribute(
    'target',
    '_blank',
  )
  await video.evaluate((node) => {
    ;(node as HTMLVideoElement).currentTime = 50
  })
  authenticated = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(login).toBeHidden()
  await expect(page.getByRole('dialog', { name: 'Highlight editor' })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Highlight start', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '20',
  )
  expect(new URL(page.url()).pathname).toBe('/fixture-public-highlights')
})

test('inline login can retry unavailable session state and remains keyboard dismissible', async ({
  page,
}) => {
  let available = false
  await page.route('**/electrocute-api/test-session-1', (route) => route.fulfill({ status: 503 }))
  await page.route('**/login', (route) =>
    available
      ? route.fulfill({ json: { ready: true, csrfToken: 'synthetic-csrf' } })
      : route.fulfill({ status: 503 }),
  )
  await page.goto('/fixture-public-highlights')
  const star = page.getByRole('button', { name: 'Highlight at playhead', exact: true })
  await expect(star).toBeEnabled()
  await star.click()
  const login = page.getByRole('dialog', { name: 'Log in to set highlights' })
  await expect(login.getByRole('alert')).toContainText('temporarily unavailable')
  available = true
  await login.getByRole('button', { name: 'Retry login' }).click()
  await expect(login.getByRole('textbox', { name: 'Email address' })).toBeFocused()
  await expect(login.getByRole('link', { name: 'Open preview inbox' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(login).toBeHidden()
  await expect(star).toBeFocused()
})

test('public saving keeps the pending text flow while profile and management UI stay hidden', async ({
  page,
}) => {
  let state: HighlightState = {
    ready: true,
    artist: false,
    email: 'visitor@example.org',
    csrfToken: 'synthetic-csrf',
    suggestedAlias: 'Circle fixture alias',
    highlights: [],
  }
  let approved = false
  const savedIds: string[] = []
  await page.route('**/login', (route) => route.fulfill({ json: state }))
  await page.route('**/electrocute-api/test-session-1', async (route) => {
    if (route.request().method() === 'POST') {
      const form = await new Response(route.request().postData(), {
        headers: route.request().headers(),
      }).formData()
      expect(form.get('_csrf')).toBe('synthetic-csrf')
      const input = JSON.parse(String(form.get('payload')))
      expect(input).not.toHaveProperty('email')
      expect(input).not.toHaveProperty('artist')
      expect(input).not.toHaveProperty('duration')
      if (form.get('intent') === 'profile') {
        state = {
          ...state,
          alias: input.alias,
          highlights: state.highlights.map((item) => ({ ...item, person: input.alias })),
        }
        await route.fulfill({ json: state })
        return
      }
      expect(input).not.toHaveProperty('alias')
      const previous = state.highlights[0]
      const intent = form.get('intent')
      const highlight: RuntimeHighlight =
        intent === 'save'
          ? {
              ...previous,
              id: input.id,
              title: input.title,
              person: state.alias ?? 'Listener',
              start: input.start,
              end: input.end,
              revision: (previous?.revision ?? 0) + 1,
              status: approved ? 'approved' : 'pending',
              withdrawn: false,
              hidden: false,
              own: true,
              canEdit: true,
            }
          : { ...previous, revision: previous.revision + 1, withdrawn: intent === 'withdraw' }
      savedIds.push(input.id)
      state = {
        ...state,
        highlights: [highlight],
      }
    }
    await route.fulfill({ json: state, headers: { 'Cache-Control': 'no-store' } })
  })
  await page.goto('/fixture-public-highlights')
  await expect(page.getByRole('slider', { name: 'Playback position', exact: true })).toBeEnabled()
  await openHighlight(page)
  await expect(
    page.locator('.ec-player').getByRole('textbox', { name: /public|alias/i }),
  ).toHaveCount(0)
  expect(savedIds).toHaveLength(0)
  await page.getByRole('button', { name: 'Name highlight', exact: true }).click()
  expect(savedIds).toHaveLength(0)
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Synthetic public passage')
  await page.getByRole('button', { name: 'Save highlight', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Saved privately')
  await expect(page.getByRole('region', { name: 'Unpublished highlights' })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Public name', exact: true })).toHaveCount(0)
  expect(savedIds).toHaveLength(1)
  expect(state.highlights[0].status).toBe('pending')
})

test('a public runtime highlight link overrides saved progress after its asynchronous load', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'hannesdiem.electrocute.progress.v1',
      JSON.stringify({ positions: { 'test-session-1': 70 } }),
    ),
  )
  const state = {
    ready: true,
    artist: false,
    csrfToken: 'synthetic-csrf',
    highlights: [
      {
        id: 'runtime-fixture',
        title: 'Runtime fixture',
        person: 'Public fixture',
        start: 20,
        end: 40,
        revision: 1,
        status: 'approved',
        own: false,
        canEdit: false,
        hidden: false,
        withdrawn: false,
      },
    ],
  }
  await page.route('**/login', (route) =>
    route.fulfill({ json: { ready: true, csrfToken: 'synthetic-csrf' } }),
  )
  await page.route('**/electrocute-api/test-session-1', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    await route.fulfill({ json: state })
  })
  await page.goto('/fixture-public-highlights?highlight=runtime-fixture')
  await expect(page.getByRole('link', { name: 'Log in to set highlights' })).toHaveCount(0)
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeCloseTo(20, 0)
  await expect(page.getByRole('status')).toBeEmpty()
  await expect(page.getByRole('button', { name: 'Edit highlight' })).toHaveCount(0)
  await page.locator('video').evaluate((video) => {
    ;(video as HTMLVideoElement).currentTime = 35
  })
  const refreshed = page.waitForResponse('**/electrocute-api/test-session-1')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await refreshed
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeCloseTo(35, 0)
})

test.describe('mobile player', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('the viewport player and editor work without surrounding UI, hover or horizontal overflow', async ({
    page,
  }) => {
    await page.goto('/electrocute/test-session-1')
    await expect(page.getByRole('complementary', { name: 'Highlights' })).toHaveCount(0)
    const highlight = page.getByRole('button', { name: /Test highlight C, 1:10 to 1:30/ })
    await highlight.tap()
    await expect
      .poll(() =>
        page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime),
      )
      .toBeGreaterThanOrEqual(70)
    const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
    const clock = page.getByRole('dialog', { name: 'Playback tools' })
    await expect(clock).toBeHidden()
    await seek.tap({ position: { x: 15, y: 9 } })
    await expect(clock).toBeVisible()
    await page.locator('.ec-video-tap').tap({ position: { x: 20, y: 20 } })
    await expect(clock).toBeHidden()
    await highlight.tap()
    await openHighlight(page, true)
    await expect(page.getByRole('slider', { name: 'Highlight start', exact: true })).toBeFocused()
    const end = page.getByRole('slider', { name: 'Passage end', exact: true })
    const box = await end.boundingBox()
    const rail = await page.locator('.ec-passage-trim .ec-trim-rail').boundingBox()
    const passage = page.getByRole('slider', { name: 'Passage position', exact: true })
    const span =
      Number(await passage.getAttribute('max')) - Number(await passage.getAttribute('min'))
    if (!box || !rail) throw new Error('Missing touch trim controls')
    const touch = await page.context().newCDPSession(page)
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let step = 1; step <= 6; step++) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - ((10 / span) * rail.width * step) / 6, y }],
      })
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(end).toHaveAttribute('aria-valuenow', '86')
    await end.tap()
    await page.locator('video').evaluate((v) => (v as HTMLVideoElement).pause())
    await end.press('ArrowLeft')
    await expect(page.getByRole('slider', { name: 'Highlight end', exact: true })).toHaveAttribute(
      'aria-valuenow',
      '85',
    )
    await end.tap()
    await end.tap()
    await expect
      .poll(() => page.locator('video').evaluate((v) => (v as HTMLVideoElement).currentTime))
      .toBeCloseTo(80, 1)
    await expect
      .poll(() => page.locator('video').evaluate((v) => (v as HTMLVideoElement).paused))
      .toBe(true)
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toHaveCount(0)
    await page
      .getByRole('slider', { name: 'Playback position', exact: true })
      .tap({ position: { x: 6, y: 22 } })
    await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeVisible()

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
  })
})
