import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CmxNode } from '@cmx-tools/contracts'
import { loadContent, contentRoutes, legacyRedirects } from './content-fixture.ts'
import { createApp as createRuntimeApp } from '../app/router.tsx'
import type { ContentLoader } from '../app/document-host/index.ts'
const createApp = (loader: ContentLoader = loadContent) => createRuntimeApp(loader)

async function publication(title: string, paragraph: string) {
  const page = structuredClone(await loadContent(new Request('https://example.com/linktree')))
  page.key = 'test-publication'
  page.route = undefined
  page.document.content.title = title
  page.document.content.default = {
    type: 'element',
    tag: 'article',
    children: [
      { type: 'element', tag: 'h1', children: [title] },
      { type: 'element', tag: 'p', children: [paragraph] },
    ],
  } satisfies CmxNode
  return page
}
test('content publications change without rebuilding or recreating the app', async () => {
  let title = 'First publication'
  const app = createApp(async () => publication(title, 'A complete article.'))
  const first = await app.fetch('https://example.com/publication')
  assert.equal(
    first.headers.get('Cloudflare-CDN-Cache-Control'),
    'public, max-age=60, stale-if-error=0',
  )
  assert.equal(first.headers.get('Cache-Control'), 'no-cache')
  assert.equal(first.headers.get('Cache-Tag'), 'content,page:test-publication')
  assert.match(await first.text(), /First publication/)
  title = 'Updated publication'
  const second = await app.fetch('https://example.com/publication')
  const html = await second.text()
  assert.match(html, /Updated publication/)
  assert.doesNotMatch(html, /First publication/)
})
test('content strings are escaped before becoming HTML', async () => {
  const app = createApp(async () =>
    publication('<script>alert(1)</script>', '<img src=x onerror=alert(1)>'),
  )
  const html = await (await app.fetch('https://example.com/publication')).text()
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>|<img src=x/)
  assert.match(html, /&lt;script&gt;/)
})
test('tracks inherit song titles while recordings can override them or remain instrumental', async () => {
  const page = await publication('Sample release', '')
  const song = { slug: 'song/shared-work', title: 'Shared work' }
  page.document.content.default = {
    type: 'component',
    from: '@hannesdiem/content-components',
    import: 'Release',
    props: {
      title: 'Sample release',
      tracks: [
        { song, duration: 120 },
        { song, title: 'Live recording', duration: 180 },
        { title: 'Instrumental', duration: 60 },
      ],
    },
  } satisfies CmxNode
  const app = createApp(async () => page)
  const html = await (await app.fetch('https://example.com/publication')).text()
  assert.match(html, />Shared work</)
  assert.match(html, />Live recording</)
  assert.match(html, />Instrumental</)
  assert.match(html, /Lyrics for &quot;Shared work&quot;/)
  assert.match(html, /Lyrics for &quot;Live recording&quot;/)
  assert.doesNotMatch(html, /Lyrics for &quot;Instrumental&quot;/)
  assert.equal([...html.matchAll(/href="\/song\/shared-work"/g)].length, 2)
})
test('public rendering emits CMX styles and cache tags without personalizing responses', async () => {
  const app = createApp(async () => publication('Sample publication', 'A complete article.'))
  const response = await app.fetch('https://example.com/publication')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Set-Cookie'), null)
  assert.equal(response.headers.get('Cache-Tag'), 'content,page:test-publication')
  const html = await response.text()
  assert.match(html, /<style data-rmx-style/)
  assert.doesNotMatch(html, /\[object Object\]/)
})
test('missing routes, removed navigation endpoint, and health are uncached', async () => {
  const app = createApp()
  for (const path of ['/missing', '/health', '/nav', '/_overlay']) {
    const response = await app.fetch(`https://example.com${path}`)
    assert.equal(response.headers.get('Cache-Control'), 'no-store', path)
    assert.equal(response.headers.get('Cloudflare-CDN-Cache-Control'), null, path)
    assert.equal(response.headers.get('Cache-Tag'), null, path)
    if (path === '/missing' || path === '/nav') {
      assert.equal(response.status, 404)
    }
    if (path === '/health') assert.deepEqual(await response.json(), { ok: true })
  }
})
test('public pages include a cacheable local navigation dialog', async () => {
  const app = createApp(loadContent)
  for (const cookie of [undefined, 'hdm_user_session=existing-browser-session']) {
    const response = await app.fetch(
      new Request('https://example.com/hoffnung', {
        headers: cookie ? { Cookie: cookie } : undefined,
      }),
    )
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Set-Cookie'), null)
    assert.equal(
      response.headers.get('Cloudflare-CDN-Cache-Control'),
      'public, max-age=60, stale-if-error=0',
    )
    const html = await response.text()
    assert.match(html, /<dialog[^>]*id="site-navigation"[^>]*data-navigation-dialog/)
    assert.match(html, /command="request-close" commandfor="site-navigation"/)
    assert.match(html, /aria-current="page"/)
    assert.doesNotMatch(html, /href="\/nav|data-rmx-src="\/nav|data-rmx-history="replace"/)
  }
})
test('legacy aliases and direct modal URLs keep their redirects', async () => {
  const app = createApp()
  for (const [path, expected] of legacyRedirects) {
    const response = await app.fetch(`https://example.com${path}`)
    assert.equal(response.status, expected.status, path)
    assert.equal(response.headers.get('Location'), expected.to, path)
  }
  const song = contentRoutes.find((route) => route.kind === 'song')!
  const direct = await app.fetch(`https://example.com/m${song.path}`)
  assert.equal(direct.status, 307)
  assert.equal(direct.headers.get('Location'), song.path)
  const modal = await app.fetch(
    new Request(`https://example.com/m${song.path}`, {
      headers: { 'X-Remix-Frame': 'true', 'X-Remix-Target': 'overlay' },
    }),
  )
  assert.equal(modal.status, 200)
  const html = await modal.text()
  assert.match(html, /Close lyrics/)
  assert.doesNotMatch(html, /<html/)
})
