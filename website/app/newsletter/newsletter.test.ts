import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCookie } from 'remix/cookie'
import { templeSegment, templeTopic } from './temple-config.ts'
import { templeNewsletterPath, type TempleNewsletterState } from './contract.ts'
import { handleNewsletter, type NewsletterEnvironment, type NewsletterState } from './index.ts'
import { csrfRejectionHeader } from './contract.ts'
import { readSessionState, submitSessionForm } from './session-client.ts'
import {
  cleanupNewsletterStorage,
  handleNewsletterStorage,
  type NewsletterStorage,
  type NewsletterTransaction,
} from './storage.ts'

class MemoryStorage implements NewsletterStorage {
  entries = new Map<string, unknown>()
  alarm: number | null = null
  pending = Promise.resolve()
  async get<T>(key: string) {
    return structuredClone(this.entries.get(key)) as T | undefined
  }
  async put<T>(key: string, value: T) {
    this.entries.set(key, structuredClone(value))
  }
  async delete(key: string) {
    return this.entries.delete(key)
  }
  async list<T>() {
    return structuredClone(this.entries) as Map<string, T>
  }
  async getAlarm() {
    return this.alarm
  }
  async setAlarm(time: number | Date) {
    this.alarm = Number(time)
  }
  async transaction<T>(callback: (transaction: NewsletterTransaction) => Promise<T>): Promise<T> {
    const previous = this.pending
    let finish!: () => void
    this.pending = new Promise((resolve) => {
      finish = resolve
    })
    await previous
    const before = structuredClone(this.entries)
    try {
      return await callback(this)
    } catch (error) {
      this.entries = before
      throw error
    } finally {
      finish()
    }
  }
}

function harness() {
  const storage = new MemoryStorage()
  let now = Date.now()
  let existingContact = true
  let failDelivery = false
  let failContact = false
  let failTopic = false
  let unsubscribed = true
  let templeSubscribed = false
  let name = 'Synthetic saved name'
  let member = false
  let pagedMembership = false
  const calls: { url: string; method: string; body: Record<string, unknown> | null }[] = []
  const env: NewsletterEnvironment = {
    NEWSLETTER_SESSION_SECRET: 'test-only-secret-with-at-least-thirty-two-bytes',
    RESEND_HANNESDIEM_DE_API_KEY: 'test-only-resend-key',
    RESEND_HANNESDIEM_DE_SEGMENT_ID: 'test-newsletter-segment',
    NEWSLETTER_STATE: {
      getByName: () => ({ fetch: (request) => handleNewsletterStorage(request, storage, now) }),
    },
  }
  const delivery: typeof fetch = async (input, init) => {
    const url = String(input)
    assert.equal(new URL(url).origin, 'https://api.resend.com')
    assert.equal(init?.redirect, 'manual')
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-only-resend-key')
    const method = init?.method ?? 'GET'
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null
    calls.push({ url, method, body })
    if (url.endsWith('/emails'))
      return Response.json({ id: 'mock-email' }, { status: failDelivery ? 500 : 200 })
    if (failContact) return Response.json({ error: 'mock failure' }, { status: 500 })
    if (url.includes('/segments?') && method === 'GET')
      return Response.json(
        pagedMembership && !url.includes('after=')
          ? { data: [{ id: 'synthetic-other-segment' }], has_more: true }
          : { data: member ? [{ id: templeSegment }] : [], has_more: false },
      )
    if (url.endsWith('/topics') && method === 'GET')
      return Response.json({
        data: [
          { id: templeTopic, subscription: templeSubscribed ? 'opt_in' : 'opt_out' },
          { id: 'unrelated-topic', subscription: 'opt_in' },
        ],
        has_more: false,
      })
    if (url.endsWith('/topics') && method === 'PATCH') {
      if (failTopic) return Response.json({ error: 'synthetic topic failure' }, { status: 500 })
      for (const update of body as unknown as { id: string; subscription: string }[]) {
        assert.equal(update.id, templeTopic)
        templeSubscribed = update.subscription === 'opt_in'
      }
    } else if (method === 'PATCH' || (url.endsWith('/contacts') && method === 'POST')) {
      if (typeof body?.first_name === 'string') name = body.first_name
      if (typeof body?.unsubscribed === 'boolean') unsubscribed = body.unsubscribed
      if (url.endsWith('/contacts')) {
        existingContact = true
        templeSubscribed =
          (body?.topics as { id: string; subscription: string }[] | undefined)?.some(
            (topic) => topic.id === templeTopic && topic.subscription === 'opt_in',
          ) ?? false
      }
    }
    if (method === 'GET')
      return Response.json(
        { email: 'test@example.org', unsubscribed, first_name: name },
        { status: existingContact ? 200 : 404 },
      )
    return Response.json({ id: 'mock-contact' })
  }
  const request = (path: string, init?: RequestInit) =>
    new Request(`https://example.com${path}`, init)
  const handle = async (path: string, init?: RequestInit) => {
    const result = await handleNewsletter(request(path, init), env, { fetch: delivery })
    assert.ok(result)
    assert.equal(result.headers.get('Cache-Control'), 'no-store')
    assert.equal(result.headers.get('Referrer-Policy'), 'no-referrer')
    return result
  }
  const state = async (cookie?: string) => {
    const response = await handle('/login', {
      headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    })
    const value = (await response.json()) as NewsletterState
    return { ...value, headers: response.headers, cookie: cookieFrom(response.headers) ?? cookie! }
  }
  const submit = (
    email: string,
    csrfToken: string,
    cookie: string,
    extra?: Record<string, string>,
    name?: string,
  ) =>
    handle('/login', {
      method: 'POST',
      headers: { Origin: 'https://example.com', Cookie: cookie, ...extra },
      body: new URLSearchParams({
        email,
        _csrf: csrfToken,
        ...(name !== undefined ? { name } : {}),
      }),
    })
  const confirmation = () => {
    const email = calls.findLast((call) => call.url.endsWith('/emails'))
    assert.ok(email)
    const link = String(email.body?.text).match(
      /(?:Confirm (?:Email|interest)|Login): (https:\/\/\S+)/,
    )?.[1]
    assert.ok(link)
    return new URL(link).pathname + new URL(link).search
  }
  return {
    env,
    storage,
    calls,
    handle,
    state,
    submit,
    confirmation,
    async templeState(cookie?: string) {
      const response = await handle(templeNewsletterPath, {
        headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      })
      return {
        ...((await response.json()) as TempleNewsletterState),
        cookie: cookieFrom(response.headers) ?? cookie!,
      }
    },
    submitTemple(values: Record<string, string>, csrfToken: string, cookie: string) {
      return handle(templeNewsletterPath, {
        method: 'POST',
        headers: { Origin: 'https://example.com', Accept: 'application/json', Cookie: cookie },
        body: new URLSearchParams({ intent: 'subscribe', ...values, _csrf: csrfToken }),
      })
    },
    setMember(value: boolean, paged = false) {
      member = value
      pagedMembership = paged
    },
    setUnsubscribed(value: boolean) {
      unsubscribed = value
    },
    setName(value: string) {
      name = value
    },
    advance(ms: number) {
      now += ms
    },
    setExisting(value: boolean) {
      existingContact = value
    },
    setFailDelivery(value: boolean) {
      failDelivery = value
    },
    setFailContact(value: boolean) {
      failContact = value
    },
    setFailTopic(value: boolean) {
      failTopic = value
    },
    cleanup: () => cleanupNewsletterStorage(storage, now),
  }
}

