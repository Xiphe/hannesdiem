import { createCookie } from 'remix/cookie'
import { createRouter } from 'remix/router'
import { cop, type CopFailureReason } from 'remix/middleware/cop'
import { csrf, type CsrfFailureReason } from 'remix/middleware/csrf'
import { formData } from 'remix/middleware/form-data'
import { render } from 'remix/middleware/render'
import { session } from 'remix/middleware/session'
import type { SessionStorage } from 'remix/session'
import { csrfRejectionHeader } from './contract.ts'

interface IdentityRouterOptions {
  secret: string
  storage: SessionStorage
  failureMessage: string
  reportRejection(
    request: Request,
    stage: 'csrf' | 'origin',
    reason: CsrfFailureReason | CopFailureReason,
  ): void
}

function rejected(request: Request, message: string, failureMessage: string, reason?: string) {
  const headers = reason ? { [csrfRejectionHeader]: reason } : undefined
  return request.headers.get('Accept')?.includes('application/json')
    ? Response.json({ type: 'error', message: failureMessage }, { status: 403, headers })
    : new Response(message, { status: 403, headers })
}

/** Share one cookie, session and CSRF policy across private website features. */
export function createIdentityRouter(options: IdentityRouterOptions) {
  const cookie = createCookie('hdm_user_session', {
    secrets: [options.secret],
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  return createRouter({
    middleware: [
      cop({
        onDeny(reason, context) {
          options.reportRejection(context.request, 'origin', reason)
          return rejected(
            context.request,
            reason === 'cross-origin-request'
              ? 'Forbidden: cross-origin request detected from Sec-Fetch-Site header'
              : 'Forbidden: cross-origin request detected, and/or browser is out of date: Sec-Fetch-Site is missing, and Origin does not match Host',
            options.failureMessage,
          )
        },
      }),
      session(cookie, options.storage),
      formData({ maxFiles: 0, maxParts: 5, maxTotalSize: 4096 }),
      csrf({
        onError(reason, context) {
          options.reportRejection(context.request, 'csrf', reason)
          const messages = {
            'invalid-origin': 'Forbidden: invalid CSRF origin',
            'missing-token': 'Forbidden: missing CSRF token',
            'invalid-token': 'Forbidden: invalid CSRF token',
          }
          return rejected(context.request, messages[reason], options.failureMessage, reason)
        },
      }),
      render(),
    ],
  })
}
export type IdentityRouter = ReturnType<typeof createIdentityRouter>
