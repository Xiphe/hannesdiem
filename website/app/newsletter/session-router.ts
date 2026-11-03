import { createCookie } from 'remix/cookie'
import { createRouter } from 'remix/router'
import { cop } from 'remix/middleware/cop'
import { csrf } from 'remix/middleware/csrf'
import { formData } from 'remix/middleware/form-data'
import { render } from 'remix/middleware/render'
import { session } from 'remix/middleware/session'
import type { NewsletterEnvironment } from './config.ts'
import { sessionStorage } from './storage.ts'

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
      cop(),
      session(cookie, sessionStorage(env)),
      formData({ maxFiles: 0, maxParts: 5, maxTotalSize: 4096 }),
      csrf(),
      render(),
    ],
  })
}
export type NewsletterRouter = ReturnType<typeof createNewsletterSessionRouter>
