import { expect, test, type BrowserContext } from '@playwright/test'
import media from '../.generated/media.json' with { type: 'json' }
import mediaFiles from '../.generated/media-files.json' with { type: 'json' }

// Production documents use the real media origin; browser checks stay offline.
// Deployment smoke checks verify that origin after uploading the same files.
async function mockRemoteMedia(context: BrowserContext) {
  if (!media.landscape.src.startsWith('https://')) return
  const prefix = media.landscape.src.slice(0, -mediaFiles.at(-1)!.key.length)
  for (const file of mediaFiles) {
    await context.route(`${prefix}${file.key}`, (route) => route.fulfill({
      path: file.path, contentType: file.contentType,
    }))
  }
}

test.beforeEach(async ({ context }) => { await mockRemoteMedia(context) })

declare global {
  interface Window {
    staticProbe: { root: Element; nodes: Node[]; mutations: number }
  }
}

for (const example of [
  {
    path: '/', title: 'Hannes Diem', initialCount: 0,
    paragraphs: [
      'Music, words, and a place to share what comes next.',
      'This is placeholder content for the Remix and Cloudflare spike.',
    ],
  },
  {
    path: '/example', title: 'Another example', initialCount: 10,
    paragraphs: [
      'This page is authored in CMX, including the interactive counter below.',
      'Its initial count travels through the CMX document into a Remix island.',
    ],
  },
]) {
  test(`${example.path}: content and CMX counter render without browser JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    await mockRemoteMedia(context)
    try {
      const page = await context.newPage()
      const response = await page.goto(example.path)
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(example.title)
      await expect(page.locator('#content h1')).toHaveText(example.title)
      await expect(page.locator('#content p')).toHaveText(example.paragraphs)
      await expect(page.locator('#island button')).toHaveText(`Count: ${example.initialCount}`)
      if (example.path === '/example') {
        await expect(page.getByRole('img', { name: /illustrated landscape/ })).toBeVisible()
      }
    } finally {
      await context.close()
    }
  })

  test(`${example.path}: CMX island hydration and updates leave the static DOM untouched`, async ({ page }) => {
    const errors: string[] = []
    const requests: string[] = []
    const scripts: { status: number; type: string }[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('request', (request) => requests.push(request.url()))
    page.on('response', (response) => {
      if (/\/assets\/[^?]+\.js(?:\?|$)/.test(response.url())) {
        scripts.push({ status: response.status(), type: response.headers()['content-type'] ?? '' })
      }
    })

    let releaseScripts!: () => void
    const scriptsAllowed = new Promise<void>((resolve) => { releaseScripts = resolve })
    let heldScripts = 0
    await page.route('**/assets/*.js', async (route) => {
      heldScripts++
      await scriptsAllowed
      await route.continue()
    })

    try {
      await page.goto(example.path, { waitUntil: 'commit' })
      await expect(page.locator('#content h1')).toHaveText(example.title)
      await expect(page.locator('#island button')).toHaveText(`Count: ${example.initialCount}`)
      await expect.poll(() => heldScripts).toBeGreaterThan(0)
      await page.evaluate(() => {
        const root = document.querySelector('#content')!
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL)
        const nodes: Node[] = [root]
        while (walker.nextNode()) nodes.push(walker.currentNode)
        window.staticProbe = { root, nodes, mutations: 0 }
        new MutationObserver((records) => {
          window.staticProbe.mutations += records.length
        }).observe(root, { subtree: true, childList: true, attributes: true, characterData: true })
      })
      releaseScripts()
      await page.waitForLoadState('networkidle')

      const counter = page.getByRole('button', { name: /^Count:/ })
      for (let count = 1; count <= 5; count++) {
        const requestCount = requests.length
        await counter.click()
        await expect(counter).toHaveText(`Count: ${example.initialCount + count}`)
        expect(requests).toHaveLength(requestCount)
      }

      expect(await page.evaluate(() => {
        const { root, nodes, mutations } = window.staticProbe
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL)
        const current: Node[] = [root]
        while (walker.nextNode()) current.push(walker.currentNode)
        return {
          sameNodes: root === document.querySelector('#content') &&
            nodes.length === current.length && nodes.every((node, index) =>
              node.isConnected && node === current[index]),
          mutations,
        }
      })).toEqual({ sameNodes: true, mutations: 0 })
      expect(scripts.length).toBeGreaterThan(0)
      for (const script of scripts) {
        expect(script.status).toBe(200)
        expect(script.type).toMatch(/javascript/)
      }
      expect(errors).toEqual([])
    } finally {
      releaseScripts()
    }
  })
}

test('CMX page links navigate between the examples', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Count: 0', exact: true }).click()
  await expect(page.locator('#island button')).toHaveText('Count: 1')
  await page.getByRole('link', { name: 'Another example' }).click()
  await expect(page).toHaveURL(/\/example$/)
  await expect(page.locator('#content h1')).toHaveText('Another example')
  await expect(page.locator('#island button')).toHaveText('Count: 10')
  await page.waitForLoadState('networkidle')
  await page.locator('#island button').click()
  await expect(page.locator('#island button')).toHaveText('Count: 11')
  await page.getByRole('link', { name: 'Back home' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('#content h1')).toHaveText('Hannes Diem')
  await expect(page.locator('#island button')).toHaveText('Count: 0')
})

test('unknown URLs render CMX content with HTTP 404 and a working way home', async ({ page }) => {
  const response = await page.goto('/this-route/does-not-exist')
  expect(response?.status()).toBe(404)
  expect(response?.headers()['cache-control']).toBe('no-store')
  await expect(page).toHaveTitle('Page not found')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await expect(page.getByRole('button')).toHaveCount(0)
  await page.getByRole('link', { name: 'Back home' }).click()
  await expect(page.locator('#content h1')).toHaveText('Hannes Diem')
})

for (const viewport of [{ width: 360, variant: 480 }, { width: 1280, variant: 960 }]) {
  test(`responsive CMX image selects the ${viewport.variant}px variant at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: 900 })
    await page.goto('/example')
    const image = page.getByRole('img', { name: /illustrated landscape/ })
    await expect(image).toHaveAttribute('width', '1440')
    await expect(image).toHaveAttribute('height', '900')
    await expect(image).toHaveAttribute('sizes', '(max-width: 864px) calc(100vw - 48px), 816px')
    await image.evaluate(async (element: HTMLImageElement) => { await element.decode() })
    expect(await image.evaluate((element: HTMLImageElement) => element.currentSrc)).toMatch(
      new RegExp(`landscape-${viewport.variant}-[a-f0-9]{16}\\.webp$`),
    )
  })
}

test('the app-owned mark is a hashed immutable static asset', async ({ page, request }) => {
  await page.goto('/')
  const src = await page.locator('.site-mark img').getAttribute('src')
  expect(src).toMatch(/^\/assets\/mark-[a-f0-9]{16}\.svg$/)
  const response = await request.get(src!)
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toMatch(/image\/svg\+xml/)
  expect(response.headers()['cache-control']).toContain('immutable')
})
