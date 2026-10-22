import documents from '../.generated/publication.json' with { type: 'json' }
import { createContentSource } from '../website/app/document-host/index.ts'
import type { PublishedDocuments } from '../contracts/content.ts'
import { createWorker } from '../website/app/worker.ts'

export { ContentState, NewsletterState } from '../website/app/worker.ts'
export default createWorker({ source: createContentSource(documents as PublishedDocuments) })
