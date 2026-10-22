import documents from '../.generated/publication.json' with { type: 'json' }
import { createContentSource, type PublishedDocuments } from './publication/index.ts'
import { createWorker } from './worker.ts'

export { ContentState, NewsletterState } from './worker.ts'
export default createWorker({ source: createContentSource(documents as PublishedDocuments) })
