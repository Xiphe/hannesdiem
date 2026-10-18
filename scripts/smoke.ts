import assert from 'node:assert/strict'
import routes from '../content/routes.json' with { type: 'json' }
const origin = new URL(process.argv[2])
async function get(path: string, redirect: RequestRedirect = 'follow') {
  return fetch(new URL(path, origin), { redirect, signal: AbortSignal.timeout(20_000) })
}
let failure: unknown
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    const health = await get('/health')
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { ok: true })
    const home = await get('/', 'manual')
    assert.equal(home.status, 307)
    assert.equal(home.headers.get('Location'), '/linktree')
    for (const route of routes) {
      const response = await get(route.path)
      assert.equal(response.status, 200, route.path)
      assert.equal(response.headers.get('Set-Cookie'), null, route.path)
      const html = await response.text()
      assert.match(html, /<style data-rmx-style/)
      assert.doesNotMatch(html, /\[object Object\]/)
    }
    const linktree = await (await get('/linktree')).text()
    const script = linktree.match(/src="(\/assets\/[^"\s]+\.js)"/)
    assert.ok(script)
    const asset = await get(script[1])
    assert.equal(asset.status, 200)
    assert.match(asset.headers.get('Content-Type') ?? '', /javascript/)
    const content = await (await get('/one-week-album')).text()
    const media = content.match(/<img[^>]*\bsrc="([^"]+)"/)
    assert.ok(media)
    const image = await get(media[1])
    assert.equal(image.status, 200)
    assert.match(image.headers.get('Content-Type') ?? '', /image\/webp/)
    assert.match(image.headers.get('Cache-Control') ?? '', /immutable/)
    assert.ok((await image.arrayBuffer()).byteLength)
    const og = content.match(/property="og:image" content="([^"]+)"/)
    assert.ok(og)
    const card = await get(og[1])
    assert.equal(card.status, 200)
    assert.match(card.headers.get('Content-Type') ?? '', /image\/jpeg/)
    const mark = linktree.match(/\/assets\/mark-[a-f0-9]{16}\.svg/)
    assert.ok(mark)
    assert.equal((await get(mark[0])).status, 200)
    const nav = await get('/nav')
    assert.equal(nav.status, 200)
    assert.equal(nav.headers.get('Cache-Control'), 'no-store')
    const missing = await get('/missing-migrated-route')
    assert.equal(missing.status, 404)
    assert.equal(missing.headers.get('Cache-Control'), 'no-store')
    assert.match(await missing.text(), /Page Not Found/)
    console.log(
      `Deployment smoke passed: ${routes.length} content routes, app assets, R2 images/share cards, private navigation, and 404 at ${origin.origin}`,
    )
    process.exit(0)
  } catch (error) {
    failure = error
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 3000))
  }
}
throw failure
