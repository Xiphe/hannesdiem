import { createCookie } from 'remix/cookie'
import { createRouter } from 'remix/router'
import { cop } from 'remix/middleware/cop'
import { csrf } from 'remix/middleware/csrf'
import { formData } from 'remix/middleware/form-data'
import { render } from 'remix/middleware/render'
import { session } from 'remix/middleware/session'
import type { NewsletterEnvironment } from './config.ts'
import { sessionStorage } from './storage.ts'
import { csrfRejectionHeader, templeMessages } from './contract.ts'
import { reportNewsletterFailure } from './diagnostics.ts'

function rejected(request: Request, message: string, reason?: string) {
  const headers = reason ? { [csrfRejectionHeader]: reason } : undefined
  return request.headers.get('Accept')?.includes('application/json')
    ? Response.json({ type: 'error', message: templeMessages.failure }, { status: 403, headers })
    : new Response(message, { status: 403, headers })
}

/** Share the same verified identity and CSRF boundary across CTA purposes. */
export function createNewsletterSessionRouter(env: NewsletterEnvironment) {
  const cookie = createCookie('hdm_user_session', {
    secrets: [env.NEWSLETTER_SESSION_SECRET!],
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  return createRouter({
    middleware: [
      cop({
        onDeny(reason, context) {
          reportNewsletterFailure(context.request, 'origin', reason)
          return rejected(
            context.request,
            reason === 'cross-origin-request'
              ? 'Forbidden: cross-origin request detected from Sec-Fetch-Site header'
              : 'Forbidden: cross-origin request detected, and/or browser is out of date: Sec-Fetch-Site is missing, and Origin does not match Host',
          )
        },
      }),
      session(cookie, sessionStorage(env)),
      formData({ maxFiles: 0, maxParts: 5, maxTotalSize: 4096 }),
      csrf({
        onError(reason, context) {
          reportNewsletterFailure(context.request, 'csrf', reason)
          const messages = {
            'invalid-origin': 'Forbidden: invalid CSRF origin',
            'missing-token': 'Forbidden: missing CSRF token',
            'invalid-token': 'Forbidden: invalid CSRF token',
          }
          return rejected(context.request, messages[reason], reason)
        },
      }),
      render(),
    ],
  })
}
export type NewsletterRouter = ReturnType<typeof createNewsletterSessionRouter>