function cookieFrom(headers: Headers): string | undefined {
  return headers.getSetCookie()[0]?.split(';')[0]
}

test('private form clients share a real session and recover a rotated cookie before delivery', async (t) => {
  const h = harness()
  h.env.CIRCLE_STATE = { getByName: () => ({ fetch: async () => Response.json({ places: [] }) }) }
  let cookie: string | undefined
  let rejected = 0
  t.mock.method(console, 'error', () => {})
  t.mock.method(globalThis, 'fetch', async (input: string, init?: RequestInit) => {
    assert.equal(init?.credentials, 'same-origin')
    assert.equal(init?.mode, 'same-origin')
    const url = new URL(input, 'https://example.com')
    const headers = new Headers(init?.headers)
    if (cookie) headers.set('Cookie', cookie)
    if (init?.method === 'POST') headers.set('Origin', url.origin)
    const response = await h.handle(url.pathname + url.search, { ...init, headers })
    cookie = cookieFrom(response.headers) ?? cookie
    if (response.status === 403) rejected++
    return response
  })
  const signal = new AbortController().signal
  const states = await Promise.all(
    ['/newsletter/temple', '/circle', '/login'].map(async (path) => {
      const response = await readSessionState(path, signal)
      assert.equal(response.status, 200)
      return response.json() as Promise<NewsletterState>
    }),
  )
  assert.equal(new Set(states.map((state) => state.csrfToken)).size, 1)
  assert.equal([...h.storage.entries.keys()].filter((key) => key.startsWith('session:')).length, 1)
  const values = (email: string, token: string, extra: Record<string, string> = {}) => {
    const body = new FormData()
    for (const [key, value] of Object.entries({
      email,
      name: 'Synthetic person',
      _csrf: token,
      ...extra,
    }))
      body.set(key, value)
    return body
  }
  for (const [index, path] of ['/newsletter/temple', '/circle', '/login'].entries()) {
    const response = await submitSessionForm(
      path,
      values(
        `fixture-${index}@example.org`,
        states[index].csrfToken!,
        path === '/circle' ? { intent: 'verify', spot: '1' } : { intent: 'subscribe' },
      ),
      signal,
      undefined,
    )
    assert.equal(response.status, 200)
  }
  assert.equal(rejected, 0)
  const rotated = await h.state()
  cookie = rotated.cookie
  const response = await submitSessionForm(
    '/newsletter/temple',
    values('retry@example.org', states[0].csrfToken!, { intent: 'subscribe' }),
    signal,
    undefined,
  )
  assert.equal(response.status, 200)
  assert.equal(rejected, 1)
  assert.equal(h.calls.filter((call) => call.url.endsWith('/emails')).length, 4)
})

