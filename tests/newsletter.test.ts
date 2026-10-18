import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCookie } from 'remix/cookie'
import {
  cleanupNewsletterStorage, handleNewsletter, handleNewsletterStorage,
  type NewsletterEnvironment, type NewsletterState, type NewsletterStorage, type NewsletterTransaction,
} from '../app/newsletter.ts'

class MemoryStorage implements NewsletterStorage {
  entries = new Map<string, unknown>()
  alarm: number | null = null
  pending = Promise.resolve()
  async get<T>(key: string) { return structuredClone(this.entries.get(key)) as T | undefined }
  async put<T>(key: string, value: T) { this.entries.set(key, structuredClone(value)) }
  async delete(key: string) { return this.entries.delete(key) }
  async list<T>() { return structuredClone(this.entries) as Map<string, T> }
  async getAlarm() { return this.alarm }
  async setAlarm(time: number | Date) { this.alarm = Number(time) }
  async transaction<T>(callback: (transaction: NewsletterTransaction) => Promise<T>): Promise<T> {
    const previous = this.pending
    let finish!: () => void
    this.pending = new Promise(resolve => { finish = resolve })
    await previous
    const before = structuredClone(this.entries)
    try { return await callback(this) }
    catch (error) { this.entries = before; throw error }
    finally { finish() }
  }
}

function harness() {
  const storage = new MemoryStorage()
  let now = Date.now()
  let existingContact = true
  let failDelivery = false
  let failContact = false
  const calls: { url: string; method: string; body: Record<string, unknown> | null }[] = []
  const env: NewsletterEnvironment = {
    NEWSLETTER_SESSION_SECRET: 'test-only-secret-with-at-least-thirty-two-bytes',
    RESEND_HANNESDIEM_DE_API_KEY: 'test-only-resend-key',
    RESEND_HANNESDIEM_DE_SEGMENT_ID: 'test-newsletter-segment',
    NEWSLETTER_STATE: { getByName: () => ({ fetch: request => handleNewsletterStorage(request, storage, now) }) },
  }
  const delivery: typeof fetch = async (input, init) => {
    const url = String(input)
    assert.equal(new URL(url).origin, 'https://api.resend.com')
    assert.equal(init?.redirect, 'error')
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-only-resend-key')
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null
    calls.push({ url, method, body })
    if (url.endsWith('/emails')) return Response.json({ id: 'mock-email' }, { status: failDelivery ? 500 : 200 })
    if (failContact) return Response.json({ error: 'mock failure' }, { status: 500 })
    if (method === 'GET') return Response.json({ email: 'test@example.org', unsubscribed: true }, { status: existingContact ? 200 : 404 })
    return Response.json({ id: 'mock-contact' })
  }
  const request = (path: string, init?: RequestInit) => new Request(`https://example.com${path}`, init)
  const handle = async (path: string, init?: RequestInit) => {
    const result = await handleNewsletter(request(path, init), env, { fetch: delivery })
    assert.ok(result)
    assert.equal(result.headers.get('Cache-Control'), 'no-store')
    assert.equal(result.headers.get('Referrer-Policy'), 'no-referrer')
    return result
  }
  const state = async (cookie?: string) => {
    const response = await handle('/login', { headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) } })
    const value = await response.json() as NewsletterState
    return { ...value, headers: response.headers, cookie: cookieFrom(response.headers) ?? cookie! }
  }
  const submit = (email: string, csrfToken: string, cookie: string, extra?: Record<string, string>) => handle('/login', {
    method: 'POST', headers: { Origin: 'https://example.com', Cookie: cookie, ...extra },
    body: new URLSearchParams({ email, _csrf: csrfToken }),
  })
  const confirmation = () => {
    const email = calls.findLast(call => call.url.endsWith('/emails'))
    assert.ok(email)
    const link = String(email.body?.text).match(/Confirm Email: (https:\/\/\S+)/)?.[1]
    assert.ok(link)
    return new URL(link).pathname + new URL(link).search
  }
  return {
    env, storage, calls, handle, state, submit, confirmation,
    advance(ms: number) { now += ms },
    setExisting(value: boolean) { existingContact = value },
    setFailDelivery(value: boolean) { failDelivery = value },
    setFailContact(value: boolean) { failContact = value },
    cleanup: () => cleanupNewsletterStorage(storage, now),
  }
}

