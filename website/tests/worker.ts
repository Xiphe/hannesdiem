import { createContentSource } from '../app/document-host/index.ts'
import { createWorker } from '../app/worker.ts'
import { documents, image, imageSvg } from './browser-fixture.ts'

export { ContentState, NewsletterState } from '../app/worker.ts'
const worker = createWorker({ source: createContentSource(documents, 'fixture') })
export default {
  ...worker,
  fetch(request, env, ctx) {
    if (new URL(request.url).pathname === image.src)
      return new Response(imageSvg, { headers: { 'Content-Type': 'image/svg+xml' } })
    return worker.fetch!(request, env, ctx)
  },
} satisfies ExportedHandler<Env>