test('rejected CSRF requests are classified and logged without private request data', async (t) => {
  const h = harness()
  const logs: string[] = []
  t.mock.method(console, 'error', (value: string) => logs.push(value))
  const state = await h.state()
  const response = await h.handle('/login?token=synthetic-private-link', {
    method: 'POST',
    headers: { Accept: 'application/json', Origin: 'https://example.com', Cookie: state.cookie },
    body: new URLSearchParams({
      email: 'private@example.org',
      name: 'Synthetic private name',
      _csrf: 'private-invalid-token',
    }),
  })
  assert.equal(response.status, 403)
  assert.equal(response.headers.get(csrfRejectionHeader), 'invalid-token')
  assert.deepEqual(await response.json(), {
    type: 'error',
    message: 'Something went wrong. Please try again.',
  })
  assert.deepEqual(
    logs.map((value) => JSON.parse(value)),
    [
      {
        event: 'newsletter_failure',
        path: '/login',
        method: 'POST',
        stage: 'csrf',
        reason: 'invalid-token',
      },
    ],
  )
  for (const privateValue of [
    'synthetic-private-link',
    'private@example.org',
    'Synthetic private name',
    'private-invalid-token',
    state.cookie,
  ])
    assert.ok(!logs.join('').includes(privateValue))
  assert.equal(h.calls.length, 0)
  const crossOrigin = await h.submit('private@example.org', state.csrfToken!, state.cookie, {
    Accept: 'application/json',
    Origin: 'https://elsewhere.example',
    'Sec-Fetch-Site': 'cross-site',
  })
  assert.equal(crossOrigin.status, 403)
  assert.equal(crossOrigin.headers.get(csrfRejectionHeader), null)
  assert.equal(JSON.parse(logs.at(-1)!).stage, 'origin')
})

test('confirmation is single-use, rotates an opaque session, preserves unsubscribe, and logout revokes it', async () => {
  const h = harness()
  const initial = await h.state()
  assert.ok(initial.csrfToken)
  assert.equal(initial.ready, true)
  assert.match(initial.headers.get('Set-Cookie')!, /HttpOnly/i)
  assert.match(initial.headers.get('Set-Cookie')!, /Secure/i)
  assert.match(initial.headers.get('Set-Cookie')!, /SameSite=Lax/i)
  assert.doesNotMatch(initial.headers.get('Set-Cookie')!, /Max-Age|Expires/i)
  const sent = await h.submit(' test@example.org ', initial.csrfToken, initial.cookie)
  assert.equal(sent.status, 303)
  assert.equal(sent.headers.get('Location'), '/login')
  assert.equal(h.calls.filter((call) => call.url.endsWith('/emails')).length, 1)
  const delivery = h.calls.find((call) => call.url.endsWith('/emails'))!
  assert.deepEqual(delivery.body?.to, ['test@example.org'])
  assert.match(String(delivery.body?.html), /Confirm Email/)
  assert.match(String(delivery.body?.html), /https:\/\/example\.com\/login\/api\?token=/)

  const confirmations = await Promise.all([
    h.handle(h.confirmation(), { headers: { Cookie: initial.cookie } }),
    h.handle(h.confirmation(), { headers: { Cookie: initial.cookie } }),
  ])
  const accepted = confirmations.filter(
    (response) => response.headers.get('Location') === '/?login_success=true',
  )
  assert.equal(accepted.length, 1)
  assert.equal(
    confirmations.filter(
      (response) => response.headers.get('Location') === '/login?error=invalid_token',
    ).length,
    1,
  )
  const loggedInCookie = cookieFrom(accepted[0].headers)!
  assert.notEqual(loggedInCookie, initial.cookie)
  const cookie = createCookie('hdm_user_session', { secrets: [h.env.NEWSLETTER_SESSION_SECRET!] })
  assert.match((await cookie.parse(loggedInCookie))!, /^[a-f0-9-]{36}$/)
  assert.ok(
    h.calls.some((call) => call.url.endsWith('/segments/ebed0ce7-7220-4955-a176-6e2f31acb5bd')),
  )
  assert.ok(h.calls.some((call) => call.url.endsWith('/segments/test-newsletter-segment')))
  assert.ok(h.calls.every((call) => call.method !== 'PATCH'))
  assert.ok(!h.calls.some((call) => call.url.endsWith('/contacts') && call.method === 'POST'))

  const loggedIn = await h.state(loggedInCookie)
  assert.equal(loggedIn.email, 'test@example.org')
  const api = await h.handle('/login/api?action=session', { headers: { Cookie: loggedInCookie } })
  assert.deepEqual(await api.json(), { email: 'test@example.org' })
  const logout = await h.handle('/logout', {
    method: 'POST',
    headers: { Cookie: loggedInCookie, Origin: 'https://example.com' },
    body: new URLSearchParams({ _csrf: loggedIn.csrfToken! }),
  })
  assert.equal(logout.status, 303)
  assert.equal(logout.headers.get('Location'), '/')
  const replay = await h.handle('/login/api?action=session', {
    headers: { Cookie: loggedInCookie },
  })
  assert.equal(await replay.json(), null)
})

