import assert from 'node:assert/strict'

const origin = new URL(process.argv[2])
let failure: unknown
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    const response = await fetch(new URL('/health', origin), {
      signal: AbortSignal.timeout(20_000),
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true })
    const status = await fetch(new URL('/_cmx/status', origin), {
      signal: AbortSignal.timeout(20_000),
    })
    assert.equal(status.status, 200)
    assert.equal(((await status.json()) as { ready: boolean }).ready, true)
    console.log(`Deployment health and content-host readiness passed at ${origin.origin}`)
    process.exit(0)
  } catch (error) {
    failure = error
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 3000))
  }
}
throw failure
