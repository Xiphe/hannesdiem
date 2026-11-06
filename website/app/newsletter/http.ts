import { createNewsletterSessionRouter } from './session-router.ts'
import { completeAuth } from 'remix/auth'
import * as s from 'remix/data-schema'
import * as checks from 'remix/data-schema/checks'
import * as f from 'remix/data-schema/form-data'
import {
  FormDataParseError,
  MaxFilesExceededError,
  MaxFileSizeExceededError,
  MaxHeaderSizeExceededError,
  MaxPartsExceededError,
  MaxTotalSizeExceededError,
} from 'remix/form-data-parser'
import { getCsrfToken } from 'remix/middleware/csrf'
import { redirect } from 'remix/response/redirect'
import { renderToString } from 'remix/component/server'
import { registerCircleRoutes } from '../circle/http.tsx'
import { circlePath } from '../circle/contract.ts'
import { NewsletterPage, TempleNewsletterPage } from './view.tsx'
import type { NewsletterResult, NewsletterState } from './contract.ts'
import {
  templeMessages,
  templeNewsletterPath,
  type TempleNewsletterState,
  type TempleNewsletterResult,
} from './contract.ts'

import type { NewsletterEnvironment, NewsletterServices } from './config.ts'
import { storageClient, digest, tokenPattern, type NewsletterIdentity } from './storage.ts'
import {
  sendConfirmation,
  readNewsletterContact,
  signupName,
  isTempleMember,
  ensureTempleProfile,
  ensureNewsletterContact,
  readTempleContact,
  setTempleTopic,
  subscribeTemple,
} from './resend.ts'

const loginForm = f.object({
  email: f.field(
    s
      .string()
      .transform((value) => value.trim().toLowerCase())
      .pipe(checks.email(), checks.maxLength(254)),
  ),
})

function configured(env: NewsletterEnvironment): boolean {
  return Boolean(
    env.NEWSLETTER_STATE &&
    env.NEWSLETTER_SESSION_SECRET &&
    env.RESEND_HANNESDIEM_DE_API_KEY &&
    env.RESEND_HANNESDIEM_DE_SEGMENT_ID,
  )
}

function privateResponse(response: Response): Response {
  const result = new Response(response.body, response)
  result.headers.set('Cache-Control', 'no-store')
  result.headers.set('Referrer-Policy', 'no-referrer')
  return result
}

function wantsJson(request: Request): boolean {
  return (
    request.headers
      .get('Accept')
      ?.split(',')
      .some((type) => /^application\/json(?:\s*;|\s*$)/i.test(type.trim())) ?? false
  )
}

