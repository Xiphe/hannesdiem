import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { storeMedia } from '../preparation/media-storage.ts'

const bytes = new TextEncoder().encode('Synthetic image bytes')
const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
const key = `images/fixture-${digest}.webp`
const storage = {
  base: 'https://media.example.org',
  account: '0123456789abcdef0123456789abcdef',
  bucket: 'fixture-media',
}

// Deliberately fake signing credentials; requests are intercepted in this process.
process.env.AWS_ACCESS_KEY_ID = 'fixture-access-key'
process.env.AWS_SECRET_ACCESS_KEY = 'fixture-secret-key'

test('R2 storage completes before returning an immutable URL', async () => {
  let finish!: (response: Response) => void
  let captured!: (request: Request) => void
  const received = new Promise<Request>((resolve) => {
    captured = resolve
  })
  let returned = false
  const stored = storeMedia(storage, key, bytes, 'image/webp', async (input) => {
    captured(input as Request)
    return new Promise<Response>((resolve) => {
      finish = resolve
    })
  }).then((url) => {
    returned = true
    return url
  })
  const request = await received
  assert.equal(request.method, 'PUT')
  assert.equal(
    request.url,
    `https://${storage.account}.r2.cloudflarestorage.com/fixture-media/${key}`,
  )
  assert.equal(request.headers.get('Content-Type'), 'image/webp')
  assert.equal(request.headers.get('Cache-Control'), 'public, max-age=31536000, immutable')
  assert.ok(request.headers.get('Authorization')?.startsWith('AWS4-HMAC-SHA256 '))
  assert.deepEqual(new Uint8Array(await request.arrayBuffer()), bytes)
  assert.equal(returned, false)
  finish(new Response(null, { status: 200 }))
  assert.equal(await stored, `${storage.base}/${key}`)
})

test('failed storage rejects instead of returning a publishable URL', async () => {
  await assert.rejects(
    storeMedia(storage, key, bytes, 'image/webp', async () => new Response(null, { status: 403 })),
    /R2 storage failed.*403/,
  )
  await assert.rejects(
    storeMedia(storage, key, bytes, 'image/webp', async () => {
      throw new Error('Network unavailable')
    }),
    /Network unavailable/,
  )
})

test('storage rejects mutable keys before making a request', async () => {
  await assert.rejects(
    storeMedia(storage, 'images/fixture.webp', bytes, 'image/webp', async () => {
      assert.fail('Must not upload mutable objects')
    }),
    /content digest/,
  )
})
