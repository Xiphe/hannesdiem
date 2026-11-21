import type { CmxDocument, CmxNode } from '@cmx-tools/contracts'
import { reduceCmxDocumentNodes } from '@cmx-tools/reduce'
import type { ElectroCuteSession } from '@hannesdiem/content-components'
import { validateSessions } from '../../electrocute/model.ts'

/** Select the explicit Watch collection using CMX's declared children/prop slots. */
export async function feedDocument(source: CmxDocument) {
  const posts: Record<string, unknown>[] = []
  await reduceCmxDocumentNodes({
    document: source,
    context: posts,
    reduceNode(node, posts) {
      if (
        typeof node !== 'object' ||
        node === null ||
        node.type !== 'component' ||
        node.from !== '@hannesdiem/content-components'
      )
        return node
      if (node.import === 'TempleRecordings' && Array.isArray(node.props?.videos)) {
        for (const video of node.props.videos) posts.push({ ...video, kind: 'video' })
      } else if (node.import === 'TemplePosts' && Array.isArray(node.props?.posts)) {
        posts.push(...node.props.posts)
      } else if (node.import === 'ElectroCuteArchive' && Array.isArray(node.props?.sessions)) {
        const sessions = node.props.sessions as unknown as readonly ElectroCuteSession[]
        validateSessions(sessions)
        for (const session of sessions) {
          posts.push({
            id: session.id,
            kind: 'video',
            title: session.title,
            subheadline: session.subheadline,
            postedAt: `${session.recordedAt}T12:00:00Z`,
            session,
          })
        }
      }
      return node
    },
  })
  const collection: CmxNode = {
    type: 'component',
    from: '@hannesdiem/content-components',
    import: 'TemplePosts',
    props: { posts },
    slots: posts.flatMap((post, index) => [
      ...(post.children != null ? [['posts', index, 'children']] : []),
      ...(post.kind === 'text' && post.body != null ? [['posts', index, 'body']] : []),
    ]),
  }
  return {
    posts,
    document: {
      ...source,
      interface: {
        ...source.interface,
        exports: {
          default: { type: { from: '@cmx-tools/contracts', import: 'CmxNode' }, slots: [[]] },
        },
      },
      content: { default: collection },
    } satisfies CmxDocument,
  }
}
