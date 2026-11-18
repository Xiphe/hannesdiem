import documents from '../../.generated/publication.json' with { type: 'json' }
import { reduceCmxDocumentNodes } from '@cmx-tools/reduce'
import { createContentSource } from '../../website/app/document-host/index.ts'
import { createWorker } from '../../website/app/worker.ts'
import { validatePublication, type PublishedDocuments } from '../../contracts/content.ts'
import { archivePath } from '../../website/app/electrocute/model.ts'

export { ContentState, NewsletterState, CircleState } from '../../website/app/worker.ts'

// Local draft tools are injected into the development snapshot, never published
// in the authored document. Website test fixtures remain entirely synthetic.
const previewDocuments = { ...documents } as PublishedDocuments
const archiveRoute = validatePublication(previewDocuments).routes.find(
  (route) => route.path === archivePath,
)
const archive = archiveRoute && previewDocuments[archiveRoute.document]
if (archive && archiveRoute) {
  const { document } = await reduceCmxDocumentNodes({
    document: archive,
    context: undefined,
    reduceNode(node) {
      if (
        node &&
        typeof node === 'object' &&
        node.type === 'component' &&
        node.from === '@hannesdiem/content-components' &&
        node.import === 'ElectroCuteArchive'
      )
        return { ...node, props: { ...node.props, preview: true } }
      return node
    },
  })
  previewDocuments[archiveRoute.document] = document
}

export default createWorker({ source: createContentSource(previewDocuments) })
