import { getCsrfToken } from 'remix/middleware/csrf'
import {
  FormDataParseError,
  MaxPartsExceededError,
  MaxTotalSizeExceededError,
} from 'remix/form-data-parser'
import { createIdentityRouter } from '../identity/router.ts'
import { sessionStorage } from '../newsletter/storage.ts'
import type { NewsletterEnvironment } from '../newsletter/config.ts'
import type { ContentLoader } from '../document-host/index.ts'
import { circleClient } from '../circle/client.ts'
import type { CircleView } from '../circle/contract.ts'
import { archivePath } from './model.ts'
import { sessionDocument } from './document.ts'
import { highlightMessages, type HighlightInput, type HighlightIntent } from './contract.ts'

type Environment = NewsletterEnvironment & Pick<Env, 'ELECTROCUTE_STATE'>
const privateResponse = (response: Response) => {
  const result = new Response(response.body, response)
  result.headers.set('Cache-Control', 'no-store')
  result.headers.set('Referrer-Policy', 'no-referrer')
  return result
}

export async function handleHighlights(request: Request, env: Environment, load: ContentLoader) {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/electrocute-api/')) return null
  const failure = (status: number, message = highlightMessages.failure) =>
    privateResponse(Response.json({ message }, { status }))
  const id = url.pathname.slice('/electrocute-api/'.length)
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) return failure(404)
  const page = await load(new Request(new URL(archivePath, url)))
  const selected = page.status === 200 ? await sessionDocument(page.document, id) : undefined
  if (!selected) return failure(404)
  if (!env.ELECTROCUTE_STATE || !env.NEWSLETTER_STATE || !env.NEWSLETTER_SESSION_SECRET)
    return failure(503)
  const session = { id, duration: selected.session.duration }
  const call = (path: string, email?: string, intent?: HighlightIntent, input?: HighlightInput) =>
    env.ELECTROCUTE_STATE.getByName('highlights').fetch(
      new Request(`https://electrocute.internal${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, email, intent, input }),
      }),
    )
  const router = createIdentityRouter({
    secret: env.NEWSLETTER_SESSION_SECRET,
    storage: sessionStorage(env),
    failureMessage: highlightMessages.failure,
    reportRejection(_request, stage, reason) {
      console.error(JSON.stringify({ event: 'highlight_rejection', stage, reason }))
    },
  })
  router.get('/electrocute-api/:id', async (context) => {
    const identity = context.session.get('email')
    const email = typeof identity === 'string' ? identity : undefined
    const response = await call('/view', email)
    if (!response.ok) return failure(503)
    const state = (await response.json()) as Record<string, unknown>
    let suggestedAlias: string | undefined
    if (email && !state.alias && env.CIRCLE_STATE) {
      // Read only. No subscription, reconciliation, claim or implicit migration.
      try {
        const circle = await circleClient(env)('/view', { email })
        if (circle.ok) suggestedAlias = ((await circle.json()) as CircleView).own?.alias
      } catch {
        /* Circle availability must not prevent highlighting. */
      }
    }
    return Response.json({
      ...state,
      ready: true,
      email,
      csrfToken: getCsrfToken(context),
      suggestedAlias,
    })
  })
  router.post('/electrocute-api/:id', async (context) => {
    const email = context.session.get('email')
    if (typeof email !== 'string') return failure(401)
    const intent = context.formData.get('intent')
    if (!['save', 'withdraw', 'hide', 'restore', 'retry', 'profile'].includes(String(intent)))
      return failure(400)
    let input: HighlightInput
    try {
      const raw = context.formData.get('payload')
      const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : undefined
      if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string')
        return failure(400)
      // Only highlight data crosses the boundary. Role, owner and duration come from the server.
      input = value as HighlightInput
    } catch {
      return failure(400)
    }
    const response = await call('/mutate', email, intent as HighlightIntent, input)
    if (!response.ok)
      return failure(
        response.status,
        response.status === 409
          ? highlightMessages.conflict
          : response.status === 422
            ? highlightMessages.rejected
            : highlightMessages.failure,
      )
    return Response.json({
      ...((await response.json()) as object),
      ready: true,
      email,
      csrfToken: getCsrfToken(context),
    })
  })
  try {
    return privateResponse(await router.fetch(request))
  } catch (error) {
    if (error instanceof MaxPartsExceededError || error instanceof MaxTotalSizeExceededError)
      return failure(413)
    if (error instanceof FormDataParseError) return failure(400)
    console.error(JSON.stringify({ event: 'highlight_request_failed', method: request.method }))
    return failure(503)
  }
}