test('cooldown is case-insensitive and expired links cannot subscribe or authenticate', async () => {
  const h = harness()
  const state = await h.state()
  assert.equal((await h.submit('test@example.org', state.csrfToken!, state.cookie)).status, 303)
  const originalLink = h.confirmation()
  const cooldown = await h.submit('TEST@example.org', state.csrfToken!, state.cookie)
  assert.equal(cooldown.status, 429)
  assert.equal(cooldown.headers.get('Retry-After'), '120')
  assert.equal(h.calls.filter((call) => call.url.endsWith('/emails')).length, 1)
  h.advance(2 * 60 * 1000)
  assert.equal((await h.submit('test@example.org', state.csrfToken!, state.cookie)).status, 303)
  h.advance(60 * 60 * 1000)
  const expired = await h.handle(originalLink)
  assert.equal(expired.headers.get('Location'), '/login?error=invalid_token')
  assert.ok(h.calls.every((call) => call.method === 'GET' || call.url.endsWith('/emails')))
  await h.cleanup()
  assert.ok([...h.storage.entries.keys()].every((key) => key.startsWith('session:')))
})

test('new contacts enter both existing segments only after email confirmation', async () => {
  const h = harness()
  h.setExisting(false)
  const state = await h.state()
  await h.submit('new@example.org', state.csrfToken!, state.cookie, undefined, 'Synthetic new name')
  assert.ok(h.calls.every((call) => call.method === 'GET' || call.url.endsWith('/emails')))
  const confirmed = await h.handle(h.confirmation())
  assert.equal(confirmed.headers.get('Location'), '/?login_success=true')
  const created = h.calls.find((call) => call.url.endsWith('/contacts') && call.method === 'POST')
  assert.deepEqual(created?.body, {
    email: 'new@example.org',
    first_name: 'Synthetic new name',
    unsubscribed: false,
    segments: [{ id: 'ebed0ce7-7220-4955-a176-6e2f31acb5bd' }, { id: 'test-newsletter-segment' }],
  })
})

test('form validation and native CSRF protection reject invalid or cross-origin submissions before sending', async () => {
  const h = harness()
  const state = await h.state()
  assert.equal((await h.submit('invalid', state.csrfToken!, state.cookie)).status, 400)
  assert.equal((await h.submit('test@example.org', 'wrong-token', state.cookie)).status, 403)
  assert.equal(
    (
      await h.submit('test@example.org', state.csrfToken!, state.cookie, {
        Origin: 'https://elsewhere.example',
      })
    ).status,
    403,
  )
  assert.equal(
    (
      await h.submit('test@example.org', state.csrfToken!, state.cookie, {
        'Sec-Fetch-Site': 'cross-site',
      })
    ).status,
    403,
  )
  const oversized = await h.handle('/login', {
    method: 'POST',
    headers: { Origin: 'https://example.com', Cookie: state.cookie },
    body: new URLSearchParams({
      email: 'test@example.org',
      _csrf: state.csrfToken!,
      unexpected: 'x'.repeat(5000),
    }),
  })
  assert.equal(oversized.status, 413)
  assert.equal(h.calls.length, 0)
})

test('delivery failure releases cooldown; contact failure never creates an authenticated session', async () => {
  const h = harness()
  const state = await h.state()
  h.setFailDelivery(true)
  assert.equal((await h.submit('test@example.org', state.csrfToken!, state.cookie)).status, 503)
  assert.equal([...h.storage.entries.keys()].filter((key) => !key.startsWith('session:')).length, 0)
  h.setFailDelivery(false)
  assert.equal((await h.submit('test@example.org', state.csrfToken!, state.cookie)).status, 303)
  h.setFailContact(true)
  const failed = await h.handle(h.confirmation(), { headers: { Cookie: state.cookie } })
  assert.equal(failed.headers.get('Location'), '/login?error=verification_failed')
  assert.equal((await h.state(state.cookie)).email, undefined)
})

test('missing configuration leaves content routes alone and disables signup without backend calls', async () => {
  assert.equal(await handleNewsletter(new Request('https://example.com/about'), {}), null)
  const response = await handleNewsletter(new Request('https://example.com/login'), {})
  assert.equal(response?.status, 503)
  assert.match(await response!.text(), /disabled/)
})

test('inline signup returns success and cooldown results without navigation or flash messages', async () => {
  const h = harness()
  const stateResponse = await h.handle('/login', { headers: { Accept: 'application/json' } })
  const state = (await stateResponse.json()) as { ready: boolean; csrfToken: string }
  const cookie = cookieFrom(stateResponse.headers)!
  assert.equal(state.ready, true)
  assert.ok(state.csrfToken)
  const sent = await h.submit('test@example.org', state.csrfToken, cookie, {
    Accept: 'application/json',
  })
  assert.equal(sent.status, 200)
  assert.equal(sent.headers.get('Location'), null)
  assert.deepEqual(await sent.json(), {
    type: 'success',
    message: 'Link sent! Please check your email.',
    csrfToken: state.csrfToken,
  })
  assert.equal(h.calls.filter((call) => call.url.endsWith('/emails')).length, 1)
  const page = await h.handle('/login', { headers: { Cookie: cookie } })
  assert.doesNotMatch(await page.text(), /Link sent! Please check your email\./)

  const cooldown = await h.submit('TEST@example.org', state.csrfToken, cookie, {
    Accept: 'application/json',
  })
  assert.equal(cooldown.status, 429)
  assert.equal(cooldown.headers.get('Retry-After'), '120')
  assert.deepEqual(await cooldown.json(), {
    type: 'spam_protection',
    message: 'Please wait 120s before requesting another login token',
    remainingSeconds: 120,
    csrfToken: state.csrfToken,
  })
  assert.equal(h.calls.filter((call) => call.url.endsWith('/emails')).length, 1)
})

