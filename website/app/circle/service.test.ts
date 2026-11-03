import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CircleService, type CircleStorage } from './service.ts'
import type { CircleProvider } from './provider.ts'

function harness() {
  const records = new Map<string, unknown>()
  let now = 1_000_000
  let failSubscribe = false,
    failNotify = false,
    failUnsubscribe = false,
    failRead = false
  const subscriptions = new Map<string, boolean>()
  const notifications = new Map<string, string>()
  let attempts = 0
  const storage: CircleStorage = {
    get: async <T>(key: string) => structuredClone(records.get(key)) as T | undefined,
    transaction: async (fn) =>
      fn({
        put: async (key, value) => {
          records.set(key, structuredClone(value))
        },
        setAlarm: async () => {},
      }),
  }
  const provider: CircleProvider = {
    read: async (email) => {
      if (failRead) throw new Error('synthetic outage')
      return {
        name: '',
        exists: true,
        unsubscribed: false,
        subscribed: subscriptions.get(email) ?? false,
      }
    },
    subscribe: async (email) => {
      if (failSubscribe) throw new Error('synthetic outage')
      subscriptions.set(email, true)
    },
    unsubscribe: async (email) => {
      if (failUnsubscribe) throw new Error('synthetic outage')
      subscriptions.set(email, false)
    },
    notify: async (id, _email, alias) => {
      attempts++
      if (failNotify) throw new Error('synthetic outage')
      notifications.set(id, alias)
    },
  }
  const service = new CircleService(storage, provider, () => now)
  return {
    service,
    subscriptions,
    notifications,
    records,
    get attempts() {
      return attempts
    },
    advance: (ms: number) => {
      now += ms
    },
    failure(kind: 'subscribe' | 'notify' | 'unsubscribe' | 'read', enabled: boolean) {
      if (kind === 'subscribe') failSubscribe = enabled
      if (kind === 'notify') failNotify = enabled
      if (kind === 'unsubscribe') failUnsubscribe = enabled
      if (kind === 'read') failRead = enabled
    },
  }
}

test('claim owns one place per identity, exposes only aliases publicly and notifies only once', async () => {
  const h = harness()
  const result = await h.service.claim('ONE@example.org', 'Shared alias', 1)
  assert.equal(result.own?.spot, 1)
  assert.equal(h.subscriptions.get('one@example.org'), true)
  const again = await h.service.claim('one@example.org', 'Other alias', 2)
  assert.equal(again.own?.spot, 1)
  assert.equal(h.notifications.size, 1)
  assert.equal(h.attempts, 1)
  await h.service.claim('two@example.org', 'Shared alias', 2)
  assert.deepEqual((await h.service.view()).places, [
    { spot: 1, alias: 'Shared alias' },
    { spot: 2, alias: 'Shared alias' },
  ])
  assert.equal(JSON.stringify(await h.service.view()).includes('@'), false)
  assert.equal((await h.service.claim('three@example.org', 'Third', 1)).own?.spot, 3)
})

test('all ten places can be claimed, and full circles do not create another reservation', async () => {
  const h = harness()
  for (let i = 1; i <= 10; i++) await h.service.claim(`person${i}@example.org`, `Alias ${i}`, i)
  assert.equal((await h.service.claim('extra@example.org', 'Extra', 3)).waiting, true)
  assert.equal((await h.service.view()).places.length, 10)
  assert.equal(h.subscriptions.has('extra@example.org'), false)
})

test('claim recovery never publishes or notifies before subscription succeeds', async () => {
  const h = harness()
  h.failure('subscribe', true)
  await assert.rejects(h.service.claim('one@example.org', 'One', 1))
  assert.deepEqual((await h.service.view()).places, [])
  assert.deepEqual((await h.service.view()).unavailable, [1])
  assert.equal(h.notifications.size, 0)
  h.failure('subscribe', false)
  await h.service.maintain()
  assert.equal((await h.service.view('one@example.org')).own?.spot, 1)
  assert.equal(h.notifications.size, 1)
  await h.service.maintain()
  assert.equal(h.attempts, 1)
})

test('notification outage leaves a valid claim and durable retry, rename does not re-notify', async () => {
  const h = harness()
  h.failure('notify', true)
  assert.equal((await h.service.claim('one@example.org', 'One', 1)).own?.spot, 1)
  await h.service.rename('one@example.org', 'New alias')
  h.failure('notify', false)
  await h.service.maintain()
  assert.equal(h.notifications.size, 1)
  assert.deepEqual([...h.notifications.values()], ['One'])
  assert.equal((await h.service.view()).places[0].alias, 'New alias')
  await h.service.maintain()
  assert.equal(h.attempts, 2)
})

