import { completeAuth } from 'remix/auth'
import { createCookie } from 'remix/cookie'
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
import { cop } from 'remix/middleware/cop'
import { csrf, getCsrfToken } from 'remix/middleware/csrf'
import { formData } from 'remix/middleware/form-data'
import { render } from 'remix/middleware/render'
import { session } from 'remix/middleware/session'
import { redirect } from 'remix/response/redirect'
import { createRouter } from 'remix/router'
import { renderToString } from 'remix/component/server'
import { NewsletterPage } from './view.tsx'
import type { NewsletterResult, NewsletterState } from './contract.ts'

import type { NewsletterEnvironment, NewsletterServices } from './config.ts'
import { storageClient, sessionStorage, digest, tokenPattern } from './storage.ts'
import { sendConfirmation, ensureNewsletterContact } from './resend.ts'

const loginForm = f.object({
  email: f.field(
    s
      .string()
      .transform((value) => value.trim())
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
  const cookie = createCookie('hdm_user_session', {
    secrets: [env.NEWSLETTER_SESSION_SECRET!],
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  const router = createRouter({
    middleware: [
      cop(),
      session(cookie, sessionStorage(env)),
      formData({ maxFiles: 0, maxParts: 4, maxTotalSize: 4096 }),
      csrf(),
      render(),
    ],
  })
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
  router.post('/login', async (context) => {
    const parsed = s.parseSafe(loginForm, context.formData)
    const state = { ready: true, csrfToken: getCsrfToken(context) }
    const json = wantsJson(context.request)
    const emailValue =
      typeof context.formData.get('email') === 'string'
        ? String(context.formData.get('email'))
        : undefined
    const resultResponse = (result: NewsletterResult, status: number, headers?: HeadersInit) =>
      json
        ? Response.json({ ...result, csrfToken: state.csrfToken }, { status, headers })
        : context.render(NewsletterPage({ state, result, emailValue }), { status, headers })
    if (!parsed.success)
      return resultResponse(
        {
          type: 'error',
          message: 'Please enter your email address.',
        },
        400,
      )

    const email = parsed.value.email
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    const tokenHash = await digest(token)
    const issued = await call('/tokens/issue', { email, tokenHash })
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
    if (!token || !tokenPattern.test(token)) return redirect('/login?error=invalid_token', 303)
    const response = await call('/tokens/consume', { tokenHash: await digest(token) })
    if (response.status === 404) return redirect('/login?error=invalid_token', 303)
    if (!response.ok) throw new Error('Newsletter token verification failed')
    const { email } = (await response.json()) as { email: string }
    try {
      await ensureNewsletterContact(email, env, services)
    } catch {
      return redirect('/login?error=verification_failed', 303)
    }
    completeAuth(context).set('email', email)
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
  return router
}

export async function handleNewsletter(
  request: Request,
  env: NewsletterEnvironment,
  services: NewsletterServices = {},
): Promise<Response | null> {
  if (!['/login', '/login/api', '/logout'].includes(new URL(request.url).pathname)) return null
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
          NewsletterPage({
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
