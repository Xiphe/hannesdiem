import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { HighlightState, RuntimeHighlight } from '../app/electrocute/contract.ts'

async function openHighlight(page: Page, touch = false) {
  const seek = page.getByRole('slider', { name: 'Playback position', exact: true })
  await expect(seek).toBeEnabled()
  await seek.focus()
  if (touch) await page.getByRole('button', { name: 'Set highlight', exact: true }).tap()
  else await page.getByRole('button', { name: 'Set highlight', exact: true }).click()
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
  const draft = page.locator('.ec-highlight').filter({ hasText: 'Synthetic saved passage' })
  await expect(draft).toContainText('You')
  await draft.getByRole('button', { name: 'Edit draft' }).click()
  await page.getByRole('button', { name: 'Name highlight', exact: true }).click()
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
  expect(Math.abs(popup!.x - row!.x)).toBeLessThan(1)
  expect(Math.abs(popup!.width - row!.width)).toBeLessThan(1)
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
  await editor.getByRole('button', { name: 'Back to selection', exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Passage start', exact: true })).toBeFocused()
  await expect(editor.getByRole('slider', { name: 'Passage position' })).toBeVisible()
  await editor.getByRole('button', { name: 'Name highlight', exact: true }).click()
  await expect(title).toHaveValue('Synthetic title kept while trimming')
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(editor).toHaveCount(0)
  await expect(seek).toBeFocused()
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
  await page.getByRole('link', { name: 'All sessions', exact: true }).focus()
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
  const privateList = page.getByRole('region', { name: 'Unpublished highlights' })
  await expect(privateList).toContainText('Text check pending')
  await expect(privateList.getByRole('button', { name: 'Share' })).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('Saved privately')
  await privateList.getByRole('button', { name: 'Edit highlight' }).click()
  approved = true
  await page.getByRole('button', { name: 'Name highlight', exact: true }).click()
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
