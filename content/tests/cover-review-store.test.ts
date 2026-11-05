import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { coverReviewStore } from '../development/cover-review-store.ts'

test('cover choices and original frame bytes survive reload and concurrent saves', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'cover-review-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const store = await coverReviewStore(directory)
  const selection = { time: 12.5, focalX: 30, focalY: 20, videoId: 'synthetic-video' }
  const firstBytes = Buffer.from('synthetic first frame')
  const nextBytes = Buffer.from('synthetic next frame')
  const [first, other] = await Promise.all([
    store.save('synthetic-first', selection, firstBytes),
    store.save('synthetic-other', { ...selection, time: 14 }, nextBytes),
  ])
  const latest = await store.save(
    'synthetic-first',
    { ...selection, time: 16, compositionVersion: 2 },
    nextBytes,
  )
  assert.notEqual(first.frame, latest.frame)
  assert.deepEqual(await readFile(join(directory, first.frame)), firstBytes)
  assert.deepEqual(await readFile(join(directory, latest.frame)), nextBytes)
  const restored = await coverReviewStore(directory)
  assert.deepEqual(restored.get('synthetic-first'), latest)
  assert.equal(restored.get('synthetic-first')?.compositionVersion, 2)
  assert.deepEqual(restored.get('synthetic-other'), other)
  assert.equal(restored.get('absent'), undefined)
  await assert.rejects(store.save('../outside', selection, firstBytes), /identity/)
  await store.save('synthetic-third', selection, firstBytes)
  assert.ok(store.get('synthetic-third'))
})
