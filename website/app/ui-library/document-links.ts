import type { CmxDocument } from '@cmx-tools/contracts'
import { reduceCmxDocumentNodes } from '@cmx-tools/reduce'
import { externalLinkProps } from '../external-links.ts'

export async function externalLinksDocument(document: CmxDocument) {
  const result = await reduceCmxDocumentNodes({
    document,
    context: undefined,
    reduceNode(node) {
      if (node && typeof node === 'object' && node.type === 'element' && node.tag === 'a')
        return {
          ...node,
          props: { ...node.props, ...externalLinkProps(node.props?.href, node.props?.rel) },
        }
      return node
    },
  })
  return result.document
}
