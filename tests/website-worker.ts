import { createContentSource } from '../app/publication/index.ts'
import { createWorker } from '../app/worker.ts'
import { documents } from './host-fixture.ts'

export { ContentState, NewsletterState } from '../app/worker.ts'
export default createWorker({ source: createContentSource(documents, 'fixture') })
