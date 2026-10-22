import documents from '../.generated/publication.json' with { type: 'json' }
import { createContentSource } from './document-host/index.ts'
import type { PublishedDocuments } from '../contracts/content.ts'
import { createWorker } from './worker.ts'

export { ContentState, NewsletterState } from './worker.ts'
export default createWorker({ source: createContentSource(documents as PublishedDocuments) })
