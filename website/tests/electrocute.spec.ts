import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { HighlightState, RuntimeHighlight } from '../app/electrocute/contract.ts'

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
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeEnabled()
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
    await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeEnabled()
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
}

test('range editing clamps bounds, previews the passage and persists only a local draft', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  const video = page.locator('video')
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeEnabled()
  await video.evaluate((video) => {
    ;(video as HTMLVideoElement).currentTime = 20
  })
  await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
  const start = page.getByRole('slider', { name: 'Highlight start', exact: true })
  const end = page.getByRole('slider', { name: 'Highlight end', exact: true })
  await expect(start).toHaveAttribute('aria-valuenow', '20')
  await expect(end).toHaveAttribute('aria-valuenow', '80')
  await start.press('End')
  await start.press('ArrowRight')
  expect(Number(await start.getAttribute('aria-valuenow'))).toBeLessThan(80)
  await setRange(page, 10, 12)
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Synthetic saved passage')
  await page.getByRole('button', { name: 'Preview passage', exact: true }).click()
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).paused), { timeout: 8000 })
    .toBe(true)
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeCloseTo(12, 0)
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Draft saved on this device.')
  await page.reload()
  const draft = page.locator('.ec-highlight').filter({ hasText: 'Synthetic saved passage' })
  await expect(draft).toContainText('You')
  await draft.getByRole('button', { name: 'Edit draft' }).click()
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
    'Synthetic saved passage',
  )
  await expect(start).toHaveAttribute('aria-valuenow', '10')
  await expect(end).toHaveAttribute('aria-valuenow', '12')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await draft.getByRole('button', { name: 'Remove draft' }).click()
  await expect(draft).toHaveCount(0)
  await page.getByRole('link', { name: /Test highlight B/ }).click()
  await video.evaluate((video) => {
    ;(video as HTMLVideoElement).currentTime = 59
  })
  await expect.poll(() => video.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(false)
})

test('the inline transport plays, seeks, controls sound and opens timeline highlights', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled()
  const set = await page.getByRole('button', { name: 'Set highlight', exact: true }).boundingBox()
  const sound = await page.getByRole('button', { name: 'Mute sound', exact: true }).boundingBox()
  expect(set!.x + set!.width).toBeLessThanOrEqual(sound!.x)
  expect(Math.abs(set!.y + set!.height / 2 - sound!.y - sound!.height / 2)).toBeLessThan(1)
  const stage = await page.locator('.ec-stage').boundingBox()
  const fullscreen = await page
    .getByRole('button', { name: 'Enter fullscreen', exact: true })
    .boundingBox()
  expect(fullscreen!.y - stage!.y).toBeLessThanOrEqual(16)
  expect(stage!.x + stage!.width - fullscreen!.x - fullscreen!.width).toBeLessThanOrEqual(16)
  await page.locator('.ec-volume-control').hover()
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
  await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
  await expect(
    page.locator('.ec-player').getByRole('region', { name: 'Highlight editor' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click()
})

test('failed device storage keeps the unsaved form available', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage unavailable', 'SecurityError')
    }
  })
  await page.goto('/electrocute/test-session-1')
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Unsaved test passage')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Highlight editor' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Could not save')
})

