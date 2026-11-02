import { expect, test } from '@playwright/test'

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
        after: node.nextElementSibling?.id,
      })),
    ).toEqual({ before: 'fixture-watch', after: 'verse-fixture-pair-2' })
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
    const frame = recording.frameLocator('iframe')
    const playerBox = (await recording.locator('iframe').boundingBox())!
    const titleBox = (await title.boundingBox())!
    expect(titleBox.y).toBeGreaterThanOrEqual(playerBox.y)
    expect(titleBox.y + titleBox.height).toBeLessThan(playerBox.y + playerBox.height / 2)
    await frame.getByRole('button', { name: 'Play fixture' }).click()
    await expect(title).not.toBeVisible()
    await frame.getByRole('button', { name: 'Pause fixture' }).click()
    await expect(title).toBeVisible()
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
    await expect(
      recording.getByRole('link', { name: 'Synthetic recording', exact: true }),
    ).toHaveAttribute('href', '#fixture-recording')
    await expect(recording.locator('iframe')).toHaveAttribute('title', 'Synthetic recording')
  } finally {
    await context.close()
  }
})