function createNewsletterRouter(env: NewsletterEnvironment, services: NewsletterServices) {
  const call = storageClient(env)
  const router = createNewsletterSessionRouter(env)
  router.get('/login', (context) => {
    const email = context.session.get('email')
    const state: NewsletterState = {
      ready: true,
      email: typeof email === 'string' ? email : undefined,
      csrfToken: getCsrfToken(context),
    }
    if (wantsJson(context.request)) return Response.json(state)
    if (context.session.get('email')) return redirect('/', 303)
    const error = context.url.searchParams.get('error')
    const message =
      error === 'invalid_token' || error === 'missing_token'
        ? 'The login link has expired or is invalid. Please try again.'
        : error
          ? 'Verification failed. Please try again.'
          : context.session.get('newsletterMessage')
    return context.render(
      NewsletterPage({
        state,
        message: typeof message === 'string' ? message : undefined,
        result:
          typeof message === 'string' ? { type: error ? 'error' : 'success', message } : undefined,
      }),
    )
  })
  router.get(templeNewsletterPath, async (context) => {
    const email = context.session.get('email')
    const contact =
      typeof email === 'string' ? await readTempleContact(email, env, services) : undefined
    const state: TempleNewsletterState = {
      ready: true,
      csrfToken: getCsrfToken(context),
      ...(typeof email === 'string'
        ? {
            email,
            name: contact!.name,
            subscribed: contact!.subscribed,
            unsubscribed: contact!.unsubscribed,
          }
        : {}),
    }
    return wantsJson(context.request)
      ? Response.json(state)
      : context.render(TempleNewsletterPage({ state }))
  })
  router.post(templeNewsletterPath, async (context) => {
    const json = wantsJson(context.request)
    const state: TempleNewsletterState = { ready: true, csrfToken: getCsrfToken(context) }
    const values = new FormData()
    const authenticatedEmail = context.session.get('email')
    const signedIn = typeof authenticatedEmail === 'string'
    const email = signedIn ? authenticatedEmail : context.formData.get('email')
    let contact = signedIn ? await readTempleContact(authenticatedEmail, env, services) : undefined
    if (signedIn)
      Object.assign(state, {
        email,
        name: contact!.name,
        subscribed: contact!.subscribed,
        unsubscribed: contact!.unsubscribed,
      })
    const intent = context.formData.get('intent')
    const rawName = context.formData.get('name')
    let name = signupName(contact ?? { name: '' }, rawName)
    const reply = (result: TempleNewsletterResult, status = 200, headers?: HeadersInit) =>
      json
        ? Response.json({ ...result, csrfToken: state.csrfToken }, { status, headers })
        : context.render(
            TempleNewsletterPage({
              state: result.state ?? state,
              result: {
                ...(rawName !== null && result.type !== 'success' ? { nameRequired: true } : {}),
                ...result,
              },
              nameValue: typeof rawName === 'string' ? rawName.trim() : '',
              emailValue: typeof email === 'string' ? email : '',
            }),
            { status, headers },
          )
    if (intent !== 'subscribe' && intent !== 'unsubscribe')
      return reply({ type: 'error', message: templeMessages.failure }, 400)
    if (intent === 'unsubscribe') {
      if (!signedIn) return reply({ type: 'error', message: templeMessages.failure }, 401)
      await setTempleTopic(authenticatedEmail, false, env, services)
      return reply({
        type: 'success',
        message: templeMessages.unsubscribed,
        state: { ...state, subscribed: false },
      })
    }
    values.set('email', typeof email === 'string' ? email : '')
    const parsed = s.parseSafe(loginForm, values)
    if (!parsed.success)
      return reply({ type: 'error', message: 'Please enter your email address.' }, 400)
    contact ??= await readTempleContact(parsed.value.email, env, services)
    name = signupName(contact, rawName)
    if ((!signedIn && !name) || (!contact.name && name.length > 120))
      return reply(
        {
          type: rawName === null ? 'success' : 'error',
          message: 'Please enter your name.',
          nameRequired: true,
        },
        rawName === null ? 200 : 400,
      )
    if (signedIn && !contact!.unsubscribed) {
      await subscribeTemple(authenticatedEmail, name, env, services)
      return reply({
        type: 'success',
        message: templeMessages.subscribed,
        state: { ...state, name, subscribed: true, unsubscribed: false },
      })
    }
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    const tokenHash = await digest(token)
    const issued = await call('/tokens/issue', {
      email: parsed.value.email,
      name: contact.name ? '' : name,
      scope: 'temple',
      tokenHash,
    })
    if (issued.status === 429) {
      const { remainingSeconds } = (await issued.json()) as { remainingSeconds: number }
      return reply(
        {
          type: 'spam_protection',
          remainingSeconds,
          message: `Please wait ${remainingSeconds}s before requesting another confirmation email.`,
        },
        429,
        { 'Retry-After': String(remainingSeconds) },
      )
    }
    if (!issued.ok) throw new Error('Newsletter token issue failed')
    try {
      const link = new URL('/login/api', context.url)
      link.searchParams.set('token', token)
      link.searchParams.set('scope', 'temple')
      const recipient = contact
      await sendConfirmation(parsed.value.email, link.href, tokenHash, env, services, {
        name: recipient.name,
        returning: recipient.exists && (await isTempleMember(parsed.value.email, env, services)),
        reactivate: recipient.unsubscribed,
      })
    } catch {
      await call('/tokens/revoke', { tokenHash })
      return reply({ type: 'error', message: templeMessages.failure }, 503)
    }
    return reply({ type: 'success', message: templeMessages.pending, confirmationPending: true })
  })
  router.post('/login', async (context) => {
    const parsed = s.parseSafe(loginForm, context.formData)
    const state = { ready: true, csrfToken: getCsrfToken(context) }
    const json = wantsJson(context.request)
    const emailValue =
      typeof context.formData.get('email') === 'string'
        ? String(context.formData.get('email'))
        : undefined
    const rawName = context.formData.get('name')
    const nameValue = typeof rawName === 'string' ? rawName.trim() : ''
    const resultResponse = (result: NewsletterResult, status: number, headers?: HeadersInit) =>
      json
        ? Response.json({ ...result, csrfToken: state.csrfToken }, { status, headers })
        : context.render(
            NewsletterPage({
              state,
              result: {
                ...(rawName !== null && result.type !== 'success' ? { nameRequired: true } : {}),
                ...result,
              },
              emailValue,
              nameValue,
            }),
            { status, headers },
          )
    if (!parsed.success)
      return resultResponse(
        {
          type: 'error',
          message: 'Please enter your email address.',
        },
        400,
      )

    const email = parsed.value.email
    const contact = await readNewsletterContact(email, env, services)
    const name = signupName(contact, rawName)
    if (!name || (!contact.name && name.length > 120))
      return resultResponse(
        {
          type: rawName === null ? 'success' : 'error',
          message: 'Please enter your name.',
          nameRequired: true,
        },
        rawName === null ? 200 : 400,
      )
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    const tokenHash = await digest(token)
    const issued = await call('/tokens/issue', { email, name: contact.name ? '' : name, tokenHash })
    if (issued.status === 429) {
      const { remainingSeconds } = (await issued.json()) as { remainingSeconds: number }
      return resultResponse(
        {
          type: 'spam_protection',
          remainingSeconds,
          message: `Please wait ${remainingSeconds}s before requesting another login token`,
        },
        429,
        { 'Retry-After': String(remainingSeconds) },
      )
    }
    if (!issued.ok) throw new Error('Newsletter token issue failed')
    try {
      const link = new URL('/login/api', context.url)
      link.searchParams.set('token', token)
      await sendConfirmation(email, link.href, tokenHash, env, services)
    } catch {
      await call('/tokens/revoke', { tokenHash })
      return resultResponse(
        { type: 'error', message: 'Something went wrong. Please try again.' },
        503,
      )
    }
    if (json)
      return resultResponse(
        { type: 'success', message: 'Link sent! Please check your email.' },
        200,
      )
    context.session.flash('newsletterMessage', 'Link sent! Please check your email.')
    return redirect('/login', 303)
  })
  router.get('/login/api', async (context) => {
    if (context.url.searchParams.get('action') === 'session') {
      const email = context.session.get('email')
      return Response.json(typeof email === 'string' ? { email } : null)
    }
    const token = context.url.searchParams.get('token')
    const failure = (error: string) =>
      redirect(
        context.url.searchParams.get('scope') === 'circle'
          ? `/temple-of-sound?circle=${error}#share`
          : context.url.searchParams.get('scope') === 'temple'
            ? `/temple-of-sound?newsletter=${error}#watch`
            : `/login?error=${error}`,
        303,
      )
    if (!token || !tokenPattern.test(token)) return failure('invalid_token')
    const response = await call('/tokens/consume', { tokenHash: await digest(token) })
    if (response.status === 404) return failure('invalid_token')
    if (!response.ok) throw new Error('Newsletter token verification failed')
    const identity = (await response.json()) as NewsletterIdentity
    const { email, name, scope } = identity
    try {
      if (scope === 'circle') {
        // Verification stores the private profile; only claiming subscribes the topic.
        await ensureTempleProfile(email, name ?? '', env, services)
      } else if (scope === 'temple') await subscribeTemple(email, name ?? '', env, services, true)
      else await ensureNewsletterContact(email, env, services, name)
    } catch {
      return failure('verification_failed')
    }
    completeAuth(context).set('email', email)
    if (scope === 'circle') {
      context.session.set('circleConfirmedUntil', Date.now() + 60 * 60_000)
      context.session.set('circleSpot', identity.spot!)
      return redirect(`/temple-of-sound?circle=confirmed&spot=${identity.spot}#share`, 303)
    }
    if (scope === 'temple') {
      context.session.set('name', name!)
      return redirect('/temple-of-sound?newsletter=confirmed#watch', 303)
    }
    return redirect('/?login_success=true', 303)
  })
  router.post('/logout', (context) => {
    context.session.destroy()
    if (wantsJson(context.request))
      return Response.json({
        type: 'success',
        message: 'Logged out successfully',
      } satisfies NewsletterResult)
    return redirect('/', 303)
  })
  router.delete('/login/api', (context) => {
    context.session.destroy()
    return Response.json({ success: true, message: 'Logged out successfully' })
  })
  registerCircleRoutes(router, env, services)
  return router
}