function cookieFrom(headers: Headers): string | undefined {
  return headers.getSetCookie()[0]?.split(';')[0]
}

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
  assert.equal(h.calls.length, 1)
  assert.deepEqual(h.calls[0].body?.to, ['test@example.org'])
  assert.match(String(h.calls[0].body?.html), /Confirm Email/)
  assert.match(String(h.calls[0].body?.html), /https:\/\/example\.com\/login\/api\?token=/)

  const confirmations = await Promise.all([
    h.handle(h.confirmation(), { headers: { Cookie: initial.cookie } }),
    h.handle(h.confirmation(), { headers: { Cookie: initial.cookie } }),
  ])
  const accepted = confirmations.filter(response => response.headers.get('Location') === '/?login_success=true')
  assert.equal(accepted.length, 1)
  assert.equal(confirmations.filter(response => response.headers.get('Location') === '/login?error=invalid_token').length, 1)
  const loggedInCookie = cookieFrom(accepted[0].headers)!
  assert.notEqual(loggedInCookie, initial.cookie)
  const cookie = createCookie('hdm_user_session', { secrets: [h.env.NEWSLETTER_SESSION_SECRET!] })
  assert.match((await cookie.parse(loggedInCookie))!, /^[a-f0-9-]{36}$/)
  assert.ok(h.calls.some(call => call.url.endsWith('/segments/ebed0ce7-7220-4955-a176-6e2f31acb5bd')))
  assert.ok(h.calls.some(call => call.url.endsWith('/segments/test-newsletter-segment')))
  assert.ok(h.calls.every(call => call.method !== 'PATCH'))
  assert.ok(!h.calls.some(call => call.url.endsWith('/contacts') && call.method === 'POST'))

  const loggedIn = await h.state(loggedInCookie)
  assert.equal(loggedIn.email, 'test@example.org')
  const api = await h.handle('/login/api?action=session', { headers: { Cookie: loggedInCookie } })
  assert.deepEqual(await api.json(), { email: 'test@example.org' })
  const logout = await h.handle('/logout', {
    method: 'POST', headers: { Cookie: loggedInCookie, Origin: 'https://example.com' },
    body: new URLSearchParams({ _csrf: loggedIn.csrfToken! }),
  })
  assert.equal(logout.status, 303)
  assert.equal(logout.headers.get('Location'), '/')
  const replay = await h.handle('/login/api?action=session', { headers: { Cookie: loggedInCookie } })
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
  assert.equal(h.calls.length, 1)
  h.advance(2 * 60 * 1000)
  assert.equal((await h.submit('test@example.org', state.csrfToken!, state.cookie)).status, 303)
  h.advance(60 * 60 * 1000)
  const expired = await h.handle(originalLink)
  assert.equal(expired.headers.get('Location'), '/login?error=invalid_token')
  assert.equal(h.calls.filter(call => !call.url.endsWith('/emails')).length, 0)
  await h.cleanup()
  assert.ok([...h.storage.entries.keys()].every(key => key.startsWith('session:')))
})

test('new contacts enter both existing segments only after email confirmation', async () => {
  const h = harness()
  h.setExisting(false)
  const state = await h.state()
  await h.submit('new@example.org', state.csrfToken!, state.cookie)
  assert.ok(h.calls.every(call => call.url.endsWith('/emails')))
  const confirmed = await h.handle(h.confirmation())
  assert.equal(confirmed.headers.get('Location'), '/?login_success=true')
  const created = h.calls.find(call => call.url.endsWith('/contacts') && call.method === 'POST')
  assert.deepEqual(created?.body, {
    email: 'new@example.org', unsubscribed: false,
    segments: [{ id: 'ebed0ce7-7220-4955-a176-6e2f31acb5bd' }, { id: 'test-newsletter-segment' }],
  })
})

test('form validation and native CSRF protection reject invalid or cross-origin submissions before sending', async () => {
  const h = harness()
  const state = await h.state()
  assert.equal((await h.submit('invalid', state.csrfToken!, state.cookie)).status, 400)
  assert.equal((await h.submit('test@example.org', 'wrong-token', state.cookie)).status, 403)
  assert.equal((await h.submit('test@example.org', state.csrfToken!, state.cookie, { Origin: 'https://elsewhere.example' })).status, 403)
  assert.equal((await h.submit('test@example.org', state.csrfToken!, state.cookie, { 'Sec-Fetch-Site': 'cross-site' })).status, 403)
  const oversized = await h.handle('/login', {
    method: 'POST', headers: { Origin: 'https://example.com', Cookie: state.cookie },
    body: new URLSearchParams({ email: 'test@example.org', _csrf: state.csrfToken!, unexpected: 'x'.repeat(5000) }),
  })
  assert.equal(oversized.status, 413)
  assert.equal(h.calls.length, 0)
})

