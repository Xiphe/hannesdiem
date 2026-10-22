import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import mediaFiles from '../../.generated/media-files.json' with { type: 'json' }

const origin = new URL(process.argv[2])
const mediaBase = process.env.MEDIA_BASE_URL ?? '/media'
const publication = process.argv.includes('--publication')
  ? (JSON.parse(await readFile('.generated/publication-result.json', 'utf8')) as {
      contentHash: string
    })
  : undefined
async function get(path: string, redirect: RequestRedirect = 'follow') {
  return fetch(new URL(path, origin), { redirect, signal: AbortSignal.timeout(20_000) })
}
async function asset(path: string, contentType: RegExp, immutable = false) {
  const response = await get(path)
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('Content-Type') ?? '', contentType, path)
  if (immutable) assert.match(response.headers.get('Cache-Control') ?? '', /immutable/, path)
  assert.ok((await response.arrayBuffer()).byteLength, path)
}
let failure: unknown
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    const health = await get('/health')
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { ok: true })
    const home = await get('/', 'manual')
    assert.equal(home.status, 307)
    const location = home.headers.get('Location')
    assert.ok(location)
    const page = await get(location)
    assert.equal(page.status, 200)
    if (publication) assert.equal(page.headers.get('X-Content-Revision'), publication.contentHash)
    assert.equal(page.headers.get('Set-Cookie'), null)
    const html = await page.text()
    assert.match(html, /<style data-rmx-style/)
    assert.match(html, /<dialog[^>]*id="site-navigation"[^>]*data-navigation-dialog/)
    assert.doesNotMatch(html, /\[object Object\]/)
    const script = html.match(/src="(\/assets\/[^"\s]+\.js)"/)
    const mark = html.match(/\/assets\/mark-[a-f0-9]{16}\.svg/)
    assert.ok(script)
    assert.ok(mark)
    const checks = [asset(script[1], /javascript/), asset(mark[0], /image\/svg\+xml/)]
    // Exercise the upload pipeline without depending on editorial markup or image order.
    for (const contentType of ['image/webp', 'image/jpeg']) {
      const file = mediaFiles.find((candidate) => candidate.contentType === contentType)
      if (file)
        checks.push(
          asset(
            `${mediaBase.replace(/\/+$/, '')}/${file.key}`,
            new RegExp(`^${contentType}`),
            true,
          ),
        )
    }
    await Promise.all(checks)
    const missing = await get('/missing-route')
    assert.equal(missing.status, 404)
    assert.equal(missing.headers.get('Cache-Control'), 'no-store')
    console.log(
      `Deployment smoke passed: app, local navigation, assets, media, and 404 at ${origin.origin}`,
    )
    process.exit(0)
  } catch (error) {
    failure = error
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 3000))
  }
}
throw failure