export async function handleNewsletter(
  request: Request,
  env: NewsletterEnvironment,
  services: NewsletterServices = {},
): Promise<Response | null> {
  if (
    !['/login', '/login/api', '/logout', templeNewsletterPath, circlePath].includes(
      new URL(request.url).pathname,
    )
  )
    return null
  if (!configured(env)) {
    if (wantsJson(request))
      return privateResponse(
        Response.json(
          {
            type: 'error',
            message: 'Newsletter signup is temporarily unavailable. Please try again later.',
          } satisfies NewsletterResult,
          { status: 503 },
        ),
      )
    return privateResponse(
      new Response(
        await renderToString(
          new URL(request.url).pathname === templeNewsletterPath
            ? TempleNewsletterPage({
                expanded: true,
                state: { ready: false },
                result: { type: 'error', message: templeMessages.failure },
              })
            : NewsletterPage({
                state: { ready: false },
                message: 'Newsletter signup is temporarily unavailable. Please try again later.',
              }),
        ),
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      ),
    )
  }
  try {
    return privateResponse(await createNewsletterRouter(env, services).fetch(request))
  } catch (error) {
    const failure = (message: string, status: number) =>
      privateResponse(
        wantsJson(request)
          ? Response.json({ type: 'error', message } satisfies NewsletterResult, { status })
          : new Response(message, { status }),
      )
    if (
      error instanceof MaxFilesExceededError ||
      error instanceof MaxFileSizeExceededError ||
      error instanceof MaxHeaderSizeExceededError ||
      error instanceof MaxPartsExceededError ||
      error instanceof MaxTotalSizeExceededError
    ) {
      return failure('Form submission is too large.', 413)
    }
    if (error instanceof FormDataParseError) {
      return failure('Invalid form submission.', 400)
    }
    return failure('Something went wrong. Please try again.', 503)
  }
}
