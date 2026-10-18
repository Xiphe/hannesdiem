import { createRouter } from 'remix/router'
import { render } from 'remix/middleware/render'
import { loadContent, renderContent, type ContentLoader } from './content.ts'
import { Page } from './page.tsx'

export function createApp(content: ContentLoader = loadContent) {
  const router = createRouter({
    middleware: [render()],
    defaultHandler: () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } }),
  })

  router.get('/health', () => Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } }))
  router.get('/*path', async ({ request, render }) => {
    const page = await content(request)
    return render(<Page {...renderContent(page.document)} />, {
      status: page.status,
      headers: page.status === 404 ? { 'Cache-Control': 'no-store' } : {
        'Cache-Control': 'no-cache',
        'Cloudflare-CDN-Cache-Control': 'public, max-age=60, stale-if-error=0',
        'Cache-Tag': `page:${page.key}`,
      },
    })
  })
  return router
}
