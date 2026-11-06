import { createContentSource } from '../app/document-host/index.ts'
import { createWorker } from '../app/worker.ts'
import { documents, image, imageSvg } from './browser-fixture.ts'
import { renderToString } from 'remix/component/server'
import { NewsletterPage } from '../app/newsletter/view.tsx'

export { ContentState, NewsletterState, CircleState } from '../app/worker.ts'
const worker = createWorker({ source: createContentSource(documents, 'fixture') })
export default {
  ...worker,
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/fixture-login')
      return new Response(
        await renderToString(NewsletterPage({ state: { ready: true, csrfToken: 'test-csrf' } })),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    if (new URL(request.url).pathname === image.src)
      return new Response(imageSvg, { headers: { 'Content-Type': 'image/svg+xml' } })
    return worker.fetch!(request, env, ctx)
  },
} satisfies ExportedHandler<Env>
