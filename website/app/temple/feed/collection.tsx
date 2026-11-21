import type { Handle, RemixNode } from 'remix/component'

export function FeedCollection(handle: Handle<{ children: RemixNode }>) {
  return () => handle.props.children
}
