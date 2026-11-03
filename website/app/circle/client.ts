import type { NewsletterEnvironment } from '../newsletter/config.ts'
export function circleClient(env: NewsletterEnvironment) {
  return (path: string, data: unknown = {}) =>
    env.CIRCLE_STATE!.getByName('temple-circle').fetch(
      new Request(`https://circle.internal${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    )
}
