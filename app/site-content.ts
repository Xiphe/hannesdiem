import type { Handle, RemixNode } from 'remix/component'
import type { SiteMetadata } from '../contracts/content.ts'

// Component context keeps each streamed response on its own publication snapshot.
export function SiteContent(
  handle: Handle<{ site: SiteMetadata; children?: RemixNode }, SiteMetadata>,
) {
  handle.context.set(handle.props.site)
  return () => handle.props.children
}
