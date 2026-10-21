import { contentCacheTag } from './publication.ts'

export async function publishContent(
  request: Request,
  content: DurableObjectStub<import('./content-state.ts').ContentState>,
  purge: () => Promise<{ success: boolean }>,
): Promise<Response> {
  const response = await content.fetch(request)
  if (response.ok || response.status === 304) {
    const pending = await content.pendingPurge()
    if (pending) {
      // A retry (including CMX's unchanged-content GET) completes a pending purge.
      const result = await purge()
      if (!result.success)
        return Response.json(
          { message: 'Content saved; cache refresh failed. Retry publication.' },
          { status: 503, headers: { 'Cache-Control': 'no-store' } },
        )
      await content.acknowledgePurge(pending)
    }
  }
  return response
}

export { contentCacheTag }
