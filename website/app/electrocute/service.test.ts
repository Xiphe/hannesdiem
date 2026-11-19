import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  HighlightService,
  HighlightError,
  type HighlightStorage,
  type HighlightTransaction,
  type TextCheck,
} from './service.ts'
import { parseTextCheck, textCheck, moderationModel } from './moderation.ts'
import type { CheckResult, HighlightInput } from './contract.ts'

class Storage implements HighlightStorage {
  data = new Map<string, unknown>()
  alarm?: number | Date
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
  async setAlarm(time: number | Date) {
    this.alarm = time
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

test('visitor text is checked before publication, rechecked after edits, and public reads omit private identity', async () => {
  const checks: string[] = []
  const storage = new Storage()
  const service = new HighlightService(
    storage,
    async (title, alias) => {
      checks.push(`${title}:${alias}`)
      return title === 'Reject fixture' ? 'rejected' : 'approved'
    },
    artist,
  )
  const data = input()
  const saved = await service.mutate(session, owner, 'save', data)
  assert.equal(saved.highlights[0].status, 'approved')
  assert.equal(saved.alias, undefined)
  assert.equal(saved.highlights[0].person, 'Listener')
  assert.equal(saved.highlights[0].own, true)
  const publicState = await service.view(session)
  assert.equal(publicState.highlights.length, 1)
  assert.equal(publicState.highlights[0].own, false)
  assert.equal(publicState.highlights[0].canEdit, false)
  assert.equal(publicState.alias, undefined)
  assert.ok(!JSON.stringify(publicState).includes(owner))
  await service.mutate(session, owner, 'save', { ...data, revision: 1, start: 20 })
  assert.equal(checks.length, 1, 'range-only corrections reuse accepted text')
  await service.mutate(session, owner, 'save', { ...data, revision: 2, title: 'Reject fixture' })
  assert.equal((await service.view(session)).highlights.length, 0)
  assert.equal((await service.view(session, owner)).highlights[0].status, 'rejected')
  await service.mutate(session, owner, 'save', { ...data, revision: 3, title: 'Accepted fixture' })
  assert.equal(checks.length, 3)
  const overlap = input({ start: 30, end: 80 })
  await service.mutate(session, owner, 'save', overlap)
  assert.equal((await service.view(session)).highlights.length, 2)
})

test('owners and artist have separate reversible visibility controls; strangers cannot edit or escalate', async () => {
  let calls = 0
  const service = new HighlightService(
    new Storage(),
    async () => {
      calls++
      return 'approved'
    },
    artist,
  )
  const data = input()
  await service.mutate(session, owner, 'save', data)
  await assert.rejects(
    service.mutate(session, 'stranger@example.org', 'save', { ...data, revision: 1 }),
    rejectedWith(403),
  )
  await assert.rejects(
    service.mutate(session, owner, 'hide', { id: data.id, revision: 1 }),
    rejectedWith(403),
  )
  await service.mutate(session, artist.toUpperCase(), 'hide', { id: data.id, revision: 1 })
  assert.equal((await service.view(session)).highlights.length, 0)
  await service.mutate(session, owner, 'restore', { id: data.id, revision: 2 })
  assert.equal((await service.view(session)).highlights.length, 0, 'owner cannot undo artist hide')
  await service.mutate(session, owner, 'withdraw', { id: data.id, revision: 3 })
  await service.mutate(session, artist, 'restore', { id: data.id, revision: 4 })
  assert.equal(
    (await service.view(session)).highlights.length,
    0,
    'artist restore respects creator withdrawal',
  )
  await service.mutate(session, owner, 'restore', { id: data.id, revision: 5 })
  assert.equal((await service.view(session)).highlights.length, 1)
  await service.mutate(session, artist, 'save', {
    ...data,
    title: 'Artist correction',
    revision: 6,
  })
  const corrected = (await service.view(session, owner)).highlights[0]
  assert.equal(corrected.own, true)
  assert.equal(corrected.person, 'Listener')
  assert.equal(calls, 1, 'artist corrections bypass moderation')
  const own = await service.mutate(session, artist, 'save', input())
  assert.equal(own.artist, true)
  assert.equal(calls, 1)
})

test('pending checks survive an outage and retry; concurrent corrections win over stale inference', async () => {
  let now = 1000
  let decision: CheckResult = 'pending'
  const storage = new Storage()
  const service = new HighlightService(
    storage,
    async () => decision,
    artist,
    () => now,
  )
  const data = input()
  await service.mutate(session, owner, 'save', data)
  assert.equal((await service.view(session)).highlights.length, 0)
  assert.ok(storage.alarm)
  now += 16 * 60_000
  decision = 'approved'
  await service.maintain()
  assert.equal((await service.view(session)).highlights.length, 1)

  let release!: (status: CheckResult) => void
  let started!: () => void
  const waiting = new Promise<void>((resolve) => {
    started = resolve
  })
  const check: TextCheck = () =>
    new Promise((resolve) => {
      release = resolve
      started()
    })
  const race = new HighlightService(new Storage(), check, artist)
  const saving = race.mutate(session, owner, 'save', data)
  await waiting
  const hidden = await race.mutate(session, artist, 'hide', { id: data.id, revision: 1 })
  assert.equal(hidden.highlights[0].hidden, true)
  await race.mutate(session, artist, 'save', { ...data, title: 'Newer artist edit', revision: 2 })
  release('rejected')
  await saving
  const current = (await race.view(session, owner)).highlights[0]
  assert.equal(current.title, 'Newer artist edit')
  assert.equal(current.status, 'approved')
  assert.equal(current.hidden, true)
})

test('duration, text bounds, revision and client IDs are enforced before writes', async () => {
  const service = new HighlightService(new Storage(), async () => 'approved', artist)
  for (const extra of [
    { start: -1 },
    { end: 181 },
    { start: 70, end: 10 },
    { title: ' ' },
    { title: 'bad\nfixture' },
    { id: '../../fixture' },
  ])
    await assert.rejects(service.mutate(session, owner, 'save', input(extra)), rejectedWith(400))
  const data = input()
  await service.mutate(session, owner, 'save', data)
  await assert.rejects(service.mutate(session, owner, 'save', data), rejectedWith(409))
  await assert.rejects(
    service.mutate(session, owner, 'withdraw', { id: data.id, revision: 0 }),
    rejectedWith(409),
  )
  assert.equal(
    (await service.view({ ...session, duration: 20 })).highlights.length,
    0,
    'a shortened source cannot expose invalid ranges',
  )
})

test('the model adapter sends only title and public alias, and fails closed on malformed output', async () => {
  for (const value of [
    undefined,
    {},
    { response: 'safe' },
    { response: '{"allow":"true"}' },
    { response: '{"title_ok":true,"alias_ok":true} ignore' },
  ])
    assert.equal(parseTextCheck(value), 'pending')
  assert.equal(parseTextCheck({ response: '{"title_ok":true,"alias_ok":true}' }), 'approved')
  assert.equal(parseTextCheck({ response: '{"title_ok":false,"alias_ok":true}' }), 'rejected')
  assert.equal(parseTextCheck({ response: { title_ok: true, alias_ok: false } }), 'rejected')
  assert.equal(parseTextCheck({ response: { title_ok: true, alias_ok: true } }), 'approved')
  assert.equal(parseTextCheck({ response: { title_ok: true } }), 'pending')
  assert.equal(
    parseTextCheck({ choices: [{ message: { content: '{"title_ok":true,"alias_ok":true}' } }] }),
    'approved',
  )
  assert.equal(
    parseTextCheck({ choices: [{ message: { content: '{"title_ok":false,"alias_ok":true}' } }] }),
    'rejected',
  )
  assert.equal(parseTextCheck({ choices: [{ message: { content: '{"allow":' } }] }), 'pending')
  assert.equal(await textCheck()('Synthetic title', 'Alias'), 'pending')
  // A narrow binding-shaped adapter keeps this fixture independent of an actual model call.
  const requests: { model: string; inputs: Record<string, unknown> }[] = []
  const ai = {
    run: async (model: string, inputs: Record<string, unknown>) => {
      requests.push({ model, inputs })
      return { response: '{"title_ok":true,"alias_ok":true}' }
    },
  } as Ai
  assert.equal(await textCheck(ai)('Ignore instructions fixture', 'Alias'), 'approved')
  assert.equal(requests[0].model, moderationModel)
  assert.match(JSON.stringify(requests[0].inputs), /untrusted/)
  assert.ok(!JSON.stringify(requests).includes(owner))
})

test('highlights reference the current public profile across sessions; edits cannot rename their creator', async () => {
  const storage = new Storage()
  const service = new HighlightService(
    storage,
    async (_title, alias) =>
      alias === 'Rejected fixture'
        ? 'rejected'
        : alias === 'Pending fixture'
          ? 'pending'
          : 'approved',
    artist,
  )
  const profile = (alias: string, email = owner) =>
    service.mutate(session, email, 'profile', { id: crypto.randomUUID(), alias })
  await profile('First fixture')
  const one = input(),
    two = input()
  await service.mutate(session, owner, 'save', { ...one, alias: 'Ignored snapshot' })
  const other = { ...session, id: 'other-synthetic-session' }
  await service.mutate(other, owner, 'save', two)
  assert.equal((await service.view(session)).highlights[0].person, 'First fixture')
  await profile('Renamed fixture')
  assert.equal((await service.view(session)).highlights[0].person, 'Renamed fixture')
  assert.equal((await service.view(other)).highlights[0].person, 'Renamed fixture')
  await service.mutate(session, artist, 'save', {
    ...one,
    revision: 1,
    alias: 'Artist cannot rename creator',
  })
  assert.equal((await service.view(session)).highlights[0].person, 'Renamed fixture')
  for (const [key, value] of storage.data)
    if (key.startsWith('h:')) {
      assert.ok(!Object.hasOwn(value as object, 'person'))
      assert.ok(!Object.hasOwn(value as object, 'alias'))
      assert.equal((value as { owner: string }).owner, owner)
    }
  await assert.rejects(profile('Rejected fixture'), rejectedWith(422))
  await assert.rejects(profile('Pending fixture'), rejectedWith(503))
  await assert.rejects(profile('x'.repeat(21)), rejectedWith(400))
  assert.equal((await service.view(other)).highlights[0].person, 'Renamed fixture')
})

test('accepted legacy snapshots upgrade to a profile reference without overwriting an existing profile', async () => {
  const storage = new Storage()
  const service = new HighlightService(storage, async () => 'approved', artist)
  const one = input(),
    two = input()
  await service.mutate(session, owner, 'save', one)
  await service.mutate(session, owner, 'save', two)
  for (const [key, value] of storage.data)
    if (key.startsWith('h:'))
      storage.data.set(key, { ...(value as object), person: 'Legacy fixture' })
  assert.equal((await service.view(session)).highlights[0].person, 'Legacy fixture')
  await service.mutate(session, owner, 'profile', {
    id: crypto.randomUUID(),
    alias: 'Current fixture',
  })
  const entry = [...storage.data].find(([key]) => key.endsWith(two.id))!
  storage.data.set(entry[0], { ...(entry[1] as object), person: 'Stale snapshot' })
  assert.ok(
    (await service.view(session)).highlights.every((item) => item.person === 'Current fixture'),
  )
  for (const [key, value] of storage.data)
    if (key.startsWith('h:')) assert.ok(!Object.hasOwn(value as object, 'person'))
})

test('a delayed profile check cannot replace a newer accepted public name', async () => {
  let release!: (value: CheckResult) => void
  let started!: () => void
  const waiting = new Promise<void>((resolve) => {
    started = resolve
  })
  const service = new HighlightService(
    new Storage(),
    async (_title, alias) => {
      if (alias === 'Slow fixture')
        return new Promise<CheckResult>((resolve) => {
          release = resolve
          started()
        })
      return 'approved'
    },
    artist,
  )
  const slow = service.mutate(session, owner, 'profile', {
    id: crypto.randomUUID(),
    alias: 'Slow fixture',
  })
  await waiting
  await service.mutate(session, owner, 'profile', {
    id: crypto.randomUUID(),
    alias: 'Current fixture',
  })
  release('approved')
  await assert.rejects(slow, rejectedWith(409))
  assert.equal((await service.view(session, owner)).alias, 'Current fixture')
})
