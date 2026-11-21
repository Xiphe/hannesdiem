import { reduceCmxDocumentNodes } from '@cmx-tools/reduce'
import type { CmxDocument } from '@cmx-tools/contracts'
import type { ElectroCuteSession } from '@hannesdiem/content-components'
import { validateSessions } from './model.ts'

/** Resolve a session within its project's coherent CMX Publication snapshot. */
export async function sessionDocument(source: CmxDocument, id: string) {
  let selected: ElectroCuteSession | undefined
  let inFeed = false
  const result = await reduceCmxDocumentNodes({
    document: source,
    context: undefined,
    reduceNode(node) {
      if (
        !node ||
        typeof node !== 'object' ||
        node.type !== 'component' ||
        node.from !== '@hannesdiem/content-components' ||
        node.import !== 'ElectroCuteArchive'
      )
        return node
      const sessions = node.props?.sessions as readonly ElectroCuteSession[] | undefined
      if (!sessions) return node
      validateSessions(sessions)
      const session = sessions.find((session) => session.id === id)
      if (!session) return node
      selected = session
      inFeed = node.props?.feed === true
      return { ...node, props: { ...node.props, selectedId: id } }
    },
  })
  return selected ? { session: selected, document: result.document, inFeed } : undefined
}
