import { expect, test } from '@playwright/test'
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

test('range editing validates bounds, previews the passage and persists only a local draft', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  const video = page.locator('video')
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeEnabled()
  await video.evaluate((video) => {
    ;(video as HTMLVideoElement).currentTime = 20
  })
  await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Start time' })).toHaveValue('0:20')
  await expect(page.getByRole('textbox', { name: 'End time' })).toHaveValue('1:20')
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Synthetic saved passage')
  await page.getByRole('textbox', { name: 'End time' }).fill('0:10')
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled()
  await page.getByRole('textbox', { name: 'Start time' }).fill('0:10')
  await page.getByRole('textbox', { name: 'End time' }).fill('0:12')
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

test('trimming happens inside the player with draggable edges, a movable passage and keyboard precision', async ({
  page,
}) => {
  await page.goto('/electrocute/test-session-1')
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeEnabled()
  await page.locator('video').evaluate((video) => {
    ;(video as HTMLVideoElement).currentTime = 20
  })
  await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
  const player = page.locator('.ec-player')
  await expect(player.getByRole('region', { name: 'Highlight editor' })).toBeVisible()
  await expect(player.locator('video')).not.toHaveAttribute('controls')
  const rail = await player.locator('.ec-trim-rail').boundingBox()
  if (!rail) throw new Error('Missing trim timeline')
  const start = player.getByRole('slider', { name: 'Highlight start', exact: true })
  const end = player.getByRole('slider', { name: 'Highlight end', exact: true })
  const move = player.getByRole('slider', { name: 'Move highlight', exact: true })
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
  await expect(end).toHaveAttribute('aria-valuenow', '80')
  await drag(end, -10)
  await expect(end).toHaveAttribute('aria-valuenow', '70')
  await drag(move, 10)
  await expect(start).toHaveAttribute('aria-valuenow', '40')
  await expect(end).toHaveAttribute('aria-valuenow', '80')
  await start.focus()
  await page.keyboard.press('ArrowRight')
  await expect(start).toHaveAttribute('aria-valuenow', '41')
  await page.keyboard.press('Shift+ArrowLeft')
  await expect(start).toHaveAttribute('aria-valuenow', '31')
  await page.keyboard.press('End')
  await expect(start).toHaveAttribute('aria-valuenow', '79')
  await expect(end).toHaveAttribute('aria-valuenow', '80')
  await page.getByRole('button', { name: 'Zoom in timeline' }).click()
  await expect(player.locator('.ec-trim-selection')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(player.getByRole('region', { name: 'Highlight editor' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeFocused()
})

test('public editor confirms a Circle alias, handles pending text, and supports withdrawal and restoration', async ({
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
      const previous = state.highlights[0]
      const intent = form.get('intent')
      const highlight: RuntimeHighlight =
        intent === 'save'
          ? {
              ...previous,
              id: input.id,
              title: input.title,
              person: input.alias,
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
        alias: approved ? (input.alias ?? state.alias) : undefined,
      }
    }
    await route.fulfill({ json: state, headers: { 'Cache-Control': 'no-store' } })
  })
  await page.goto('/fixture-public-highlights')
  await expect(page.getByRole('button', { name: 'Set highlight', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Name or alias (public)' })).toHaveValue(
    'Circle fixture alias',
  )
  expect(savedIds, 'suggestion alone never publishes a profile or highlight').toHaveLength(0)
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Synthetic public passage')
  await page.getByRole('textbox', { name: 'End time' }).fill('0:40')
  await page.getByRole('button', { name: 'Save highlight', exact: true }).click()
  const privateList = page.getByRole('region', { name: 'Unpublished highlights' })
  await expect(privateList).toContainText('Text check pending')
  await expect(privateList.getByRole('button', { name: 'Share' })).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('Saved privately')
  await privateList.getByRole('button', { name: 'Edit highlight' }).click()
  await page.getByRole('textbox', { name: 'Name or alias (public)' }).fill('Confirmed fixture')
  approved = true
  await page.getByRole('button', { name: 'Save highlight', exact: true }).click()
  await expect(privateList).toHaveCount(0)
  const clip = page.locator('.ec-highlight').filter({ hasText: 'Synthetic public passage' })
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
    await expect(page.getByRole('textbox', { name: 'End time' })).toHaveValue('1:26')
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
  })
})
