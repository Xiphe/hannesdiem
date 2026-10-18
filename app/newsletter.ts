import { completeAuth } from 'remix/auth'
import { createCookie } from 'remix/cookie'
import * as s from 'remix/data-schema'
import * as checks from 'remix/data-schema/checks'
import * as f from 'remix/data-schema/form-data'
import {
  FormDataParseError, MaxFilesExceededError, MaxFileSizeExceededError,
  MaxHeaderSizeExceededError, MaxPartsExceededError, MaxTotalSizeExceededError,
} from 'remix/form-data-parser'
import { html } from 'remix/html-template'
import { cop } from 'remix/middleware/cop'
import { csrf, getCsrfToken } from 'remix/middleware/csrf'
import { formData } from 'remix/middleware/form-data'
import { render } from 'remix/middleware/render'
import { session } from 'remix/middleware/session'
import { redirect } from 'remix/response/redirect'
import { createRouter } from 'remix/router'
import { createSession, type Session, type SessionStorage } from 'remix/session'
import { renderToString } from 'remix/component/server'
import { NewsletterPage } from './newsletter-view.tsx'
import type { NewsletterResult } from './newsletter-contract.ts'

export interface NewsletterEnvironment {
  NEWSLETTER_STATE?: { getByName(name: string): { fetch(request: Request): Promise<Response> } }
  NEWSLETTER_SESSION_SECRET?: string
  RESEND_HANNESDIEM_DE_API_KEY?: string
  RESEND_HANNESDIEM_DE_SEGMENT_ID?: string
}

export interface NewsletterState {
  ready: boolean
  email?: string
  csrfToken?: string
}

interface NewsletterServices {
  fetch?: typeof globalThis.fetch
}

export interface NewsletterTransaction {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<boolean>
  list<T>(): Promise<Map<string, T>>
}

export interface NewsletterStorage extends NewsletterTransaction {
  transaction<T>(callback: (transaction: NewsletterTransaction) => Promise<T>): Promise<T>
  getAlarm(): Promise<number | null>
  setAlarm(time: number | Date): Promise<void>
}

type Expiring<T> = { expires: number; value: T }
type SessionData = Session['data']
const HOUR = 60 * 60 * 1000
const SESSION_IDLE = 30 * 24 * HOUR
import { audienceSegment as AUDIENCE_SEGMENT } from './newsletter-config.ts'
const tokenPattern = /^[a-f0-9]{64}$/
const sessionPattern = /^[a-f0-9-]{36}$/
const loginForm = f.object({
  email: f.field(s.string().transform(value => value.trim()).pipe(checks.email(), checks.maxLength(254))),
})

function configured(env: NewsletterEnvironment): boolean {
  return Boolean(env.NEWSLETTER_STATE && env.NEWSLETTER_SESSION_SECRET &&
    env.RESEND_HANNESDIEM_DE_API_KEY && env.RESEND_HANNESDIEM_DE_SEGMENT_ID)
}

function privateResponse(response: Response): Response {
  const result = new Response(response.body, response)
  result.headers.set('Cache-Control', 'no-store')
  result.headers.set('Referrer-Policy', 'no-referrer')
  return result
}

function wantsJson(request: Request): boolean {
  return request.headers.get('Accept')?.split(',').some(type =>
    /^application\/json(?:\s*;|\s*$)/i.test(type.trim())) ?? false
}

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}

function storageClient(env: NewsletterEnvironment) {
  const stub = env.NEWSLETTER_STATE!.getByName('newsletter')
  return async (path: string, data?: unknown, method = 'POST') => {
    const response = await stub.fetch(new Request(`https://newsletter.internal${path}`, {
      method,
      headers: data === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    }))
    return response
  }
}

function sessionStorage(env: NewsletterEnvironment): SessionStorage {
  const call = storageClient(env)
  return {
    async read(id) {
      if (!id || !sessionPattern.test(id)) return createSession()
      const response = await call(`/sessions/${id}`, undefined, 'GET')
      if (response.status === 404) return createSession()
      if (!response.ok) throw new Error('Newsletter session read failed')
      return createSession(id, await response.json() as SessionData)
    },
    async save(value) {
      if (!value.dirty && !value.destroyed) return null
      const response = await call(`/sessions/${value.id}`, {
        data: value.data, deleteId: value.deleteId,
      }, value.destroyed ? 'DELETE' : 'PUT')
      if (!response.ok) throw new Error('Newsletter session save failed')
      return value.destroyed ? '' : value.id
    },
  }
}

