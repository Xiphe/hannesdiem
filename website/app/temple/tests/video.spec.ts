import { expect, test } from '@playwright/test'

test.use({ locale: 'en-US', timezoneId: 'Europe/Berlin' })

const sdkURL = 'https://embed.cloudflarestream.com/embed/sdk.latest.js'
const fixturePlayer = `<!doctype html><title>Stream fixture</title>
  <button style="position:absolute;left:40%;top:48%" onclick="parent.postMessage({fixtureMediaEvent:'playing'}, '*')">Play fixture</button>
  <button style="position:absolute;left:8px;bottom:8px" onclick="parent.postMessage({fixtureMediaEvent:'pause'}, '*')">Pause fixture</button>
  <button style="position:absolute;right:8px;bottom:8px" onclick="parent.postMessage({fixtureMediaEvent:'ended'}, '*')">End fixture</button>`

test.beforeEach(async ({ context }) => {
  await context.route(sdkURL, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.fixtureStreamConnections = 0;
      window.Stream = iframe => {
        window.fixtureStreamConnections++;
        const events = new EventTarget();
        const receive = event => {
          if (event.source === iframe.contentWindow && event.data.fixtureMediaEvent)
            events.dispatchEvent(new Event(event.data.fixtureMediaEvent));
        };
        window.addEventListener('message', receive);
        return {
          addEventListener: (name, listener) => events.addEventListener(name, listener),
          removeEventListener: (name, listener) => events.removeEventListener(name, listener),
          destroy: () => {
            window.removeEventListener('message', receive);
            window.fixtureStreamConnections--;
          }
        };
      };`,
    }),
  )
  await context.route('https://customer-fixture.cloudflarestream.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: fixturePlayer,
    }),
  )
})

for (const width of [390, 900, 1440]) {
  test(`recordings retain rich text and direct links after hydration at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/temple-video#fixture-recording')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const recording = page.getByRole('region', { name: 'Synthetic recording' })
    await expect(recording).toBeVisible()
    await expect(recording.locator('time')).toHaveText('April 7, 2025 at 7:30 PM')
    await expect(recording.locator('time')).toHaveAttribute('datetime', '2025-04-07T19:30:00+02:00')
    await expect(recording.locator('strong')).toHaveText('independent')
    await expect(recording.locator('em')).toHaveText('formatted')
    await expect(recording.getByRole('link', { name: 'Fixture reference' })).toHaveAttribute(
      'href',
      'https://example.org/recording',
    )
    await expect(recording.getByRole('listitem')).toHaveText('First fixture detail')
    expect(
      await recording.evaluate((node) => ({
        before: node.previousElementSibling?.id,
        afterAction: node.nextElementSibling?.classList.contains('fact-followup-action'),
      })),
    ).toEqual({ before: 'fixture-watch', afterAction: true })
    const iframe = recording.locator('iframe')
    await expect(iframe).toHaveAttribute('title', 'Synthetic recording')
    await expect(iframe).toHaveAttribute('loading', 'lazy')
    await expect(iframe).toHaveAttribute('src', /\/iframe\?preload=none$/)
    const box = (await iframe.boundingBox())!
    expect(box.width / box.height).toBeCloseTo(9 / 16, 2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const top = (await recording.boundingBox())!.y
    const navigation = (await page.locator('.temple-top-navigation').boundingBox())!
    expect(top).toBeGreaterThanOrEqual(navigation.y + navigation.height + 8)
    expect(top).toBeLessThanOrEqual(130)
    await recording.getByRole('link', { name: 'Synthetic recording', exact: true }).click()
    await expect(page).toHaveURL(/#fixture-recording$/)
    await page.reload()
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await expect(recording).toBeVisible()
    const restoredNavigation = (await page.locator('.temple-top-navigation').boundingBox())!
    expect((await recording.boundingBox())!.y).toBeGreaterThanOrEqual(
      restoredNavigation.y + restoredNavigation.height + 8,
    )
    expect((await recording.boundingBox())!.y).toBeLessThanOrEqual(130)
    expect(errors).toEqual([])
  })
}

for (const width of [390, 1440]) {
  test(`the title screen clears playback and releases the player at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-video#fixture-recording')
    await expect.poll(() => page.evaluate(() => (window as any).fixtureStreamConnections)).toBe(1)
    const recording = page.getByRole('region', { name: 'Synthetic recording' })
    const title = recording.getByRole('heading', { name: 'Synthetic recording' })
    const date = recording.locator('time')
    const frame = recording.frameLocator('iframe')
    const playerBox = (await recording.locator('iframe').boundingBox())!
    const titleBox = (await recording.locator('.temple-video-title-screen').boundingBox())!
    expect(titleBox.y).toBeGreaterThanOrEqual(playerBox.y)
    expect(titleBox.y + titleBox.height).toBeLessThan(playerBox.y + playerBox.height / 2)
    await frame.getByRole('button', { name: 'Play fixture' }).click()
    await expect(title).not.toBeVisible()
    await expect(date).toBeVisible()
    await frame.getByRole('button', { name: 'Pause fixture' }).click()
    await expect(title).toBeVisible()
    await expect(date).toBeVisible()
    await frame.getByRole('button', { name: 'Play fixture' }).click()
    await expect(title).not.toBeVisible()
    await frame.getByRole('button', { name: 'End fixture' }).click()
    await expect(title).toBeVisible()
    await page.getByRole('link', { name: 'Return to fixture' }).click()
    await expect(page).toHaveURL('/fixture')
    await expect.poll(() => page.evaluate(() => (window as any).fixtureStreamConnections)).toBe(0)
  })
}

test('the title screen leaves the iframe usable when the player API is unavailable', async ({
  page,
  context,
}) => {
  await context.route(sdkURL, (route) => route.abort())
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/temple-video#fixture-recording')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  const recording = page.getByRole('region', { name: 'Synthetic recording' })
  await recording.frameLocator('iframe').getByRole('button', { name: 'Play fixture' }).click()
  await expect(recording.getByRole('heading', { name: 'Synthetic recording' })).toBeVisible()
  expect(errors).toEqual([])
})

test('recordings and their rich-text descriptions work without site JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    await context.route('https://customer-fixture.cloudflarestream.com/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Stream fixture</title>',
      }),
    )
    const page = await context.newPage()
    await page.goto('/temple-video#fixture-recording')
    const recording = page.getByRole('region', { name: 'Synthetic recording' })
    await expect(recording).toBeVisible()
    await expect(recording.locator('strong')).toHaveText('independent')
    await expect(recording.locator('time')).toHaveText('April 7, 2025 at 7:30 PM')
    await expect(
      recording.getByRole('link', { name: 'Synthetic recording', exact: true }),
    ).toHaveAttribute('href', '#fixture-recording')
    await expect(recording.locator('iframe')).toHaveAttribute('title', 'Synthetic recording')
  } finally {
    await context.close()
  }
})

for (const width of [390, 900, 1440]) {
  test(`recordings scroll horizontally from the newest video at ${width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-recordings')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const feed = page.getByRole('region', { name: 'Videos', exact: true })
    await feed.scrollIntoViewIfNeeded()
    await expect(feed.locator('h2')).toHaveText([
      'Synthetic latest',
      'Synthetic middle',
      'Synthetic oldest',
    ])
    await expect(feed.locator('strong')).toHaveText(['independent', 'independent', 'independent'])
    expect(await feed.evaluate((node) => node.scrollLeft)).toBe(0)
    const geometry = await feed.evaluate((node) => ({
      height: node.clientHeight,
      contentHeight: node.scrollHeight,
      width: node.clientWidth,
      contentWidth: node.scrollWidth,
      latestRight: node.querySelector('.temple-video')!.getBoundingClientRect().right,
      cardWidth: node.querySelector('.temple-video')!.getBoundingClientRect().width,
      right: node.getBoundingClientRect().right,
      visibleCards: [...node.querySelectorAll('.temple-video')].filter((card) => {
        const bounds = card.getBoundingClientRect()
        const feed = node.getBoundingClientRect()
        return bounds.left >= feed.left - 1 && bounds.right <= feed.right + 1
      }).length,
      snap: getComputedStyle(node).scrollSnapType,
      actionAfter: node.nextElementSibling?.classList.contains('fact-followup-action'),
    }))
    expect(geometry.contentHeight).toBeLessThanOrEqual(geometry.height)
    expect(geometry.contentWidth).toBeGreaterThanOrEqual(geometry.width)
    expect(geometry.width).toBe(width)
    expect(geometry.height).toBe(900)
    expect(geometry.latestRight).toBeCloseTo(geometry.right, 0)
    expect(geometry.visibleCards).toBe(width === 390 ? 1 : width === 900 ? 2 : 3)
    expect(geometry.snap).toBe('x mandatory')
    expect(geometry.actionAfter).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const overflow = geometry.contentWidth - geometry.width
    if (overflow > 0) {
      await feed.focus()
      await page.keyboard.press('ArrowLeft')
      await expect
        .poll(() => feed.evaluate((node) => node.scrollLeft))
        .toBeLessThan(-Math.min(geometry.cardWidth, overflow) + 1)
      await expect(
        feed.frameLocator('iframe').nth(1).getByRole('button', { name: 'Play fixture' }),
      ).toBeVisible()
      await feed.hover()
      await page.mouse.wheel(-width, 0)
      await expect.poll(() => feed.evaluate((node) => node.scrollLeft)).toBeLessThan(-overflow + 1)
    }
    // A fresh visit starts at the newest entry again.
    await page.reload()
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    expect(await feed.evaluate((node) => node.scrollLeft)).toBe(0)
    expect(errors).toEqual([])
  })

  test(`older recording permalinks restore both scroll positions at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-recordings#fixture-oldest')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const feed = page.getByRole('region', { name: 'Videos', exact: true })
    const recording = page.getByRole('region', { name: 'Synthetic oldest' })
    await expect(recording.getByRole('heading')).toBeInViewport()
    expect(await feed.evaluate((node) => node.scrollLeft)).toBeLessThanOrEqual(0)
    const navigation = (await page.locator('.temple-top-navigation').boundingBox())!
    expect(
      (await recording.locator('.temple-video-player').boundingBox())!.y,
    ).toBeGreaterThanOrEqual(navigation.y + navigation.height + 8)
    await recording.getByRole('link', { name: 'Synthetic oldest', exact: true }).click()
    await expect(page).toHaveURL(/#fixture-oldest$/)
    await page.reload()
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    await expect(recording.getByRole('heading')).toBeInViewport()
  })
}

test('the recordings feed sorts and scrolls without site JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
    viewport: { width: 390, height: 900 },
  })
  try {
    await context.route('https://customer-fixture.cloudflarestream.com/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Stream fixture</title>',
      }),
    )
    const page = await context.newPage()
    await page.goto('/temple-recordings#fixture-middle')
    const feed = page.getByRole('region', { name: 'Videos', exact: true })
    await expect(feed.locator('h2')).toHaveText([
      'Synthetic latest',
      'Synthetic middle',
      'Synthetic oldest',
    ])
    await expect(page.getByRole('heading', { name: 'Synthetic middle' })).toBeInViewport()
    await expect(feed.locator('strong')).toHaveText(['independent', 'independent', 'independent'])
    expect(await feed.evaluate((node) => node.scrollLeft)).toBeLessThan(0)
  } finally {
    await context.close()
  }
})

for (const scenario of [
  {
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    release: '1. Januar 2020',
    start: 'Januar',
    end: 'Februar 2030',
    posting: '7. April 2025 um 19:30',
  },
  {
    locale: 'en-US',
    timezoneId: 'Pacific/Honolulu',
    release: 'January 1, 2020',
    start: 'January',
    end: 'February 2030',
    posting: 'April 7, 2025 at 7:30 AM',
  },
  {
    locale: 'en-US',
    timezoneId: 'Pacific/Kiritimati',
    release: 'January 1, 2020',
    start: 'January',
    end: 'February 2030',
    posting: 'April 8, 2025 at 7:30 AM',
  },
]) {
  test.describe(`shared dates in ${scenario.locale}, ${scenario.timezoneId}`, () => {
    test.use({ locale: scenario.locale, timezoneId: scenario.timezoneId })

    test('localizes release and Temple dates, converting only posting timestamps', async ({
      page,
    }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto('/fixture-release')
      await expect(page.locator('time[datetime="2020-01-01"]')).toHaveText(scenario.release)
      await page.goto('/temple-video#fixture-recording')
      await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
      for (const selector of ['.temple-date', '.temple-nav-date']) {
        const dates = page.locator(selector).locator('time')
        await expect(dates.first()).toHaveText(scenario.start)
        await expect(dates.last()).toHaveText(scenario.end)
      }
      const posted = page.locator('.temple-video time')
      await expect(posted).toHaveText(scenario.posting)
      await expect(posted).toHaveAttribute('datetime', '2025-04-07T19:30:00+02:00')
      expect(errors).toEqual([])
    })
  })
}