test('main playback bar owns trimming with selected edges, second and frame controls', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeEnabled()
  await page.locator('video').evaluate((video) => {
    ;(video as HTMLVideoElement).currentTime = 20
  })
  await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
  const player = page.locator('.ec-player')
  await expect(player.locator('.ec-seek-wrap .ec-trim-rail')).toHaveCount(1)
  await expect(
    player.getByRole('region', { name: 'Highlight editor' }).getByRole('slider'),
  ).toHaveCount(1)
  await expect(
    player.getByRole('region', { name: 'Highlight editor' }).locator('.ec-trim-edge'),
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toHaveCount(0)
  const rail = await player.locator('.ec-trim-rail').boundingBox()
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
  const selection = await player.locator('.ec-trim-selection').boundingBox()
  const playback = await page
    .getByRole('slider', { name: 'Playback position', exact: true })
    .boundingBox()
  expect(
    Math.abs(selection!.y + selection!.height - playback!.y - playback!.height / 2),
  ).toBeLessThan(1)
  const controls = player.locator('.ec-trim-adjust')
  await expect(controls.getByRole('button')).toHaveText(['<', '>'])
  const popup = await controls.boundingBox()
  const selected = await start.boundingBox()
  expect(Math.abs(popup!.x + popup!.width / 2 - selected!.x - selected!.width)).toBeLessThan(1)
  await expect(
    player.locator('.ec-highlight-action').getByRole('region', { name: 'Highlight editor' }),
  ).toBeVisible()
  await expect(player.locator('.ec-passage-times')).toHaveCount(0)
  const form = await player.getByRole('form', { name: 'Save highlight' }).boundingBox()
  const play = await page.getByRole('button', { name: 'Play', exact: true }).boundingBox()
  const sound = await page.getByRole('button', { name: 'Mute sound', exact: true }).boundingBox()
  expect(form!.x).toBeGreaterThan(play!.x + play!.width)
  expect(form!.x + form!.width).toBeLessThanOrEqual(sound!.x)
  expect(Math.abs(form!.y + form!.height / 2 - sound!.y - sound!.height / 2)).toBeLessThan(1)
  await page.getByRole('button', { name: 'Increase highlight start by one second' }).click()
  await expect(start).toHaveAttribute('aria-valuenow', '31')
  await start.press('ArrowRight')
  await expect(start).toHaveAttribute('aria-valuenow', '32')
  await start.press('Shift+ArrowLeft')
  await expect(start).toHaveAttribute('aria-valuenow', '31.8')
  await end.click()
  await page.getByRole('button', { name: 'Decrease highlight end by one second' }).click()
  await expect(end).toHaveAttribute('aria-valuenow', '69')
  await expect
    .poll(() => page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeCloseTo(20, 0)
  await page.keyboard.press('Escape')
  await expect(player.getByRole('region', { name: 'Highlight editor' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeFocused()
})

test('main playback keeps running while trimming; passage preview starts over and seeks within its bounds', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  const video = page.locator('video')
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeEnabled()
  await video.evaluate(async (video) => {
    const v = video as HTMLVideoElement
    v.muted = true
    v.currentTime = 20
    await v.play()
  })
  await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
  await expect.poll(() => video.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(false)
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeGreaterThan(20.2)
  const end = page.getByRole('slider', { name: 'Highlight end', exact: true })
  await end.press('ArrowLeft')
  await expect.poll(() => video.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(false)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await setRange(page, 10, 12)
  await page.getByRole('button', { name: 'Preview passage', exact: true }).click()
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeLessThan(11)
  const passage = page.getByRole('slider', { name: 'Passage position', exact: true })
  await passage.press('End')
  await expect.poll(() => video.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true)
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeCloseTo(12, 1)
  await page.getByRole('button', { name: 'Preview passage', exact: true }).click()
  await expect
    .poll(() => video.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeLessThan(11)
})

test('public editor uses a separate profile, handles pending text, withdrawal and restoration', async ({
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
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
  await expect(
    page.locator('.ec-player').getByRole('textbox', { name: /public|alias/i }),
  ).toHaveCount(0)
  expect(savedIds).toHaveLength(0)
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Synthetic public passage')
  await page.getByRole('button', { name: 'Save highlight', exact: true }).click()
  const privateList = page.getByRole('region', { name: 'Unpublished highlights' })
  await expect(privateList).toContainText('Text check pending')
  await expect(privateList.getByRole('button', { name: 'Share' })).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('Saved privately')
  await privateList.getByRole('button', { name: 'Edit highlight' }).click()
  approved = true
  await page.getByRole('button', { name: 'Save highlight', exact: true }).click()
  await expect(privateList).toHaveCount(0)
  const clip = page.locator('.ec-highlight').filter({ hasText: 'Synthetic public passage' })
  await expect(clip).toContainText('Listener')
  await page.getByText('Public profile', { exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Public name', exact: true })).toHaveValue(
    'Circle fixture alias',
  )
  await page.getByRole('textbox', { name: 'Public name', exact: true }).fill('Confirmed fixture')
  await page.getByRole('button', { name: 'Update public name', exact: true }).click()
  await expect(clip).toContainText('Confirmed fixture')
  await expect(clip.getByRole('button', { name: 'Share' })).toBeVisible()
  expect(savedIds[0], 'edits preserve the stable link').toBe(savedIds[1])
  await clip.getByRole('button', { name: 'Withdraw', exact: true }).click()
  await expect(privateList).toContainText('Withdrawn')
  await privateList.getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(privateList).toHaveCount(0)
  await expect(clip).toBeVisible()
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
  await expect(page.getByRole('link', { name: 'Log in to set highlights' })).toBeVisible()
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
  test('highlight list and editor work without thumbnails, hover or horizontal overflow', async ({
    page,
  }) => {
    await page.goto('/electrocute/test-session-1')
    const list = page.getByRole('complementary', { name: 'Highlights' })
    await expect(list.locator('img')).toHaveCount(0)
    await list.getByRole('link', { name: /Test highlight C/ }).tap()
    await expect
      .poll(() =>
        page.locator('video').evaluate((video) => (video as HTMLVideoElement).currentTime),
      )
      .toBeGreaterThanOrEqual(70)
    await page.getByRole('button', { name: 'Set highlight', exact: true }).tap()
    await expect(page.getByRole('slider', { name: 'Highlight start', exact: true })).toBeFocused()
    const end = page.getByRole('slider', { name: 'Highlight end', exact: true })
    const box = await end.boundingBox()
    const rail = await page.locator('.ec-trim-rail').boundingBox()
    if (!box || !rail) throw new Error('Missing touch trim controls')
    const touch = await page.context().newCDPSession(page)
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let step = 1; step <= 6; step++) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - ((10 / 96) * rail.width * step) / 6, y }],
      })
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(end).toHaveAttribute('aria-valuenow', '86')
    await end.tap()
    const minus = page.getByRole('button', { name: 'Decrease highlight end by one second' })
    const target = await minus.boundingBox()
    expect(target!.width).toBeGreaterThanOrEqual(44)
    expect(target!.height).toBeGreaterThanOrEqual(44)
    await minus.tap()
    await expect(end).toHaveAttribute('aria-valuenow', '85')
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
  })
})