function createNewsletterRouter(env: NewsletterEnvironment, services: NewsletterServices) {
  const call = storageClient(env)
  const cookie = createCookie('hdm_user_session', {
    secrets: [env.NEWSLETTER_SESSION_SECRET!], httpOnly: true, sameSite: 'lax', path: '/',
  })
  const router = createRouter({
    middleware: [
      cop(), session(cookie, sessionStorage(env)),
      formData({ maxFiles: 0, maxParts: 4, maxTotalSize: 4096 }),
      csrf(), render(),
    ],
  })
  router.get('/__newsletter/state', context => Response.json({
    ready: true, email: context.session.get('email'), csrfToken: getCsrfToken(context),
  }))
  router.get('/login', context => {
    const email = context.session.get('email')
    const state: NewsletterState = {
      ready: true, email: typeof email === 'string' ? email : undefined, csrfToken: getCsrfToken(context),
    }
    if (wantsJson(context.request)) return Response.json(state)
    if (context.session.get('email')) return redirect('/', 303)
    const error = context.url.searchParams.get('error')
    const message = error === 'invalid_token' || error === 'missing_token'
      ? 'The login link has expired or is invalid. Please try again.'
      : error ? 'Verification failed. Please try again.'
      : context.session.get('newsletterMessage')
    return context.render(NewsletterPage({
      state,
      message: typeof message === 'string' ? message : undefined,
      result: typeof message === 'string'
        ? { type: error ? 'error' : 'success', message } : undefined,
    }))
  })
  router.post('/login', async context => {
    const parsed = s.parseSafe(loginForm, context.formData)
    const state = { ready: true, csrfToken: getCsrfToken(context) }
    const json = wantsJson(context.request)
    const emailValue = typeof context.formData.get('email') === 'string'
      ? String(context.formData.get('email')) : undefined
    const resultResponse = (result: NewsletterResult, status: number, headers?: HeadersInit) =>
      json ? Response.json({ ...result, csrfToken: state.csrfToken }, { status, headers })
        : context.render(NewsletterPage({ state, result, emailValue }), { status, headers })
    if (!parsed.success) return resultResponse({
      type: 'error', message: 'Please enter your email address.',
    }, 400)

    const email = parsed.value.email
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)),
      byte => byte.toString(16).padStart(2, '0')).join('')
    const tokenHash = await digest(token)
    const issued = await call('/tokens/issue', { email, tokenHash })
    if (issued.status === 429) {
      const { remainingSeconds } = await issued.json() as { remainingSeconds: number }
      return resultResponse({
        type: 'spam_protection', remainingSeconds,
        message: `Please wait ${remainingSeconds}s before requesting another login token`,
      }, 429, { 'Retry-After': String(remainingSeconds) })
    }
    if (!issued.ok) throw new Error('Newsletter token issue failed')
    try {
      const link = new URL('/login/api', context.url)
      link.searchParams.set('token', token)
      await sendConfirmation(email, link.href, tokenHash, env, services)
    } catch {
      await call('/tokens/revoke', { tokenHash })
      return resultResponse({ type: 'error', message: 'Something went wrong. Please try again.' }, 503)
    }
    if (json) return resultResponse({ type: 'success', message: 'Link sent! Please check your email.' }, 200)
    context.session.flash('newsletterMessage', 'Link sent! Please check your email.')
    return redirect('/login', 303)
  })
  router.get('/login/api', async context => {
    if (context.url.searchParams.get('action') === 'session') {
      const email = context.session.get('email')
      return Response.json(typeof email === 'string' ? { email } : null)
    }
    const token = context.url.searchParams.get('token')
    if (!token || !tokenPattern.test(token)) return redirect('/login?error=invalid_token', 303)
    const response = await call('/tokens/consume', { tokenHash: await digest(token) })
    if (response.status === 404) return redirect('/login?error=invalid_token', 303)
    if (!response.ok) throw new Error('Newsletter token verification failed')
    const { email } = await response.json() as { email: string }
    try {
      await ensureNewsletterContact(email, env, services)
    } catch {
      return redirect('/login?error=verification_failed', 303)
    }
    completeAuth(context).set('email', email)
    return redirect('/?login_success=true', 303)
  })
  router.post('/logout', context => {
    context.session.destroy()
    if (wantsJson(context.request)) return Response.json({
      type: 'success', message: 'Logged out successfully',
    } satisfies NewsletterResult)
    return redirect('/', 303)
  })
  router.delete('/login/api', context => {
    context.session.destroy()
    return Response.json({ success: true, message: 'Logged out successfully' })
  })
  return router
}

