import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  HighlightService,
  HighlightError,
  type HighlightStorage,
  type HighlightTransaction,
} from './service.ts'
import type { HighlightInput } from './contract.ts'

class Storage implements HighlightStorage {
  data = new Map<string, unknown>()
  private queue = Promise.resolve()
  async get<T>(key: string) {
    return structuredClone(this.data.get(key)) as T | undefined
  }
  async put<T>(key: string, value: T) {
    this.data.set(key, structuredClone(value))
  }
  async list<T>({ prefix }: { prefix: string }) {
    return new Map(
      [...this.data]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => [key, structuredClone(value) as T]),
    )
  }
  async transaction<T>(callback: (tx: HighlightTransaction) => Promise<T>) {
    const task = this.queue.then(() => callback(this))
    this.queue = task.then(
      () => {},
      () => {},
    )
    return task
  }
  async delete(key: string) {
    return this.data.delete(key)
  }
}
const session = { id: 'synthetic-session', duration: 180 }
const artist = 'artist@example.org',
  owner = 'owner@example.org'
const input = (extra: Partial<HighlightInput> = {}): HighlightInput => ({
  id: crypto.randomUUID(),
  title: 'Synthetic passage',
  start: 10,
  end: 70,
  ...extra,
})
const rejectedWith = (status: number) => (error: unknown) =>
  error instanceof HighlightError && error.status === status

test('contributions publish immediately and public reads omit private identity', async () => {
  const storage = new Storage()
  const service = new HighlightService(storage, artist)
  const data = input()
  const saved = await service.mutate(session, owner, 'save', data)
  assert.equal(saved.alias, undefined)
  assert.equal(saved.highlights[0].person, 'Listener')
  assert.equal(saved.highlights[0].own, true)
  const publicState = await service.view(session)
  assert.equal(publicState.highlights.length, 1)
  assert.equal(publicState.highlights[0].own, false)
  assert.equal(publicState.highlights[0].canEdit, false)
  assert.ok(!JSON.stringify(publicState).includes(owner))
  assert.ok(!Object.hasOwn(publicState.highlights[0], 'status'))
  await service.mutate(session, owner, 'save', {
    ...data,
    revision: 1,
    start: 20,
    title: 'Edited fixture',
  })
  const edited = (await service.view(session)).highlights[0]
  assert.equal(edited.title, 'Edited fixture')
  assert.equal(edited.start, 20)
  assert.equal(edited.revision, 2)
  await service.mutate(session, owner, 'save', input({ start: 30, end: 80 }))
  assert.equal((await service.view(session)).highlights.length, 2)
  for (const value of storage.data.values()) {
    for (const field of ['status', 'hidden', 'withdrawn', 'person', 'alias'])
      assert.ok(!Object.hasOwn(value as object, field))
  }
})

test('owners edit and permanently delete their own contributions; admin can manage all', async () => {
  const storage = new Storage()
  const service = new HighlightService(storage, artist)
  const data = input()
  await service.mutate(session, owner, 'save', data)
  assert.equal((await service.view(session, owner)).highlights[0].canEdit, true)
  assert.equal((await service.view(session, artist.toUpperCase())).highlights[0].canEdit, true)
  for (const intent of ['save', 'delete'] as const)
    await assert.rejects(
      service.mutate(session, 'stranger@example.org', intent, { ...data, revision: 1 }),
      rejectedWith(403),
    )
  await service.mutate(session, artist.toUpperCase(), 'save', {
    ...data,
    title: 'Admin correction',
    revision: 1,
  })
  const corrected = (await service.view(session, owner)).highlights[0]
  assert.equal(corrected.own, true)
  assert.equal(corrected.title, 'Admin correction')
  assert.equal(corrected.person, 'Listener')
  await service.mutate(session, artist, 'delete', { id: data.id, revision: 2 })
  assert.equal([...storage.data.keys()].filter((key) => key.startsWith('h:')).length, 0)
  assert.equal(
    (await new HighlightService(storage, artist).view(session, owner)).highlights.length,
    0,
  )
  await assert.rejects(
    service.mutate(session, owner, 'save', { ...data, revision: 2 }),
    rejectedWith(409),
  )
  await assert.rejects(
    service.mutate(session, artist, 'delete', { id: data.id, revision: 2 }),
    rejectedWith(404),
  )
  const own = input()
  await service.mutate(session, owner, 'save', own)
  await service.mutate(session, owner, 'delete', { id: own.id, revision: 1 })
  assert.equal((await service.view(session)).highlights.length, 0)
})