test('inline validation, CSRF, and delivery failures preserve a retryable form without sending twice', async () => {
  const h = harness()
  const state = await h.state()
  const json = { Accept: 'application/json' }
  const invalid = await h.submit('invalid', state.csrfToken!, state.cookie, json)
  assert.equal(invalid.status, 400)
  assert.deepEqual(await invalid.json(), {
    type: 'error',
    message: 'Please enter your email address.',
    csrfToken: state.csrfToken,
  })
  assert.equal((await h.submit('test@example.org', 'wrong', state.cookie, json)).status, 403)
  assert.equal(
    (
      await h.submit('test@example.org', state.csrfToken!, state.cookie, {
        ...json,
        Origin: 'https://elsewhere.example',
      })
    ).status,
    403,
  )
  assert.equal(h.calls.length, 0)

  h.setFailDelivery(true)
  const failed = await h.submit('test@example.org', state.csrfToken!, state.cookie, json)
  assert.equal(failed.status, 503)
  assert.deepEqual(await failed.json(), {
    type: 'error',
    message: 'Something went wrong. Please try again.',
    csrfToken: state.csrfToken,
  })
  assert.equal([...h.storage.entries.keys()].filter((key) => !key.startsWith('session:')).length, 0)
  h.setFailDelivery(false)
  const retry = await h.submit('test@example.org', state.csrfToken!, state.cookie, json)
  assert.equal(retry.status, 200)
  assert.equal(((await retry.json()) as { type: string }).type, 'success')
})

test('inline logout revokes authentication and bootstrap creates a fresh anonymous CSRF session', async () => {
  const h = harness()
  const initial = await h.state()
  await h.submit('test@example.org', initial.csrfToken!, initial.cookie, {
    Accept: 'application/json',
  })
  const accepted = await h.handle(h.confirmation(), { headers: { Cookie: initial.cookie } })
  const cookie = cookieFrom(accepted.headers)!
  const authenticatedResponse = await h.handle('/login', {
    headers: { Cookie: cookie, Accept: 'application/json' },
  })
  assert.equal(authenticatedResponse.status, 200)
  assert.equal(authenticatedResponse.headers.get('Location'), null)
  const authenticated = (await authenticatedResponse.json()) as { email: string; csrfToken: string }
  assert.equal(authenticated.email, 'test@example.org')

  const logout = await h.handle('/logout', {
    method: 'POST',
    headers: { Cookie: cookie, Origin: 'https://example.com', Accept: 'application/json' },
    body: new URLSearchParams({ _csrf: authenticated.csrfToken }),
  })
  assert.equal(logout.status, 200)
  assert.equal(logout.headers.get('Location'), null)
  assert.deepEqual(await logout.json(), { type: 'success', message: 'Logged out successfully' })
  assert.equal(cookieFrom(logout.headers), 'hdm_user_session=')
  const bootstrap = await h.handle('/login', { headers: { Accept: 'application/json' } })
  const anonymous = (await bootstrap.json()) as {
    ready: boolean
    email?: string
    csrfToken: string
  }
  const anonymousCookie = cookieFrom(bootstrap.headers)!
  assert.equal(anonymous.ready, true)
  assert.equal(anonymous.email, undefined)
  assert.ok(anonymous.csrfToken)
  assert.notEqual(anonymous.csrfToken, authenticated.csrfToken)
  assert.notEqual(anonymousCookie, cookie)
  const rejectedReplay = await h.submit(
    'new@example.org',
    authenticated.csrfToken,
    anonymousCookie,
    { Accept: 'application/json' },
  )
  assert.equal(rejectedReplay.status, 403)
  assert.equal((await h.state(cookie)).email, undefined)
})

