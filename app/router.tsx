import { createRouter } from 'remix/router'
import { render } from 'remix/middleware/render'
import { loadContent, type ContentLoader } from './content.ts'
import { Page } from './page.tsx'

export function createApp(content: ContentLoader = loadContent) {
  const router = createRouter({
    middleware: [render()],
    defaultHandler: () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } }),
  })

  router.get('/', async ({ request, render }) => render(<Page {...await content(request)} />, {
    headers: {
      'Cache-Control': 'no-cache',
      'Cloudflare-CDN-Cache-Control': 'public, max-age=60, stale-if-error=0',
      'Cache-Tag': 'page:home',
    },
  }))
  router.get('/health', () => Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } }))
  return router
}
