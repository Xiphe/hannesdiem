import { Webhook } from 'standardwebhooks'
import type { NewsletterEnvironment } from '../newsletter/config.ts'
import { circleTopic } from './contract.ts'
import { circleClient } from './client.ts'

export const circleWebhookPath = '/circle/webhook'
/** Signed events are hints; reconciliation reads current subscription state. */
export async function handleCircleWebhook(
  request: Request,
  env: NewsletterEnvironment,
): Promise<Response | null> {
  if (new URL(request.url).pathname !== circleWebhookPath) return null
  const reply = (status: number) =>
    new Response(null, { status, headers: { 'Cache-Control': 'no-store' } })
  if (request.method !== 'POST') return reply(405)
  if (!env.RESEND_CIRCLE_WEBHOOK_SECRET || !env.CIRCLE_STATE) return reply(503)
  if (Number(request.headers.get('Content-Length') ?? 0) > 32768) return reply(413)
  let raw = ''
  const reader = request.body?.getReader()
  if (!reader) return reply(400)
  let bytes = 0
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > 32768) {
        await reader.cancel()
        return reply(413)
      }
      raw += decoder.decode(value, { stream: true })
    }
    raw += decoder.decode()
  } finally {
    reader.releaseLock()
  }
  let event: {
    type?: string
    data?: {
      email?: string
      unsubscribed?: boolean
      topics?: { id: string; subscription: string }[]
    }
  }
  try {
    event = new Webhook(env.RESEND_CIRCLE_WEBHOOK_SECRET).verify(raw, {
      'webhook-id': request.headers.get('svix-id') ?? '',
      'webhook-timestamp': request.headers.get('svix-timestamp') ?? '',
      'webhook-signature': request.headers.get('svix-signature') ?? '',
    }) as typeof event
    if (!event || typeof event !== 'object') return reply(400)
  } catch {
    return reply(400)
  }
  const relevant =
    event.type === 'contact.deleted' ||
    (event.type === 'contact.updated' && event.data?.unsubscribed === true) ||
    (event.type === 'contact.topics.updated' &&
      Array.isArray(event.data?.topics) &&
      event.data.topics.some((t) => t.id === circleTopic && t.subscription === 'opt_out'))
  if (!relevant) return reply(204)
  if (typeof event.data?.email !== 'string' || event.data.email.length > 254) return reply(400)
  const response = await circleClient(env)('/reconcile', { email: event.data.email })
  return reply(response.ok ? 204 : 503)
}
