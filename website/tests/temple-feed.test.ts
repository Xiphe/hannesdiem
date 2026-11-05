import assert from 'node:assert/strict'
import { test } from 'node:test'
import { feedDocument } from '../app/temple/feed/document.ts'
import { sortedPosts } from '../app/temple/feed/model.ts'
import { feedFixtureDocument } from './feed-fixture.ts'
import { documents } from './host-fixture.ts'

test('feed selection follows CMX prop slots and retains mixed rich content without mutating its Publication', async () => {
  const source = feedFixtureDocument(documents.fixture)
  const before = structuredClone(source)
  const { posts, document } = await feedDocument(source)
  assert.deepEqual(source, before)
  assert.equal(posts.length, 5)
  assert.deepEqual(
    sortedPosts(posts as { id: string; postedAt: string }[]).map((post) => post.id),
    ['fixture-latest', 'fixture-middle', 'fixture-audio', 'fixture-text', 'fixture-oldest'],
  )
  assert.equal(posts.find((post) => post.kind === 'text')?.body instanceof Object, true)
  assert.equal(posts.find((post) => post.kind === 'audio')?.src, '/fixture-media/audio.wav')
  assert.deepEqual(document.interface.exports.default.slots, [[]])
  assert.deepEqual(document.interface.imports, source.interface.imports)
})

test('legacy recording collections remain readable by the same feed renderer', async () => {
  const { posts } = await feedDocument(documents['temple-recordings'])
  assert.equal(posts.length, 3)
  assert.ok(posts.every((post) => post.kind === 'video' && post.children != null))
  assert.equal((await feedDocument(documents.fixture)).posts.length, 0)
})

test('ambiguous dates and duplicate post identities cannot silently change feed ordering', () => {
  assert.throws(() => sortedPosts([{ id: 'a', postedAt: '2030-01-01T12:00:00' }]))
  assert.throws(() => sortedPosts([{ id: 'a', postedAt: 'invalid' }]))
  assert.throws(() =>
    sortedPosts([
      { id: 'a', postedAt: '2030-01-01T12:00:00Z' },
      { id: 'a', postedAt: '2030-01-02T12:00:00Z' },
    ]),
  )
})
