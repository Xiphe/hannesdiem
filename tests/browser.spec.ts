import { expect, test } from '@playwright/test'

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
    try {
      const page = await context.newPage()
      const response = await page.goto(example.path)
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(example.title)
      await expect(page.locator('#content h1')).toHaveText(example.title)
      await expect(page.locator('#content p')).toHaveText(example.paragraphs)
      await expect(page.locator('#island button')).toHaveText(`Count: ${example.initialCount}`)
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
  await page.getByRole('button', { name: 'Count: 0', exact: true }).click()
  await expect(page.locator('#island button')).toHaveText('Count: 1')
  await page.getByRole('link', { name: 'Another example' }).click()
  await expect(page).toHaveURL(/\/example$/)
  await expect(page.locator('#content h1')).toHaveText('Another example')
  await expect(page.locator('#island button')).toHaveText('Count: 10')
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
