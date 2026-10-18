import assert from 'node:assert/strict'

const origin = new URL(process.argv[2])
async function get(path: string) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(20_000) })
  return response
}

let failure: unknown
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    const health = await get('/health')
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { ok: true })
    const page = await get('/')
    assert.equal(page.status, 200)
    const html = await page.text()
    assert.match(html, /Hannes Diem/)
    assert.match(html, /Count: 0/)
    const script = html.match(/src="(\/assets\/[^"\s]+\.js)"/)
    assert.ok(script, 'Missing browser entry')
    const asset = await get(script[1])
    assert.equal(asset.status, 200)
    assert.match(asset.headers.get('Content-Type') ?? '', /javascript/)
    assert.equal((await get('/missing-spike-route')).status, 404)
    console.log(`Deployment smoke passed: ${origin.origin}`)
    process.exit(0)
  } catch (error) {
    failure = error
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 3000))
  }
}
throw failure