export async function handleNewsletter(
  request: Request, env: NewsletterEnvironment, services: NewsletterServices = {},
): Promise<Response | null> {
  if (!['/login', '/login/api', '/logout'].includes(new URL(request.url).pathname)) return null
  if (!configured(env)) {
    if (wantsJson(request)) return privateResponse(Response.json({
      type: 'error', message: 'Newsletter signup is temporarily unavailable. Please try again later.',
    } satisfies NewsletterResult, { status: 503 }))
    return privateResponse(new Response(await renderToString(NewsletterPage({
      state: { ready: false }, message: 'Newsletter signup is temporarily unavailable. Please try again later.',
    })), { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
  }
  try {
    return privateResponse(await createNewsletterRouter(env, services).fetch(request))
  } catch (error) {
    const failure = (message: string, status: number) => privateResponse(wantsJson(request)
      ? Response.json({ type: 'error', message } satisfies NewsletterResult, { status })
      : new Response(message, { status }))
    if (error instanceof MaxFilesExceededError || error instanceof MaxFileSizeExceededError ||
      error instanceof MaxHeaderSizeExceededError || error instanceof MaxPartsExceededError ||
      error instanceof MaxTotalSizeExceededError) {
      return failure('Form submission is too large.', 413)
    }
    if (error instanceof FormDataParseError) {
      return failure('Invalid form submission.', 400)
    }
    return failure('Something went wrong. Please try again.', 503)
  }
}

export async function getNewsletterState(
  request: Request, env: NewsletterEnvironment,
): Promise<NewsletterState & { headers: Headers }> {
  if (!configured(env)) return { ready: false, headers: new Headers() }
  const url = new URL('/__newsletter/state', request.url)
  const response = await createNewsletterRouter(env, {}).fetch(new Request(url, { headers: request.headers }))
  if (!response.ok) throw new Error('Newsletter state unavailable')
  return { ...await response.json() as NewsletterState, headers: response.headers }
}

async function resendRequest(
  path: string, init: RequestInit, env: NewsletterEnvironment, services: NewsletterServices,
): Promise<Response> {
  const send = services.fetch ?? globalThis.fetch
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${env.RESEND_HANNESDIEM_DE_API_KEY}`)
  headers.set('Content-Type', 'application/json')
  for (let attempt = 0; ; attempt++) {
    const response = await send(`https://api.resend.com${path}`, {
      ...init, headers, redirect: 'error', signal: AbortSignal.timeout(10000),
    })
    if (response.status !== 429 || attempt === 2) return response
    const retry = Number(response.headers.get('Retry-After'))
    await response.body?.cancel()
    await new Promise(resolve => setTimeout(resolve, Math.min(2000, Math.max(500, retry * 1000 || 1000))))
  }
}

async function sendConfirmation(
  email: string, link: string, tokenHash: string, env: NewsletterEnvironment, services: NewsletterServices,
) {
  const content = html`<!doctype html><html><body style="margin:0;background:#fff8fb;color:#020024;font-family:system-ui,sans-serif"><main style="max-width:500px;margin:auto;padding:40px 20px"><p>Hi there!</p><p>Happy to see you joining us on hannesdiem.de!</p><p><a style="display:inline-block;background:#fd5ee0;color:#020024;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold" href="${link}">Confirm Email</a></p><p style="font-size:10px;font-style:italic">(This link expires in 1 hour)</p><p>I'll sometimes send you updates about new releases, concerts, events, and things I find interesting.<br>You can unsubscribe anytime.</p><p>Cheers, <strong>Hannes</strong></p><p style="font-size:10px;font-style:italic">If you didn't request this email, please just ignore it.<br>In case you get a lot of these emails, please let me know so I can block the sender.</p><footer><a href="https://hannesdiem.de/imprint">Imprint</a> · <a href="https://hannesdiem.de/privacy">Privacy</a></footer></main></body></html>`
  const response = await resendRequest('/emails', {
    method: 'POST', headers: { 'Idempotency-Key': `newsletter-${tokenHash}` },
    body: JSON.stringify({
      from: 'Hannes Diem <hi@hannesdiem.de>', to: [email],
      subject: 'Please confirm your email address', html: String(content),
      text: `Hi there!\n\nHappy to see you joining us on hannesdiem.de!\n\nConfirm Email: ${link}\n(This link expires in 1 hour)\n\nI'll sometimes send you updates about new releases, concerts, events, and things I find interesting. You can unsubscribe anytime.\n\nCheers, Hannes\n\nIf you didn't request this email, please just ignore it.\n\nImprint: https://hannesdiem.de/imprint\nPrivacy: https://hannesdiem.de/privacy`,
    }),
  }, env, services)
  if (!response.ok) throw new Error('Newsletter email delivery failed')
  await response.body?.cancel()
}

