import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CmxNode } from '@cmx-tools/contracts'
import { loadContent } from '../app/content.ts'
import { createApp } from '../app/router.tsx'

async function publication(title: string, paragraph: string) {
  const page = structuredClone(await loadContent(new Request('https://example.com/')))
  page.document.content.title = title
  page.document.content.default = {
    type: 'fragment',
    children: [
      {
        type: 'element', tag: 'article', props: { id: 'content' },
        children: [
          { type: 'element', tag: 'h1', children: [title] },
          { type: 'element', tag: 'p', children: [paragraph] },
        ],
      },
      { type: 'component', from: '@hannesdiem/content-components', import: 'Counter', props: { initialCount: 0 } },
    ],
  } satisfies CmxNode
  return page
}

test('content changes are rendered without rebuilding or recreating the app', async () => {
  let title = 'First publication'
  const app = createApp(async () => publication(title, 'A complete article.'))
  const first = await app.fetch('https://example.com/')
  assert.equal(first.headers.get('Cloudflare-CDN-Cache-Control'), 'public, max-age=60, stale-if-error=0')
  assert.equal(first.headers.get('Cache-Control'), 'no-cache')
  assert.equal(first.headers.get('Cache-Tag'), 'page:home')
  assert.match(await first.text(), /First publication/)

  title = 'Updated publication'
  const second = await app.fetch('https://example.com/')
  const html = await second.text()
  assert.match(html, /Updated publication/)
  assert.doesNotMatch(html, /First publication/)
  assert.match(html, /Count: 0/)
})

test('content is escaped before becoming HTML', async () => {
  const app = createApp(async () => publication('<script>alert(1)</script>', '<img src=x onerror=alert(1)>'))
  const html = await (await app.fetch('https://example.com/')).text()
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>|<img src=x/)
  assert.match(html, /&lt;script&gt;/)
})

test('missing routes and health responses cannot enter the HTML cache', async () => {
  const app = createApp()
  const missing = await app.fetch('https://example.com/missing')
  assert.equal(missing.status, 404)
  assert.equal(missing.headers.get('Cache-Control'), 'no-store')
  assert.equal(missing.headers.get('Cloudflare-CDN-Cache-Control'), null)
  assert.equal(missing.headers.get('Cache-Tag'), null)
  const html = await missing.text()
  assert.match(html, /Page not found/)
  assert.match(html, /href="\/"/)
  assert.doesNotMatch(html, /Count:/)
  const health = await app.fetch('https://example.com/health')
  assert.deepEqual(await health.json(), { ok: true })
  assert.equal(health.headers.get('Cache-Control'), 'no-store')
})

test('each CMX page resolves its own content, counter props, and cache tag', async () => {
  const app = createApp()
  const home = await app.fetch('https://example.com/')
  assert.equal(home.status, 200)
  assert.equal(home.headers.get('Cache-Tag'), 'page:home')
  assert.match(await home.text(), /Count: 0/)

  const example = await app.fetch('https://example.com/example?source=test')
  assert.equal(example.status, 200)
  assert.equal(example.headers.get('Cache-Tag'), 'page:example')
  const html = await example.text()
  assert.match(html, /Another example/)
  assert.match(html, /Count: 10/)
  assert.match(html, /"exportName":"Counter"/)
  assert.doesNotMatch(html, /A small beginning/)
})
