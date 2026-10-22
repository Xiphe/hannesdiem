import * as s from 'remix/data-schema'
import * as checks from 'remix/data-schema/checks'
import { createSession, type Session, type SessionStorage } from 'remix/session'
import type { NewsletterEnvironment } from './config.ts'

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
export const tokenPattern = /^[a-f0-9]{64}$/
const sessionPattern = /^[a-f0-9-]{36}$/

export async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function storageClient(env: NewsletterEnvironment) {
  const stub = env.NEWSLETTER_STATE!.getByName('newsletter')
  return async (path: string, data?: unknown, method = 'POST') => {
    const response = await stub.fetch(
      new Request(`https://newsletter.internal${path}`, {
        method,
        headers: data === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: data === undefined ? undefined : JSON.stringify(data),
      }),
    )
    return response
  }
}

export function sessionStorage(env: NewsletterEnvironment): SessionStorage {
  const call = storageClient(env)
  return {
    async read(id) {
      if (!id || !sessionPattern.test(id)) return createSession()
      const response = await call(`/sessions/${id}`, undefined, 'GET')
      if (response.status === 404) return createSession()
      if (!response.ok) throw new Error('Newsletter session read failed')
      return createSession(id, (await response.json()) as SessionData)
    },
    async save(value) {
      if (!value.dirty && !value.destroyed) return null
      const response = await call(
        `/sessions/${value.id}`,
        {
          data: value.data,
          deleteId: value.deleteId,
        },
        value.destroyed ? 'DELETE' : 'PUT',
      )
      if (!response.ok) throw new Error('Newsletter session save failed')
      return value.destroyed ? '' : value.id
    },
  }
}

/** Called only through the Worker binding, never routed from public requests. */
export async function handleNewsletterStorage(
  request: Request,
  storage: NewsletterStorage,
  now = Date.now(),
): Promise<Response> {
  const url = new URL(request.url)
  const sessionId = url.pathname.match(/^\/sessions\/([a-f0-9-]{36})$/)?.[1]
  if (sessionId) {
    const key = `session:${sessionId}`
    if (request.method === 'GET') {
      const data = await storage.transaction(async (tx) => {
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
    const body = (await request.json()) as { data: SessionData; deleteId?: string }
    if (request.method !== 'PUT' && request.method !== 'DELETE')
      return new Response(null, { status: 405 })
    await storage.transaction(async (tx) => {
      if (body.deleteId && sessionPattern.test(body.deleteId))
        await tx.delete(`session:${body.deleteId}`)
      if (request.method === 'DELETE') await tx.delete(key)
      else await tx.put(key, { value: body.data, expires: now + SESSION_IDLE })
    })
    await scheduleCleanup(storage, now)
    return new Response(null, { status: 204 })
  }
  if (request.method !== 'POST') return new Response(null, { status: 405 })
  const body = (await request.json()) as { email?: string; tokenHash: string }
  if (!tokenPattern.test(body.tokenHash)) return new Response(null, { status: 400 })
  const tokenKey = `token:${body.tokenHash}`
  if (url.pathname === '/tokens/issue') {
    const parsed = s.parseSafe(s.string().pipe(checks.email(), checks.maxLength(254)), body.email)
    if (!parsed.success) return new Response(null, { status: 400 })
    const email = parsed.value
    const cooldownKey = `cooldown:${await digest(email.toLowerCase())}`
    const remaining = await storage.transaction(async (tx) => {
      const existing = await tx.get<Expiring<true>>(cooldownKey)
      if (existing && existing.expires > now) return Math.ceil((existing.expires - now) / 1000)
      await tx.put(tokenKey, { value: email, expires: now + HOUR })
      await tx.put(cooldownKey, { value: true, expires: now + 2 * 60 * 1000 })
      return 0
    })
    await scheduleCleanup(storage, now)
    return remaining
      ? Response.json({ remainingSeconds: remaining }, { status: 429 })
      : new Response(null, { status: 204 })
  }
  if (url.pathname === '/tokens/consume' || url.pathname === '/tokens/revoke') {
    const email = await storage.transaction(async (tx) => {
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

export async function cleanupNewsletterStorage(
  storage: NewsletterStorage,
  now = Date.now(),
): Promise<void> {
  const next = await storage.transaction(async (tx) => {
    let nextExpiry = Infinity
    for (const [key, record] of await tx.list<Expiring<unknown>>()) {
      if (record.expires <= now) await tx.delete(key)
      else nextExpiry = Math.min(nextExpiry, record.expires)
    }
    return nextExpiry
  })
  if (Number.isFinite(next)) await storage.setAlarm(next)
}