test('inline signup is unavailable as JSON when configuration is missing', async () => {
  const response = await handleNewsletter(
    new Request('https://example.com/login', {
      headers: { Accept: 'application/json' },
    }),
    {},
  )
  assert.equal(response?.status, 503)
  assert.equal(response?.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual(await response!.json(), {
    type: 'error',
    message: 'Newsletter signup is temporarily unavailable. Please try again later.',
  })
})

test('Temple requires a bounded name and email and never enrolls before confirmation', async () => {
  const h = harness()
  h.setExisting(false)
  const state = await h.templeState()
  for (const name of ['', '  ', 'x'.repeat(121)]) {
    assert.equal(
      (await h.submitTemple({ name, email: 'aster@example.org' }, state.csrfToken!, state.cookie))
        .status,
      400,
    )
  }
  assert.equal(
    (await h.submitTemple({ name: 'Aster', email: 'invalid' }, state.csrfToken!, state.cookie))
      .status,
    400,
  )
  assert.ok(h.calls.every((call) => call.method === 'GET'))
  const sent = await h.submitTemple(
    { name: ' Aster ', email: ' aster@example.org ' },
    state.csrfToken!,
    state.cookie,
  )
  assert.equal(sent.status, 200)
  assert.equal(h.calls.filter((call) => call.method !== 'GET').length, 1)
  const email = h.calls.find((call) => call.url.endsWith('/emails'))!.body!
  assert.match(String(email.html), /Hey,/)
  assert.equal(email.subject, 'Temple of Sound: Confirm your interest')
  assert.deepEqual(email.to, ['aster@example.org'])
  const link = h.confirmation()
  const confirmed = await h.handle(link)
  assert.equal(confirmed.headers.get('Location'), '/temple-of-sound?newsletter=confirmed#watch')
  const created = h.calls.find((call) => call.url.endsWith('/contacts') && call.method === 'POST')!
  assert.deepEqual(created.body, {
    email: 'aster@example.org',
    first_name: 'Aster',
    unsubscribed: false,
    segments: [{ id: templeSegment }],
    topics: [{ id: templeTopic, subscription: 'opt_in' }],
  })
  const authenticated = await h.templeState(cookieFrom(confirmed.headers))
  assert.equal(authenticated.email, 'aster@example.org')
  assert.equal(authenticated.name, 'Aster')
  assert.equal(authenticated.subscribed, true)
  assert.equal(authenticated.unsubscribed, false)
  assert.equal(
    (await h.handle(link)).headers.get('Location'),
    '/temple-of-sound?newsletter=invalid_token#watch',
  )
})

test('Temple signed-in toggle uses verified identity and changes only its own topic', async () => {
  const h = harness()
  h.setUnsubscribed(false)
  h.setName('Aster')
  const initial = await h.state()
  await h.submit('verified@example.org', initial.csrfToken!, initial.cookie)
  const confirmed = await h.handle(h.confirmation())
  const state = await h.templeState(cookieFrom(confirmed.headers))
  h.calls.length = 0
  const subscribe = await h.submitTemple(
    { email: 'someone-else@example.org' },
    state.csrfToken!,
    state.cookie,
  )
  assert.equal(subscribe.status, 200)
  assert.equal(
    ((await subscribe.json()) as { state: TempleNewsletterState }).state.subscribed,
    true,
  )
  assert.ok(
    h.calls.every((call) => !call.url.includes('someone-else') && !call.url.endsWith('/emails')),
  )
  assert.ok(h.calls.some((call) => call.url.endsWith(`/segments/${templeSegment}`)))
  assert.deepEqual(
    h.calls.find((call) => call.method === 'PATCH' && call.url.endsWith('/topics'))?.body,
    [{ id: templeTopic, subscription: 'opt_in' }],
  )
  h.calls.length = 0
  const unsubscribe = await h.submitTemple(
    { intent: 'unsubscribe' },
    state.csrfToken!,
    state.cookie,
  )
  assert.equal(unsubscribe.status, 200)
  assert.equal(
    ((await unsubscribe.json()) as { state: TempleNewsletterState }).state.subscribed,
    false,
  )
  assert.deepEqual(
    h.calls.filter((call) => call.method !== 'GET').map((call) => call.body),
    [[{ id: templeTopic, subscription: 'opt_out' }]],
  )
})

test('Temple globally unsubscribed contacts confirm again before email delivery is restored', async () => {
  const h = harness()
  const initial = await h.state()
  await h.submit('verified@example.org', initial.csrfToken!, initial.cookie)
  const login = await h.handle(h.confirmation())
  const state = await h.templeState(cookieFrom(login.headers))
  assert.equal(state.unsubscribed, true)
  h.calls.length = 0
  assert.equal(
    (await h.submitTemple({ name: 'Aster' }, state.csrfToken!, state.cookie)).status,
    200,
  )
  assert.ok(!h.calls.some((call) => call.method === 'PATCH'))
  const verified = await h.handle(h.confirmation(), { headers: { Cookie: state.cookie } })
  assert.equal(verified.headers.get('Location'), '/temple-of-sound?newsletter=confirmed#watch')
  assert.ok(h.calls.some((call) => call.method === 'PATCH' && call.body?.unsubscribed === false))
  assert.deepEqual(
    h.calls
      .filter((call) => call.method === 'PATCH' && call.url.endsWith('/topics'))
      .map((call) => call.body),
    [[{ id: templeTopic, subscription: 'opt_in' }]],
  )
})

test('Temple confirmation intent is bound to a single-use token and expires without enrollment', async () => {
  const h = harness()
  const state = await h.templeState()
  assert.equal(
    (await h.submitTemple({ name: 'Aster', email: 'aster@example.org' }, 'bad-csrf', state.cookie))
      .status,
    403,
  )
  assert.equal(
    (await h.submitTemple({ intent: 'unsubscribe' }, state.csrfToken!, state.cookie)).status,
    401,
  )
  assert.equal(
    (
      await h.submitTemple(
        { name: 'Aster', email: 'aster@example.org' },
        state.csrfToken!,
        state.cookie,
      )
    ).status,
    200,
  )
  const link = h.confirmation()
  assert.equal(
    (
      await h.submitTemple(
        { name: 'Aster', email: 'ASTER@example.org' },
        state.csrfToken!,
        state.cookie,
      )
    ).status,
    429,
  )
  h.advance(60 * 60 * 1000)
  assert.equal(
    (await h.handle(link)).headers.get('Location'),
    '/temple-of-sound?newsletter=invalid_token#watch',
  )
  assert.ok(h.calls.every((call) => call.method === 'GET' || call.url.endsWith('/emails')))
})

test('Temple escapes names in email HTML, and failed delivery allows a retry', async () => {
  const h = harness()
  const state = await h.templeState()
  const values = { name: '<img src=x onerror=alert(1)>', email: 'aster@example.org' }
  h.setName(values.name)
  h.setFailDelivery(true)
  assert.equal((await h.submitTemple(values, state.csrfToken!, state.cookie)).status, 503)
  h.setFailDelivery(false)
  assert.equal((await h.submitTemple(values, state.csrfToken!, state.cookie)).status, 200)
  const email = h.calls.findLast((call) => call.url.endsWith('/emails'))!.body!
  assert.ok(String(email.text).includes(values.name))
  assert.ok(String(email.html).includes('&lt;img'))
  assert.ok(!String(email.html).includes(values.name))
})

test('Temple native form asks for email first, then a missing name, and confirms without JavaScript', async () => {
  const h = harness()
  h.setExisting(false)
  const response = await h.handle(templeNewsletterPath)
  const html = await response.text()
  assert.doesNotMatch(html, /name="name"/)
  assert.match(html, /name="email"[^>]*required/)
  const csrf = html.match(/name="_csrf" value="([^"]+)"/)![1]
  const cookie = cookieFrom(response.headers)!
  const post = (name?: string) =>
    h.handle(templeNewsletterPath, {
      method: 'POST',
      headers: { Origin: 'https://example.com', Cookie: cookie },
      body: new URLSearchParams({
        ...(name !== undefined ? { name } : {}),
        email: 'aster@example.org',
        intent: 'subscribe',
        _csrf: csrf,
      }),
    })
  const next = await post()
  assert.equal(next.status, 200)
  const nameForm = await next.text()
  assert.match(nameForm, /name="name"[^>]*required/)
  assert.ok(nameForm.includes('aster@example.org'))
  assert.ok(h.calls.every((call) => call.method === 'GET'))
  const invalid = await post(' ')
  assert.equal(invalid.status, 400)
  assert.ok((await invalid.text()).includes('aster@example.org'))
  const pending = await post('Aster')
  assert.equal(pending.status, 200)
  assert.equal(pending.headers.get('Location'), null)
  assert.doesNotMatch(await pending.text(), /name="(?:name|email)"/)
  assert.equal(
    (await h.handle(h.confirmation())).headers.get('Location'),
    '/temple-of-sound?newsletter=confirmed#watch',
  )
})