async function ensureNewsletterContact(email: string, env: NewsletterEnvironment, services: NewsletterServices) {
  const contactPath = `/contacts/${encodeURIComponent(email)}`
  const existing = await resendRequest(contactPath, { method: 'GET' }, env, services)
  const segments = [...new Set([AUDIENCE_SEGMENT, env.RESEND_HANNESDIEM_DE_SEGMENT_ID!])]
  if (existing.status === 404) {
    await existing.body?.cancel()
    const created = await resendRequest('/contacts', {
      method: 'POST', body: JSON.stringify({ email, unsubscribed: false, segments: segments.map(id => ({ id })) }),
    }, env, services)
    if (!created.ok) throw new Error('Newsletter contact creation failed')
    await created.body?.cancel()
    return
  }
  if (!existing.ok) throw new Error('Newsletter contact lookup failed')
  await existing.body?.cancel()
  for (const segment of segments) {
    const response = await resendRequest(`${contactPath}/segments/${encodeURIComponent(segment)}`, { method: 'POST' }, env, services)
    if (!response.ok) throw new Error('Newsletter segment update failed')
    await response.body?.cancel()
  }
}

/** Called only through the Worker binding, never routed from public requests. */
export async function handleNewsletterStorage(
  request: Request, storage: NewsletterStorage, now = Date.now(),
): Promise<Response> {
  const url = new URL(request.url)
  const sessionId = url.pathname.match(/^\/sessions\/([a-f0-9-]{36})$/)?.[1]
  if (sessionId) {
    const key = `session:${sessionId}`
    if (request.method === 'GET') {
      const data = await storage.transaction(async tx => {
        const record = await tx.get<Expiring<SessionData>>(key)
        if (!record || record.expires <= now) {
          await tx.delete(key)
          return null
        }
        await tx.put(key, { ...record, expires: now + SESSION_IDLE })
        return record.value
      })
      return Response.json(data, { status: data ? 200 : 404 })
    }
    const body = await request.json() as { data: SessionData; deleteId?: string }
    if (request.method !== 'PUT' && request.method !== 'DELETE') return new Response(null, { status: 405 })
    await storage.transaction(async tx => {
      if (body.deleteId && sessionPattern.test(body.deleteId)) await tx.delete(`session:${body.deleteId}`)
      if (request.method === 'DELETE') await tx.delete(key)
      else await tx.put(key, { value: body.data, expires: now + SESSION_IDLE })
    })
    await scheduleCleanup(storage, now)
    return new Response(null, { status: 204 })
  }
  if (request.method !== 'POST') return new Response(null, { status: 405 })
  const body = await request.json() as { email?: string; tokenHash: string }
  if (!tokenPattern.test(body.tokenHash)) return new Response(null, { status: 400 })
  const tokenKey = `token:${body.tokenHash}`
  if (url.pathname === '/tokens/issue') {
    const parsed = s.parseSafe(s.string().pipe(checks.email(), checks.maxLength(254)), body.email)
    if (!parsed.success) return new Response(null, { status: 400 })
    const email = parsed.value
    const cooldownKey = `cooldown:${await digest(email.toLowerCase())}`
    const remaining = await storage.transaction(async tx => {
      const existing = await tx.get<Expiring<true>>(cooldownKey)
      if (existing && existing.expires > now) return Math.ceil((existing.expires - now) / 1000)
      await tx.put(tokenKey, { value: email, expires: now + HOUR })
      await tx.put(cooldownKey, { value: true, expires: now + 2 * 60 * 1000 })
      return 0
    })
    await scheduleCleanup(storage, now)
    return remaining ? Response.json({ remainingSeconds: remaining }, { status: 429 }) : new Response(null, { status: 204 })
  }
  if (url.pathname === '/tokens/consume' || url.pathname === '/tokens/revoke') {
    const email = await storage.transaction(async tx => {
      const existing = await tx.get<Expiring<string>>(tokenKey)
      await tx.delete(tokenKey)
      if (!existing || existing.expires <= now) return null
      await tx.delete(`cooldown:${await digest(existing.value.toLowerCase())}`)
      return existing.value
    })
    return Response.json(email ? { email } : null, { status: email ? 200 : 404 })
  }
  return new Response(null, { status: 404 })
}

async function scheduleCleanup(storage: NewsletterStorage, now: number) {
  const next = now + HOUR
  const alarm = await storage.getAlarm()
  if (alarm === null || alarm > next) await storage.setAlarm(next)
}

export async function cleanupNewsletterStorage(storage: NewsletterStorage, now = Date.now()): Promise<void> {
  const next = await storage.transaction(async tx => {
    let nextExpiry = Infinity
    for (const [key, record] of await tx.list<Expiring<unknown>>()) {
      if (record.expires <= now) await tx.delete(key)
      else nextExpiry = Math.min(nextExpiry, record.expires)
    }
    return nextExpiry
  })
  if (Number.isFinite(next)) await storage.setAlarm(next)
}
