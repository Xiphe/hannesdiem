import { ContentState } from './ContentState.ts'
import { contentCacheTag } from './index.ts'
import { publicationPath } from '../../../contracts/publication.ts'
import type { ContentLoader } from './source.ts'
import { PublicationRequestError } from './PublicationRequestError.ts'

export { ContentState }

export interface DocumentHostOptions {
  source?: ContentLoader
  purge?: () => Promise<{ success: boolean }>
}

export function createDocumentHost(
  env: Pick<Env, 'CONTENT_STATE'>,
  ctx: ExecutionContext,
  options: DocumentHostOptions = {},
) {
  const storage = env.CONTENT_STATE.getByName('published')
  const load: ContentLoader =
    options.source ??
    (async (request) => {
      const page = await storage.readPage(new URL(request.url).pathname)
      if (!page) throw new PublicationRequestError('Content has not been published yet.', 503)
      return page
    })
  const purge =
    options.purge ??
    (() =>
      ctx.cache
        ? ctx.cache.purge({ tags: [contentCacheTag] })
        : Promise.resolve({ success: false }))
  return {
    load,
    async handle(request: Request): Promise<Response | undefined> {
      const path = new URL(request.url).pathname
      if (path === '/_cmx/status')
        return Response.json(await storage.status(), { headers: { 'Cache-Control': 'no-store' } })
      if (path !== publicationPath) return undefined
      const response = await storage.fetch(request)
      if (response.ok || response.status === 304) {
        const revision = await storage.pendingPurge()
        if (revision) {
          const result = await purge()
          if (!result.success)
            return Response.json(
              { message: 'Content saved; cache refresh failed. Retry publication.' },
              { status: 503, headers: { 'Cache-Control': 'no-store' } },
            )
          await storage.acknowledgePurge(revision)
        }
      }
      return response
    },
  }
}