test('delivery failure releases cooldown; contact failure never creates an authenticated session', async () => {
  const h = harness()
  const state = await h.state()
  h.setFailDelivery(true)
  assert.equal((await h.submit('test@example.org', state.csrfToken!, state.cookie)).status, 503)
  assert.equal([...h.storage.entries.keys()].filter(key => !key.startsWith('session:')).length, 0)
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
  const state = await stateResponse.json() as { ready: boolean; csrfToken: string }
  const cookie = cookieFrom(stateResponse.headers)!
  assert.equal(state.ready, true)
  assert.ok(state.csrfToken)
  const sent = await h.submit('test@example.org', state.csrfToken, cookie, { Accept: 'application/json' })
  assert.equal(sent.status, 200)
  assert.equal(sent.headers.get('Location'), null)
  assert.deepEqual(await sent.json(), {
    type: 'success', message: 'Link sent! Please check your email.', csrfToken: state.csrfToken,
  })
  assert.equal(h.calls.length, 1)
  const page = await h.handle('/login', { headers: { Cookie: cookie } })
  assert.doesNotMatch(await page.text(), /Link sent! Please check your email\./)

  const cooldown = await h.submit('TEST@example.org', state.csrfToken, cookie, { Accept: 'application/json' })
  assert.equal(cooldown.status, 429)
  assert.equal(cooldown.headers.get('Retry-After'), '120')
  assert.deepEqual(await cooldown.json(), {
    type: 'spam_protection', message: 'Please wait 120s before requesting another login token',
    remainingSeconds: 120, csrfToken: state.csrfToken,
  })
  assert.equal(h.calls.length, 1)
})

test('inline validation, CSRF, and delivery failures preserve a retryable form without sending twice', async () => {
  const h = harness()
  const state = await h.state()
  const json = { Accept: 'application/json' }
  const invalid = await h.submit('invalid', state.csrfToken!, state.cookie, json)
  assert.equal(invalid.status, 400)
  assert.deepEqual(await invalid.json(), {
    type: 'error', message: 'Please enter your email address.', csrfToken: state.csrfToken,
  })
  assert.equal((await h.submit('test@example.org', 'wrong', state.cookie, json)).status, 403)
  assert.equal((await h.submit('test@example.org', state.csrfToken!, state.cookie, {
    ...json, Origin: 'https://elsewhere.example',
  })).status, 403)
  assert.equal(h.calls.length, 0)

  h.setFailDelivery(true)
  const failed = await h.submit('test@example.org', state.csrfToken!, state.cookie, json)
  assert.equal(failed.status, 503)
  assert.deepEqual(await failed.json(), {
    type: 'error', message: 'Something went wrong. Please try again.', csrfToken: state.csrfToken,
  })
  assert.equal([...h.storage.entries.keys()].filter(key => !key.startsWith('session:')).length, 0)
  h.setFailDelivery(false)
  const retry = await h.submit('test@example.org', state.csrfToken!, state.cookie, json)
  assert.equal(retry.status, 200)
  assert.equal((await retry.json() as { type: string }).type, 'success')
})

test('inline logout revokes authentication and bootstrap creates a fresh anonymous CSRF session', async () => {
  const h = harness()
  const initial = await h.state()
  await h.submit('test@example.org', initial.csrfToken!, initial.cookie, { Accept: 'application/json' })
  const accepted = await h.handle(h.confirmation(), { headers: { Cookie: initial.cookie } })
  const cookie = cookieFrom(accepted.headers)!
  const authenticatedResponse = await h.handle('/login', {
    headers: { Cookie: cookie, Accept: 'application/json' },
  })
  assert.equal(authenticatedResponse.status, 200)
  assert.equal(authenticatedResponse.headers.get('Location'), null)
  const authenticated = await authenticatedResponse.json() as { email: string; csrfToken: string }
  assert.equal(authenticated.email, 'test@example.org')

  const logout = await h.handle('/logout', {
    method: 'POST', headers: { Cookie: cookie, Origin: 'https://example.com', Accept: 'application/json' },
    body: new URLSearchParams({ _csrf: authenticated.csrfToken }),
  })
  assert.equal(logout.status, 200)
  assert.equal(logout.headers.get('Location'), null)
  assert.deepEqual(await logout.json(), { type: 'success', message: 'Logged out successfully' })
  assert.equal(cookieFrom(logout.headers), 'hdm_user_session=')
  const bootstrap = await h.handle('/login', { headers: { Accept: 'application/json' } })
  const anonymous = await bootstrap.json() as { ready: boolean; email?: string; csrfToken: string }
  const anonymousCookie = cookieFrom(bootstrap.headers)!
  assert.equal(anonymous.ready, true)
  assert.equal(anonymous.email, undefined)
  assert.ok(anonymous.csrfToken)
  assert.notEqual(anonymous.csrfToken, authenticated.csrfToken)
  assert.notEqual(anonymousCookie, cookie)
  const rejectedReplay = await h.submit('new@example.org', authenticated.csrfToken, anonymousCookie, { Accept: 'application/json' })
  assert.equal(rejectedReplay.status, 403)
  assert.equal((await h.state(cookie)).email, undefined)
})

test('inline signup is unavailable as JSON when configuration is missing', async () => {
  const response = await handleNewsletter(new Request('https://example.com/login', {
    headers: { Accept: 'application/json' },
  }), {})
  assert.equal(response?.status, 503)
  assert.equal(response?.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual(await response!.json(), {
    type: 'error', message: 'Newsletter signup is temporarily unavailable. Please try again later.',
  })
})
