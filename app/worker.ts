import { DurableObject } from 'cloudflare:workers'
import { createApp } from './router.tsx'
import { ContentState } from './content-state.ts'
import { contentPage, type ContentLoader } from './content.ts'
import { localPublication } from '../.generated/local-content.ts'
import { publicationPath, validatePublication, type PublishedDocuments } from './publication.ts'
import { publishContent, contentCacheTag } from './publish-content.ts'
import { PublicationRequestError } from './publication-signatures.ts'
import {
  handleNewsletter,
  handleNewsletterStorage,
  cleanupNewsletterStorage,
} from './newsletter.ts'

export { ContentState }

export class NewsletterState extends DurableObject<Env> {
  fetch(request: Request) {
    return handleNewsletterStorage(request, this.ctx.storage)
  }
  alarm() {
    return cleanupNewsletterStorage(this.ctx.storage)
  }
}
export default {
  async fetch(request, env, ctx) {
    try {
      const content = env.CONTENT_STATE.getByName('published')
      if (new URL(request.url).pathname === '/_cmx/status') {
        return Response.json(await content.status(), { headers: { 'Cache-Control': 'no-store' } })
      }
      if (new URL(request.url).pathname === publicationPath) {
        return await publishContent(request, content, async () =>
          ctx.cache ? ctx.cache.purge({ tags: [contentCacheTag] }) : { success: false },
        )
      }
      const loadContent: ContentLoader = async (request) => {
        if (localPublication) {
          const documents = localPublication as PublishedDocuments
          return contentPage(
            new URL(request.url).pathname,
            validatePublication(documents),
            (key) => documents[key],
            'local',
          )
        }
        const page = await content.readPage(new URL(request.url).pathname)
        if (!page) throw new PublicationRequestError('Content has not been published yet.', 503)
        return page
      }
      return (
        (await handleNewsletter(request, env)) ?? (await createApp(loadContent, env).fetch(request))
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
} satisfies ExportedHandler<Env>