test('releasing and subscription opt-out finish together, retry survives upstream failure', async () => {
  const h = harness()
  await h.service.claim('one@example.org', 'One', 1)
  h.failure('unsubscribe', true)
  await assert.rejects(h.service.release('one@example.org'))
  assert.equal((await h.service.view()).places.length, 1)
  assert.equal((await h.service.claim('two@example.org', 'Two', 1)).own?.spot, 2)
  h.failure('unsubscribe', false)
  await h.service.maintain()
  assert.equal(h.subscriptions.get('one@example.org'), false)
  assert.equal((await h.service.view()).places.length, 1)
})

test('unsubscribe removes a reservation; old/replayed events cannot undo a new claim', async () => {
  const h = harness()
  await h.service.claim('one@example.org', 'One', 1)
  h.subscriptions.set('one@example.org', false)
  await h.service.reconcile('one@example.org')
  assert.equal((await h.service.view()).places.length, 0)
  await h.service.claim('one@example.org', 'One', 2)
  await h.service.reconcile('one@example.org')
  await h.service.reconcile('one@example.org')
  assert.equal((await h.service.view('one@example.org')).own?.spot, 2)
  h.failure('read', true)
  await assert.rejects(h.service.reconcile('one@example.org'))
  assert.equal((await h.service.view()).places.length, 1)
})

test('claims do not expire with time; invalid aliases and slots cannot acquire places', async () => {
  const h = harness()
  await h.service.claim('one@example.org', 'One', 1)
  h.advance(365 * 24 * 60 * 60_000)
  await h.service.maintain()
  assert.equal((await h.service.view()).places.length, 1)
  for (const slot of [0, 11, 1.5])
    await assert.rejects(h.service.claim('two@example.org', 'Two', slot), TypeError)
  for (const alias of ['', 'x'.repeat(21), 'broken\nname'])
    await assert.rejects(h.service.claim('two@example.org', alias, 2), TypeError)
})

test('moving keeps identity, alias and subscriptions, silently relocates conflicts and does not notify twice', async () => {
  const h = harness()
  await h.service.claim('one@example.org', 'One', 1)
  await h.service.claim('two@example.org', 'Two', 2)
  const before = structuredClone(h.records.get('circle')) as { places: { id: string }[] }
  const moved = await h.service.move('one@example.org', 2)
  assert.deepEqual(moved.own, { spot: 3, alias: 'One' })
  assert.equal(h.notifications.size, 2)
  assert.equal(h.attempts, 2)
  const after = h.records.get('circle') as typeof before
  assert.equal(after.places[0].id, before.places[0].id)
  assert.equal(h.subscriptions.get('one@example.org'), true)
  for (let i = 4; i <= 10; i++) await h.service.claim(`other${i}@example.org`, `Other ${i}`, i)
  await h.service.claim('last@example.org', 'Last', 1)
  assert.equal((await h.service.move('one@example.org', 2)).own?.spot, 3)
})

test('waiting interest is private, durable and idempotent, and never subscribes until a later explicit claim', async () => {
  const h = harness()
  for (let i = 1; i <= 10; i++) await h.service.claim(`person${i}@example.org`, `Alias ${i}`, i)
  h.failure('notify', true)
  assert.equal((await h.service.claim('extra@example.org', 'Extra', 1)).waiting, true)
  assert.equal(h.subscriptions.has('extra@example.org'), false)
  assert.equal((await h.service.view()).waiting, false)
  assert.equal(JSON.stringify(await h.service.view()).includes('Extra'), false)
  h.failure('notify', false)
  await h.service.maintain()
  assert.equal(h.notifications.size, 11)
  await h.service.claim('extra@example.org', 'Other', 1)
  assert.equal(h.notifications.size, 11)
  await h.service.release('person1@example.org')
  assert.equal((await h.service.view('extra@example.org')).waiting, true)
  const claimed = await h.service.claim('extra@example.org', 'Extra', 1)
  assert.equal(claimed.waiting, false)
  assert.equal(claimed.own?.spot, 1)
  assert.equal(h.subscriptions.get('extra@example.org'), true)
  assert.equal(h.notifications.size, 12)
})