test('Temple does not reactivate global delivery when the topic update fails', async () => {
  const h = harness()
  const state = await h.templeState()
  await h.submitTemple(
    { name: 'Aster', email: 'aster@example.org' },
    state.csrfToken!,
    state.cookie,
  )
  h.setFailTopic(true)
  const failed = await h.handle(h.confirmation())
  assert.equal(
    failed.headers.get('Location'),
    '/temple-of-sound?newsletter=verification_failed#watch',
  )
  assert.ok(!h.calls.some((call) => call.method === 'PATCH' && call.body?.unsubscribed === false))
  assert.equal((await h.state(state.cookie)).email, undefined)
})

test('Temple email login variant follows paginated segment membership, not contact existence or topic opt-in', async () => {
  for (const member of [false, true]) {
    const h = harness()
    h.setMember(member, true)
    h.setName('Saved private name')
    const state = await h.templeState()
    const sent = await h.submitTemple(
      { name: 'Submitted name', email: 'aster@example.org' },
      state.csrfToken!,
      state.cookie,
    )
    assert.equal(sent.status, 200)
    const email = h.calls.findLast((call) => call.url.endsWith('/emails'))!.body!
    assert.equal(
      email.subject,
      member ? 'Temple of Sound: Login' : 'Temple of Sound: Confirm your interest',
    )
    assert.match(String(email.text), /Hey Saved private name,/)
    assert.match(String(email.text), member ? /Login: https:/ : /Confirm interest: https:/)
    assert.ok(h.calls.some((call) => call.url.includes('after=synthetic-other-segment')))
  }
})

test('an older verified contact can opt in and confirm reactivation without adding a name', async () => {
  const h = harness()
  h.setUnsubscribed(false)
  const initial = await h.state()
  await h.submit('aster@example.org', initial.csrfToken!, initial.cookie)
  h.setName('')
  const login = await h.handle(h.confirmation())
  const user = await h.templeState(cookieFrom(login.headers))
  assert.equal((await h.submitTemple({}, user.csrfToken!, user.cookie)).status, 200)
  h.setUnsubscribed(true)
  assert.equal((await h.submitTemple({}, user.csrfToken!, user.cookie)).status, 200)
  const verified = await h.handle(h.confirmation())
  assert.match(verified.headers.get('Location')!, /newsletter=confirmed/)
  const current = await h.templeState(cookieFrom(verified.headers))
  assert.equal(current.unsubscribed, false)
  assert.equal(current.subscribed, true)
})

