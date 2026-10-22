import { createApp } from './router.tsx'
import { PublicationRequestError } from './document-host/index.ts'
import { createDocumentHost, type DocumentHostOptions } from './document-host/cloudflare.ts'
import { handleNewsletter } from './newsletter/index.ts'

export { ContentState } from './document-host/cloudflare.ts'

export { NewsletterState } from './newsletter/cloudflare.ts'

export function createWorker(options: DocumentHostOptions = {}): ExportedHandler<Env> {
  return {
    async fetch(request, env, ctx) {
      try {
        const documentHost = createDocumentHost(env, ctx, options)
        return (
          (await documentHost.handle(request)) ??
          (await handleNewsletter(request, env)) ??
          (await createApp(documentHost.load).fetch(request))
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
