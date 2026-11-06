/** Fixed categories only: never include form values, cookies, URLs or raw errors. */
export function reportNewsletterFailure(
  request: Request,
  stage: 'csrf' | 'origin' | 'confirmation_delivery' | 'verification' | 'request' | 'configuration',
  reason?:
    | 'invalid-origin'
    | 'missing-token'
    | 'invalid-token'
    | 'cross-origin-request'
    | 'cross-origin-request-from-old-browser',
) {
  console.error(
    JSON.stringify({
      event: 'newsletter_failure',
      path: new URL(request.url).pathname,
      method: request.method,
      stage,
      ...(reason ? { reason } : {}),
    }),
  )
}