for (const path of ['/login', templeNewsletterPath]) {
  for (const exists of [false, true]) {
    test(`${path} asks for a missing name before sending and stores it only after verification (${exists ? 'existing' : 'new'} contact)`, async () => {
      const h = harness()
      h.setExisting(exists)
      h.setName('   ')
      h.setUnsubscribed(false)
      const initial = await h.state()
      const post = (name?: string) =>
        h.handle(path, {
          method: 'POST',
          headers: {
            Origin: 'https://example.com',
            Cookie: initial.cookie,
            Accept: 'application/json',
          },
          body: new URLSearchParams({
            email: ' ASTER@example.org ',
            intent: 'subscribe',
            _csrf: initial.csrfToken!,
            ...(name !== undefined ? { name } : {}),
          }),
        })
      const next = await post()
      assert.equal(next.status, 200)
      assert.equal(((await next.json()) as { nameRequired: boolean }).nameRequired, true)
      assert.ok(h.calls.every((call) => call.method === 'GET'))
      assert.ok([...h.storage.entries.keys()].every((key) => key.startsWith('session:')))
      assert.equal((await post(' ')).status, 400)
      assert.equal((await post('x'.repeat(121))).status, 400)
      const sent = await post(' Aster ')
      assert.equal(sent.status, 200)
      assert.ok(h.calls.every((call) => call.method === 'GET' || call.url.endsWith('/emails')))
      assert.equal((await h.handle(h.confirmation())).status, 303)
      const profile = h.calls.findLast((call) => call.body?.first_name)
      assert.equal(profile?.body?.first_name, 'Aster')
      assert.equal(profile?.method, exists ? 'PATCH' : 'POST')
    })
  }
  test(`${path} sends directly for a saved name and never overwrites it with an anonymous submission`, async () => {
    const h = harness()
    h.setName('Saved private name')
    h.setUnsubscribed(false)
    const initial = await h.state()
    const post = (name?: string) =>
      h.handle(path, {
        method: 'POST',
        headers: {
          Origin: 'https://example.com',
          Cookie: initial.cookie,
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          email: ' ASTER@example.org ',
          intent: 'subscribe',
          _csrf: initial.csrfToken!,
          ...(name ? { name } : {}),
        }),
      })
    const direct = await post()
    assert.equal(direct.status, 200)
    assert.equal(((await direct.json()) as { nameRequired?: boolean }).nameRequired, undefined)
    assert.equal(h.calls.filter((call) => call.url.endsWith('/emails')).length, 1)
    h.advance(120_000)
    assert.equal((await post('Changed name')).status, 200)
    await h.handle(h.confirmation())
    assert.ok(h.calls.every((call) => !call.body?.first_name))
  })
  test(`${path} does not send or request a name when the profile lookup fails`, async () => {
    const h = harness()
    h.setFailContact(true)
    const initial = await h.state()
    const response = await h.handle(path, {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
        Cookie: initial.cookie,
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        email: 'aster@example.org',
        intent: 'subscribe',
        _csrf: initial.csrfToken!,
      }),
    })
    assert.equal(response.status, 503)
    assert.equal(((await response.json()) as { nameRequired?: boolean }).nameRequired, undefined)
    assert.ok(h.calls.every((call) => call.method === 'GET'))
  })
}

test('general native login preserves the email and missing name across validation and delivery failures', async () => {
  const h = harness()
  h.setName('')
  const initial = await h.state()
  const post = (name?: string) =>
    h.handle('/login', {
      method: 'POST',
      headers: { Origin: 'https://example.com', Cookie: initial.cookie },
      body: new URLSearchParams({
        email: 'aster@example.org',
        _csrf: initial.csrfToken!,
        ...(name !== undefined ? { name } : {}),
      }),
    })
  const next = await post()
  assert.equal(next.status, 200)
  assert.match(await next.text(), /name="name"[^>]*required/)
  const invalid = await post(' ')
  assert.equal(invalid.status, 400)
  assert.match(await invalid.text(), /value="aster@example.org"/)
  h.setFailDelivery(true)
  const failed = await post('Aster')
  assert.equal(failed.status, 503)
  assert.match(await failed.text(), /name="name"/)
})

for (const path of ['/login', templeNewsletterPath]) {
  test(`${path} keeps existing names out of anonymous HTML and accepts long saved names`, async () => {
    const h = harness()
    const privateName = 'Synthetic private name '.repeat(8)
    h.setName(privateName)
    const initial = await h.state()
    const response = await h.handle(path, {
      method: 'POST',
      headers: { Origin: 'https://example.com', Cookie: initial.cookie },
      body: new URLSearchParams({
        email: 'aster@example.org',
        intent: 'subscribe',
        _csrf: initial.csrfToken!,
      }),
    })
    assert.equal(response.status, path === '/login' ? 303 : 200)
    assert.ok(!(await response.text()).includes('Synthetic private name'))
    assert.equal(h.calls.filter((call) => call.url.endsWith('/emails')).length, 1)
  })
}
