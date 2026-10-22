import { DurableObject } from 'cloudflare:workers'
import { createApp } from './router.tsx'
import { PublicationRequestError } from './publication/index.ts'
import { createPublication, type PublicationOptions } from './publication/cloudflare.ts'
import {
  handleNewsletter,
  handleNewsletterStorage,
  cleanupNewsletterStorage,
} from './newsletter.ts'

export { ContentState } from './publication/cloudflare.ts'

export class NewsletterState extends DurableObject<Env> {
  fetch(request: Request) {
    return handleNewsletterStorage(request, this.ctx.storage)
  }
  alarm() {
    return cleanupNewsletterStorage(this.ctx.storage)
  }
}

export function createWorker(options: PublicationOptions = {}): ExportedHandler<Env> {
  return {
    async fetch(request, env, ctx) {
      try {
        const publication = createPublication(env, ctx, options)
        return (
          (await publication.handle(request)) ??
          (await handleNewsletter(request, env)) ??
          (await createApp(publication.load, env).fetch(request))
        )
      } catch (error) {
        if (error instanceof PublicationRequestError)
          return new Response(error.message, {
            status: error.status,
            headers: { 'Cache-Control': 'no-store' },
          })
        console.error(
          JSON.stringify({ message: 'Request failed', path: new URL(request.url).pathname }),
        )
        return new Response('Internal server error', {
          status: 500,
          headers: { 'Cache-Control': 'no-store' },
        })
      }
    },
  }
}

export default createWorker()
