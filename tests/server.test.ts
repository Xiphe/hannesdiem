import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApp } from '../app/router.tsx'

test('content changes are rendered without rebuilding or recreating the app', async () => {
  let title = 'First publication'
  const app = createApp(async () => ({ title, paragraphs: ['A complete article.'] }))
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
  const app = createApp(async () => ({ title: '<script>alert(1)</script>', paragraphs: ['<img src=x onerror=alert(1)>'] }))
  const html = await (await app.fetch('https://example.com/')).text()
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>|<img src=x/)
  assert.match(html, /&lt;script&gt;/)
})

test('missing routes and health responses cannot enter the HTML cache', async () => {
  const app = createApp()
  const missing = await app.fetch('https://example.com/missing')
  assert.equal(missing.status, 404)
  assert.equal(missing.headers.get('Cache-Control'), 'no-store')
  const health = await app.fetch('https://example.com/health')
  assert.deepEqual(await health.json(), { ok: true })
  assert.equal(health.headers.get('Cache-Control'), 'no-store')
})