test('concurrent edits and deletes require the current revision and cannot resurrect deleted records', async () => {
  const service = new HighlightService(new Storage(), artist)
  const data = input()
  await service.mutate(session, owner, 'save', data)
  const results = await Promise.allSettled([
    service.mutate(session, owner, 'delete', { id: data.id, revision: 1 }),
    service.mutate(session, artist, 'save', { ...data, title: 'Stale correction', revision: 1 }),
  ])
  assert.equal(results[0].status, 'fulfilled')
  assert.equal(results[1].status, 'rejected')
  if (results[1].status === 'rejected') assert.ok(rejectedWith(409)(results[1].reason))
  assert.equal((await service.view(session)).highlights.length, 0)
})

test('duration, text bounds, revision and client IDs are enforced before writes', async () => {
  const storage = new Storage()
  const service = new HighlightService(storage, artist)
  for (const extra of [
    { start: -1 },
    { start: NaN },
    { end: Infinity },
    { end: 181 },
    { start: 70, end: 10 },
    { title: ' ' },
    { title: 'x'.repeat(121) },
    { title: 'bad\nfixture' },
    { id: '../../fixture' },
  ])
    await assert.rejects(service.mutate(session, owner, 'save', input(extra)), rejectedWith(400))
  assert.equal(storage.data.size, 0)
  const data = input()
  await service.mutate(session, owner, 'save', data)
  await assert.rejects(service.mutate(session, owner, 'save', data), rejectedWith(409))
  await assert.rejects(
    service.mutate(session, owner, 'delete', { id: data.id, revision: 0 }),
    rejectedWith(409),
  )
  assert.equal((await service.view({ ...session, duration: 20 })).highlights.length, 0)
})

test('highlights reference the current public profile across sessions; admin edits cannot rename creators', async () => {
  const storage = new Storage()
  const service = new HighlightService(storage, artist)
  const profile = (alias: string) =>
    service.mutate(session, owner, 'profile', { id: crypto.randomUUID(), alias })
  await profile('First fixture')
  const one = input(),
    two = input()
  await service.mutate(session, owner, 'save', { ...one, alias: 'Ignored snapshot' })
  const other = { ...session, id: 'other-synthetic-session' }
  await service.mutate(other, owner, 'save', two)
  await profile('Renamed fixture')
  assert.equal((await service.view(session)).highlights[0].person, 'Renamed fixture')
  assert.equal((await service.view(other)).highlights[0].person, 'Renamed fixture')
  await service.mutate(session, artist, 'save', {
    ...one,
    revision: 1,
    alias: 'Cannot rename creator',
  })
  assert.equal((await service.view(session)).highlights[0].person, 'Renamed fixture')
  for (const [key, value] of storage.data)
    if (key.startsWith('h:')) {
      assert.ok(!Object.hasOwn(value as object, 'person'))
      assert.ok(!Object.hasOwn(value as object, 'alias'))
      assert.equal((value as { owner: string }).owner, owner)
    }
  await assert.rejects(profile('x'.repeat(21)), rejectedWith(400))
  await assert.rejects(profile('bad\nname'), rejectedWith(400))
  assert.equal((await service.view(other)).highlights[0].person, 'Renamed fixture')
})

test('legacy names migrate once, removed contributions stay removed, and review states no longer restrict publishing', async () => {
  const storage = new Storage()
  const service = new HighlightService(storage, artist)
  const clips = Array.from({ length: 5 }, () => input())
  for (const clip of clips) await service.mutate(session, owner, 'save', clip)
  const states = [
    { status: 'approved', person: 'Legacy fixture' },
    { status: 'pending' },
    { status: 'rejected' },
    { hidden: true },
    { withdrawn: true },
  ]
  for (let i = 0; i < clips.length; i++) {
    const key = `h:${session.id}:${clips[i].id}`
    storage.data.set(key, { ...(storage.data.get(key) as object), ...states[i] })
  }
  const publicState = await service.view(session)
  assert.equal(publicState.highlights.length, 3)
  assert.ok(publicState.highlights.every((item) => item.person === 'Legacy fixture'))
  await service.mutate(session, owner, 'profile', {
    id: crypto.randomUUID(),
    alias: 'Current fixture',
  })
  const key = `h:${session.id}:${clips[1].id}`
  storage.data.set(key, {
    ...(storage.data.get(key) as object),
    status: 'approved',
    person: 'Stale snapshot',
  })
  assert.ok(
    (await service.view(session)).highlights.every((item) => item.person === 'Current fixture'),
  )
  assert.ok(!Object.hasOwn(storage.data.get(key) as object, 'person'))
})
