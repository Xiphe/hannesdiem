import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    staticProbe: { root: Element; nodes: Node[]; mutations: number }
  }
}

test('content is complete without browser JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.locator('#content h1')).toHaveText('Hannes Diem')
    await expect(page.locator('#content p')).toHaveText([
      'Music, words, and a place to share what comes next.',
      'This is placeholder content for the Remix and Cloudflare spike.',
    ])
    await expect(page.locator('#island button')).toHaveText('Count: 0')
  } finally {
    await context.close()
  }
})

test('hydration and local island updates leave the static DOM untouched', async ({ page }) => {
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
    await page.goto('/', { waitUntil: 'commit' })
    await expect(page.locator('#content h1')).toHaveText('Hannes Diem')
    await expect(page.locator('#island button')).toHaveText('Count: 0')
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
      await expect(counter).toHaveText(`Count: ${count}`)
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

test('unknown URLs return an actual 404', async ({ request }) => {
  const response = await request.get('/this-route-does-not-exist')
  expect(response.status()).toBe(404)
})
